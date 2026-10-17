using System.Globalization;
using System.Text.RegularExpressions;

namespace VoiceStudio;

public sealed partial class ProjectStore
{
    /// <summary>A read-only view of persisted activity for currently configured
    /// source files. Does not recover transactions, reanchor feedback, refresh
    /// tasks, create metadata directories or contact a runner.</summary>
    public ProjectActivity Activity(string projectId)
    {
        lock (gate)
        {
            var project = Project(projectId);
            var documents = Documents(project);
            var tasks = new List<ProjectActivityTask>();
            var changes = new List<ProjectActivityChange>();
            // Batch the framework-independent TypeScript extractor for a cold
            // history view rather than launching one parser per activity row.
            WarmTypeScript(documents.Where(document =>
                File.Exists(Contained(project.Root, ".voice-lint/reviews/" + document.Id + ".voice-meta.json")) ||
                Directory.Exists(Contained(project.Root, ".voice-lint/tasks/" + document.Id))).ToArray());
            foreach (var document in documents)
            {
                var reviewPath = Contained(project.Root, ".voice-lint/reviews/" + document.Id + ".voice-meta.json");
                var taskDirectory = Contained(project.Root, ".voice-lint/tasks/" + document.Id);
                var taskPaths = Directory.Exists(taskDirectory)
                    ? Directory.EnumerateFiles(taskDirectory, "*.json")
                        .Where(path => Regex.IsMatch(Path.GetFileNameWithoutExtension(path), "^[a-f0-9]{32}$"))
                        .OrderBy(path => path, StringComparer.Ordinal).ToArray()
                    : [];
                if (!File.Exists(reviewPath) && taskPaths.Length == 0) continue;

                var source = ReadSource(document.FullPath).Source;
                var currentVersion = Hash(source);
                var format = Path.GetExtension(document.FullPath).ToLowerInvariant() switch
                {
                    ".json" => "json", ".ts" => "typescript", ".html" or ".htm" => "html", _ => "markdown"
                };
                var title = DocumentParser.Parse(source, format).Units.FirstOrDefault(unit => unit.Kind == "h1")?.Text
                    ?? Path.GetFileName(document.RelativePath);
                // Do not call Review/Detail: those APIs may create directories,
                // recover an interrupted apply, or persist reanchored feedback.
                var review = File.Exists(reviewPath) ? ReadJson<ReviewFile>(reviewPath) : new ReviewFile { DocumentPath = document.RelativePath };
                if (review.DocumentPath != document.RelativePath || review.Proposals is null)
                    throw new ApiError(409, "Review-Metadaten gehören nicht zu dieser Datei.");
                var proposals = new Dictionary<string, Proposal>(StringComparer.Ordinal);
                foreach (var proposal in review.Proposals)
                {
                    if (proposal is null || string.IsNullOrEmpty(proposal.Id) || !Regex.IsMatch(proposal.Id, "^[a-f0-9]{32}$") || proposal.DocumentId != document.Id ||
                        proposal.SourceBefore is null || proposal.SourceAfter is null || !proposals.TryAdd(proposal.Id, proposal))
                        throw new ApiError(409, "Vorschlagsmetadaten gehören nicht eindeutig zu dieser Datei.");
                    var resultVersion = Hash(proposal.SourceAfter);
                    var appliedAt = KnownTimestamp(proposal.AppliedAt);
                    if (proposal.State == "applied" && appliedAt is null)
                    {
                        var journalPath = Contained(project.Root, ".voice-lint/transactions/" + document.Id + "-" + proposal.Id + ".json");
                        if (File.Exists(journalPath))
                        {
                            var journal = ReadJson<ApplyJournal>(journalPath);
                            if (journal.DocumentId == document.Id && journal.ProposalId == proposal.Id && journal.State == "completed" &&
                                journal.BeforeVersion == proposal.ExpectedVersion && journal.AfterVersion == resultVersion)
                                appliedAt = KnownTimestamp(journal.AppliedAt);
                        }
                    }
                    changes.Add(new(proposal.Id, document.Id, document.RelativePath, title, proposal.Before, proposal.After,
                        proposal.Reason, proposal.State, proposal.TaskId, KnownTimestamp(proposal.CreatedAt),
                        proposal.State == "applied" ? appliedAt : null, proposal.ExpectedVersion, resultVersion, currentVersion,
                        currentVersion == (proposal.State == "applied" ? resultVersion : proposal.ExpectedVersion) ? "current" : "changed"));
                }
                foreach (var path in taskPaths)
                {
                    var task = ImprovementTaskService.ReadStoredTask(path, project.Id, document.Id);
                    var comparisonVersion = task.SourceVersion;
                    if (task.Status == "applied" && task.ProposalId is not null && proposals.TryGetValue(task.ProposalId, out var proposal) &&
                        proposal.TaskId == task.Id && proposal.State == "applied")
                        comparisonVersion = Hash(proposal.SourceAfter);
                    tasks.Add(new(task.Id, document.Id, document.RelativePath, title, task.Instruction, task.Status,
                        task.CreatedAt, task.UpdatedAt, task.ProposalId, task.SourceVersion, currentVersion,
                        comparisonVersion == currentVersion ? "current" : "changed", task.Resolution));
                }
            }
            return new(projectId, tasks.OrderByDescending(task => TimestampOrder(task.CreatedAt))
                    .ThenBy(task => task.DocumentPath, StringComparer.Ordinal).ThenBy(task => task.Id, StringComparer.Ordinal).ToArray(),
                changes.OrderByDescending(change => TimestampOrder(change.AppliedAt ?? change.CreatedAt))
                    .ThenBy(change => change.DocumentPath, StringComparer.Ordinal).ThenBy(change => change.Id, StringComparer.Ordinal).ToArray(),
                documents.Length);
        }
    }

    private static string? KnownTimestamp(string? value)
        => DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out _) ? value : null;
    private static DateTimeOffset TimestampOrder(string? value)
        => DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var parsed) ? parsed : DateTimeOffset.MinValue;
}
