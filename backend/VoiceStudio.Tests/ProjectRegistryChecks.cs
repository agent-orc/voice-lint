using System.Text.Json;
using VoiceStudio;

internal static class ProjectRegistryChecks
{
    public static void Run(string testRoot, Action<bool, string> check, Action<int, Action, string> reject)
    {
        var separators = OperatingSystem.IsWindows() ? new[] { '/', '\\' } : new[] { Path.DirectorySeparatorChar };
        var variant = 0;
        foreach (var separator in separators)
        foreach (var trailing in new[] { false, true })
        {
            var home = Path.Combine(testRoot, "registry-path-" + variant++);
            var quality = Path.Combine(home, "examples", "quality-website");
            var handbook = Path.Combine(home, "examples", "markdown-handbook");
            foreach (var folder in new[] { quality, handbook })
            {
                Directory.CreateDirectory(Path.Combine(folder, ".voice-lint"));
                File.WriteAllText(Path.Combine(folder, "guide.md"), "# Original source.\nKeep this passage.\n");
                File.WriteAllText(Path.Combine(folder, ".voice-lint", "retained.json"), "{\"decision\":\"keep\",\"revision\":7}\n");
            }
            string Stored(string folder) => folder.Replace(Path.DirectorySeparatorChar, separator) + (trailing ? separator.ToString() : "");
            var entries = new List<RegisteredProject>
            {
                new("existing-quality", "Named quality", Stored(quality), "http://127.0.0.1:5189/index.html"),
                new("existing-handbook", "Named handbook", Stored(handbook))
            };
            Directory.CreateDirectory(Path.Combine(home, ".voice-studio"));
            var registry = Path.Combine(home, ".voice-studio", "projects.json");
            File.WriteAllText(registry, JsonSerializer.Serialize(entries, ProjectStore.Json));
            var before = Snapshot(home);
            for (var restart = 0; restart < 2; restart++)
            {
                var store = new ProjectStore(home);
                check(store.ListProjects().Select(project => project.Id).SequenceEqual(entries.Select(project => project.Id)),
                    $"registry variant {variant}: restart {restart} preserves example count and IDs");
                check(store.Register(new(quality + Path.DirectorySeparatorChar, "Ignored rename")).Id == "existing-quality",
                    $"registry variant {variant}: existing quality registration");
                check(store.Register(new(handbook, "Ignored rename")).Id == "existing-handbook",
                    $"registry variant {variant}: existing handbook registration");
            }
            check(Snapshot(home).SequenceEqual(before), $"registry variant {variant}: registry, sources and metadata bytes unchanged");
            if (variant == 1)
            {
                entries.Add(new("separate-identity", "Do not merge", Stored(quality), "http://127.0.0.1:5189/other.html"));
                File.WriteAllText(registry, JsonSerializer.Serialize(entries, ProjectStore.Json));
                before = Snapshot(home);
                check(new ProjectStore(home).ListProjects().Select(project => project.Id).SequenceEqual(entries.Select(project => project.Id)),
                    "canonicalization preserves separately stored IDs instead of automatically deduplicating");
                check(Snapshot(home).SequenceEqual(before), "preserving distinct IDs does not rewrite their stored content");
            }
        }
        var invalidRoots = new List<string> { Path.Combine("examples", "quality-website"), ".", "" };
        if (OperatingSystem.IsWindows())
        {
            invalidRoots.Add("C:relative-project");
            invalidRoots.Add("\\relative-project");
        }
        foreach (var invalidRoot in invalidRoots)
        {
            var home = Path.Combine(testRoot, "registry-invalid-" + variant++);
            Directory.CreateDirectory(Path.Combine(home, ".voice-studio"));
            var registry = Path.Combine(home, ".voice-studio", "projects.json");
            File.WriteAllText(registry, JsonSerializer.Serialize(new[] { new RegisteredProject("invalid", "Invalid", invalidRoot) }, ProjectStore.Json));
            var before = Snapshot(home);
            reject(422, () => new ProjectStore(home), "stored relative or incomplete root is rejected before example registration");
            check(Snapshot(home).SequenceEqual(before), "invalid stored root is not resolved against cwd or rewritten");
        }
    }

    private static string[] Snapshot(string home) => Directory.GetFiles(home, "*", SearchOption.AllDirectories)
        .OrderBy(file => file, StringComparer.Ordinal)
        .Select(file => Path.GetRelativePath(home, file) + ":" + Convert.ToBase64String(File.ReadAllBytes(file))).ToArray();
}
