namespace VoiceStudio;

/// <summary>Private host state can retain its identity when the application checkout moves.</summary>
public static class SessionStorage
{
    public static string ResolveRoot(string home, string? configuredRoot)
    {
        home = Path.TrimEndingDirectorySeparator(Path.GetFullPath(home));
        if (configuredRoot is null)
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "VoiceStudio", "sessions", ProjectStore.Hash(OperatingSystem.IsWindows() ? home.ToUpperInvariant() : home)[..16]);

        if (string.IsNullOrWhiteSpace(configuredRoot) || !Path.IsPathFullyQualified(configuredRoot) ||
            configuredRoot.Any(char.IsControl))
            throw new InvalidOperationException("VOICE_STUDIO_SESSION_ROOT must be an absolute local directory path.");

        var root = Path.TrimEndingDirectorySeparator(Path.GetFullPath(configuredRoot));
        if (OperatingSystem.IsWindows() && root.StartsWith(@"\\"))
            throw new InvalidOperationException("VOICE_STUDIO_SESSION_ROOT must be an absolute local directory path.");
        var comparison = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
        if (root.Equals(Path.GetPathRoot(root), comparison) || root.Equals(home, comparison) ||
            root.StartsWith(home + Path.DirectorySeparatorChar, comparison))
            throw new InvalidOperationException("VOICE_STUDIO_SESSION_ROOT must be a private directory outside the application repository, not a filesystem root.");

        ProjectStore.EnsureNoLinks(root);
        return root;
    }
}
