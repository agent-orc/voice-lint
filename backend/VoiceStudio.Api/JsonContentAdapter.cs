using System.Text.Json;

namespace VoiceStudio;

/// <summary>Parse explicitly configured JSON prose without evaluating source code.</summary>
public static class JsonContentAdapter
{
    private const string Prefix = "export const voiceJsonContent = ";

    public static ParsedDocument Parse(string source)
    {
        try
        {
            using var json = JsonDocument.Parse(source);
            if (json.RootElement.ValueKind is not (JsonValueKind.Object or JsonValueKind.Array))
                throw new ApiError(422, "JSON-Textquellen benötigen ein Objekt oder Array.");
            ValidateProperties(json.RootElement);
        }
        catch (JsonException) { throw new ApiError(422, "Die JSON-Quelldatei ist ungültig. Kein Quellvorschlag wird angewendet."); }

        var parsed = TypeScriptContentAdapter.Parse(Prefix + source + ";");
        int Offset(int value) => value < 0 ? value : value - Prefix.Length;
        var units = parsed.MappedUnits.Select(mapped => new MappedUnit(
            mapped.Unit with { SourceSpan = new(Offset(mapped.Unit.SourceSpan.Start), Offset(mapped.Unit.SourceSpan.End)) },
            mapped.Starts.Select(Offset).ToArray(), mapped.Ends.Select(Offset).ToArray())).ToArray();
        return parsed with { MappedUnits = units };
    }

    private static void ValidateProperties(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Object)
        {
            var names = new HashSet<string>(StringComparer.Ordinal);
            foreach (var property in value.EnumerateObject())
            {
                if (!names.Add(property.Name)) throw new ApiError(422, "Doppelte JSON-Schlüssel sind keine eindeutige Textquelle.");
                ValidateProperties(property.Value);
            }
        }
        else if (value.ValueKind == JsonValueKind.Array)
            foreach (var item in value.EnumerateArray()) ValidateProperties(item);
    }
}
