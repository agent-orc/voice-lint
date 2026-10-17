using System.Text.Json;
using System.Text.Json.Nodes;
using VoiceStudio;

internal static class ProjectActivityChecks
{
    public static void Run(string testRoot, Action<bool, string> check, Action<int, Action, string> reject)
    {
        var home = Path.Combine(testRoot, "activity-home");
        var root = Path.Combine(home, "project");
        Directory.CreateDirectory(root);
        File.WriteAllText(Path.Combine(root, "voice.config.json"), "{\"version\":1,\"sourceFiles\":[\"en.md\",\"de.md\",\"empty.md\"]}");
        File.WriteAllText(Path.Combine(root, "en.md"), "# English\nA powerful 🚀 tool.\n");
        File.WriteAllText(Path.Combine(root, "de.md"), "# Deutsch\nDie klare Aufgabe bleibt.\n");
        File.WriteAllText(Path.Combine(root, "empty.md"), "# Empty\nUnchanged.\n");
        File.WriteAllText(Path.Combine(root, "excluded.md"), "# Not configured\nDo not inspect its metadata.\n");
        var store = new ProjectStore(home, false);
        var project = store.Register(new(root, "Bilingual activity"));
        var snapshot = Snapshot(root);
        var empty = store.Activity(project.Id);
        check(empty.DocumentCount == 3 && empty.Tasks.Length == 0 && empty.Changes.Length == 0, "activity reports configured document count without inventing work");
        check(snapshot.SequenceEqual(Snapshot(root)) && !Directory.Exists(Path.Combine(root, ".voice-lint")), "empty activity creates no metadata directory and changes no file");
        reject(404, () => store.Activity("../unregistered"), "activity requires an existing registered project");

        var docs = store.ListDocuments(project.Id);
        var en = store.GetDocument(project.Id, docs.Single(doc => doc.Path == "en.md").Id);
        var de = store.GetDocument(project.Id, docs.Single(doc => doc.Path == "de.md").Id);
        var blank = store.GetDocument(project.Id, docs.Single(doc => doc.Path == "empty.md").Id);
        var manual = store.CreateProposal(project.Id, en.Id, new("u-1", 2, 10, "documented", en.Version, null));
        var pending = store.Activity(project.Id).Changes.Single();
        check(pending.TaskId is null && pending.State == "pending" && pending.SourceStatus == "current" && pending.AppliedAt is null && pending.CreatedAt is not null,
            "manual pending proposal is listed without requiring a task, with only its known creation date");
        check(pending.DocumentPath == "en.md" && pending.DocumentTitle == "English" && pending.Before == "powerful" && pending.After == "documented",
            "activity exposes navigable document identity and exact before/after prose");
        var applied = store.ApplyProposal(project.Id, en.Id, manual.Id, new(en.Version));
        var change = store.Activity(project.Id).Changes.Single();
        check(change.State == "applied" && change.SourceStatus == "current" && change.ResultVersion == applied.Version && change.ExpectedVersion == en.Version,
            "applied proposal freshness compares result hash instead of the old input hash");
        check(change.AppliedAt is not null && DateTimeOffset.Parse(change.AppliedAt) >= DateTimeOffset.Parse(change.CreatedAt!),
            "newly applied proposals persist a real application timestamp");
        check(File.ReadAllText(Path.Combine(root, "en.md")).Contains("documented 🚀 tool"), "activity timestamp additions preserve Unicode source edits");

        var taskId = new string('b', 32);
        var runId = new string('c', 32);
        var context = store.GetTaskContext(project.Id, de.Id, de.Version, de.ReviewRevision);
        var fingerprint = ProjectStore.TaskContextFingerprint(context);
        var linked = store.CreateTaskProposal(project.Id, de.Id, taskId, runId, de.Version, de.ReviewRevision, fingerprint,
            [new("u-1", 4, 9, "klare", "konkrete", "Den Auftrag genauer benennen.")]);
        store.ApplyTaskProposal(project.Id, de.Id, taskId, linked.Id, de.Version, de.ReviewRevision, fingerprint);
        WriteTask(root, new(taskId, project.Id, de.Id, "Prüfe den konkreten Auftrag.", [], de.Version, de.ReviewRevision, 2, "applied",
            "2026-09-06T09:00:00Z", "2026-09-06T09:05:00Z", runId, linked.Id, Proposal: linked with { State = "applied" }));
        // More than the per-document UI's 100-row limit; activity must not silently truncate.
        for (var index = 0; index < 105; index++)
            WriteTask(root, new(ProjectStore.Hash("activity-task-" + index)[..32], project.Id, en.Id, "Review task " + index, [], applied.Version, 0, 1,
                index == 0 ? "running" : "queued", "2026-09-06T10:00:00Z", "2026-09-06T10:00:00Z"));
        var excludedId = "doc-" + ProjectStore.Hash("excluded.md")[..16];
        Directory.CreateDirectory(Path.Combine(root, ".voice-lint", "tasks", excludedId));
        File.WriteAllText(Path.Combine(root, ".voice-lint", "tasks", excludedId, new string('d', 32) + ".json"), "invalid excluded task");
        File.WriteAllText(Path.Combine(root, ".voice-lint", "reviews", excludedId + ".voice-meta.json"), "invalid excluded review");
        snapshot = Snapshot(root);
        var all = new ProjectStore(home, false).Activity(project.Id);
        check(all.Tasks.Length == 106 && all.Changes.Length == 2 && all.DocumentCount == 3, "project activity includes all tasks and manual/linked proposals across configured documents after restart");
        check(all.Tasks.Single(task => task.Id == taskId).SourceStatus == "current" && all.Changes.Single(item => item.Id == linked.Id).TaskId == taskId,
            "linked applied task compares its recorded proposal result with current source");
        check(all.Tasks.Any(task => task.Status == "running") && all.Tasks.Count(task => task.Status == "queued") == 104,
            "listing returns persisted task state without runner refresh or reconciliation");
        check(snapshot.SequenceEqual(Snapshot(root)), "activity leaves all source, metadata bytes, timestamps and directories unchanged");

        File.AppendAllText(Path.Combine(root, "en.md"), "\n```text\nOnly excluded code changed.\n```\n");
        snapshot = Snapshot(root);
        all = store.Activity(project.Id);
        check(all.Changes.Single(item => item.Id == manual.Id).SourceStatus == "changed" && all.Tasks.Where(task => task.DocumentId == en.Id).All(task => task.SourceStatus == "changed"),
            "exact source comparison detects edits even outside reviewed prose; it does not infer the change is still current from matching excerpts");
        check(all.Tasks.Where(task => task.DocumentId == en.Id).All(task => task.Status is "queued" or "running") && snapshot.SequenceEqual(Snapshot(root)),
            "changed sources are reported without persisting stale status or reanchoring metadata");

        var reviewPath = Path.Combine(root, ".voice-lint", "reviews", en.Id + ".voice-meta.json");
        var review = JsonSerializer.Deserialize<ReviewFile>(File.ReadAllText(reviewPath), ProjectStore.Json)!;
        var knownAppliedAt = review.Proposals.Single().AppliedAt;
        review.Proposals[0] = review.Proposals[0] with { CreatedAt = null, AppliedAt = null };
        File.WriteAllText(reviewPath, JsonSerializer.Serialize(review, ProjectStore.Json));
        change = store.Activity(project.Id).Changes.Single(item => item.Id == manual.Id);
        check(change.CreatedAt is null && change.AppliedAt == knownAppliedAt, "known matching completed transaction supplies applied time without inventing creation time");
        var journalPath = Path.Combine(root, ".voice-lint", "transactions", en.Id + "-" + manual.Id + ".json");
        var journal = JsonNode.Parse(File.ReadAllText(journalPath))!;
        journal.AsObject().Remove("appliedAt");
        File.WriteAllText(journalPath, journal.ToJsonString());
        snapshot = Snapshot(root);
        change = store.Activity(project.Id).Changes.Single(item => item.Id == manual.Id);
        check(change.State == "applied" && change.AppliedAt is null && change.CreatedAt is null && snapshot.SequenceEqual(Snapshot(root)),
            "legacy applied proposal retains unknown dates; no clock or filesystem-date fabrication");

        var interrupted = store.CreateProposal(project.Id, blank.Id, new("u-1", 0, 9, "Recorded", blank.Version, null));
        File.WriteAllText(Path.Combine(root, "empty.md"), interrupted.SourceAfter);
        var interruptedJournal = Path.Combine(root, ".voice-lint", "transactions", blank.Id + "-" + interrupted.Id + ".json");
        File.WriteAllText(interruptedJournal, JsonSerializer.Serialize(new { documentId = blank.Id, proposalId = interrupted.Id,
            beforeVersion = interrupted.ExpectedVersion, afterVersion = ProjectStore.Hash(interrupted.SourceAfter), backupPath = "fixture", state = "pending" }, ProjectStore.Json));
        snapshot = Snapshot(root);
        change = store.Activity(project.Id).Changes.Single(item => item.Id == interrupted.Id);
        check(change.State == "pending" && change.SourceStatus == "changed" && change.AppliedAt is null && snapshot.SequenceEqual(Snapshot(root)),
            "history does not recover an interrupted source transaction or infer that pending work was applied");

        var invalidId = new string('e', 32);
        WriteTask(root, new(invalidId, "different-project", en.Id, "Wrong project", [], applied.Version, 0, 1, "queued", "2026-09-06T10:00:00Z", "2026-09-06T10:00:00Z"));
        snapshot = Snapshot(root);
        reject(409, () => store.Activity(project.Id), "task metadata from another project is rejected instead of presented as project history");
        check(snapshot.SequenceEqual(Snapshot(root)), "invalid history metadata is never repaired or overwritten while listing");
    }

    private static void WriteTask(string root, ImprovementTask task)
    {
        var folder = Path.Combine(root, ".voice-lint", "tasks", task.DocumentId);
        Directory.CreateDirectory(folder);
        File.WriteAllText(Path.Combine(folder, task.Id + ".json"), JsonSerializer.Serialize(new
        {
            task, creationFingerprint = new string('a', 64), contextFingerprint = new string('a', 64), prompt = "Fixture only; never run."
        }, ProjectStore.Json));
    }

    private static string[] Snapshot(string root)
        => Directory.EnumerateFileSystemEntries(root, "*", SearchOption.AllDirectories).OrderBy(path => path, StringComparer.Ordinal)
            .Select(path => Path.GetRelativePath(root, path) + (Directory.Exists(path) ? "/" : ":" + File.GetLastWriteTimeUtc(path).Ticks + ":" + Convert.ToBase64String(File.ReadAllBytes(path)))).ToArray();
}
