using System.Text.Json;
using VoiceStudio;

static class JsonContentChecks
{
    public static void Run(string root, ProjectStore store, Action<bool, string> check, Action<int, Action, string> reject)
    {
        var folder = Path.Combine(root, "json-project"); Directory.CreateDirectory(folder);
        var path = Path.Combine(folder, "copy.json");
        const string source = """
{"en":{"title":"Review \"source\" \uD83D\uDE80.","lead":"Open the page."},"de":{"title":"Texte auf der Website prüfen."},"id":"private technical identifier","url":"https://example.org","method":"Compare independent judgments."}
""";
        File.WriteAllText(path, source);
        reject(400, () => store.Register(new(folder, "Unconfigured JSON")), "JSON inventory requires explicit source-file opt in");
        File.WriteAllText(Path.Combine(folder, "voice.config.json"), """{"version":1,"sourceFiles":["copy.json"]}""");
        var project = store.Register(new(folder, "JSON content"));
        var doc = store.ListDocuments(project.Id).Single();
        var detail = store.GetDocument(project.Id, doc.Id);
        check(detail.Format == "json" && detail.Units.Length == 4, "configured JSON prose fields exclude IDs and URLs");
        check(detail.Units.First().Language == "en" && detail.Units[2].Language == "de", "JSON language keys preserve each passage language");
        var parsed = DocumentParser.Parse(source, "json");
        var unit = detail.Units.First();
        check(unit.Text == "Review \"source\" 🚀.", "JSON quotes and UTF-16 escapes decode exactly");
        var quote = parsed.MapSpan(unit.Id, 7, 8);
        check(source[quote.Start..quote.End] == "\\\"", "JSON quote maps to original escape without wrapper offset");
        var rocketIndex = unit.Text.IndexOf("🚀", StringComparison.Ordinal);
        var rocket = parsed.MapSpan(unit.Id, rocketIndex, rocketIndex + 2);
        check(source[rocket.Start..rocket.End] == "\\uD83D\\uDE80", "JSON surrogate escape pair maps to original file");
        reject(400, () => parsed.MapSpan(unit.Id, rocketIndex, rocketIndex + 1), "JSON selection cannot split a surrogate pair");
        reject(422, () => DocumentParser.Parse("""{"title":"first","title":"second"}""", "json"), "duplicate JSON fields are rejected");
        reject(422, () => DocumentParser.Parse("{title:'not JSON'}", "json"), "JSON source must use strict JSON syntax");
        const string replacement = "Keep \"quotes\" and \\ paths\nNext line";
        var proposal = store.CreateProposal(project.Id, doc.Id, new(unit.Id, 0, unit.Text.Length, replacement, detail.Version, null));
        using (var json = JsonDocument.Parse(proposal.SourceAfter))
            check(json.RootElement.GetProperty("en").GetProperty("title").GetString() == replacement, "JSON proposal escapes quotes, slash and newline as valid JSON");
        check(File.ReadAllText(path) == source, "JSON proposal leaves original source unchanged before apply");
        var applied = store.ApplyProposal(project.Id, doc.Id, proposal.Id, new(detail.Version));
        check(applied.Units.First().Text == replacement, "JSON apply and parser roundtrip original-source edits");
        reject(409, () => store.CreateProposal(project.Id, doc.Id, new(unit.Id, 0, 4, "Edit", detail.Version, null)), "JSON stale source cannot create a replacement");
        var consoleEncoding = Console.OutputEncoding;
        try
        {
            Console.OutputEncoding = System.Text.Encoding.Latin1;
            const string unicodeSource = """{"title":"Überprüfung · Originalquelle 🚀"}""";
            var unicode = DocumentParser.Parse(unicodeSource, "json");
            check(unicode.Units.Single().Text == "Überprüfung · Originalquelle 🚀", "Node extraction remains UTF-8 under a non-UTF8 host console");
            check(unicode.MappedUnits.Single().Starts.Length == unicode.Units.Single().Text.Length, "Unicode source text and UTF-16 position arrays remain aligned");
        }
        finally { Console.OutputEncoding = consoleEncoding; }
        store.Unregister(project.Id);
    }
}
