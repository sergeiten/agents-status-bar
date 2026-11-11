# Privacy

Agents Status Bar collects no data and has no servers. It runs entirely on your Mac. Its only network activity is a once-a-day update check: one request to GitHub's public API for the latest release tag of `sergeiten/agents-status-bar`, used only to show the update line in the menu. If the app was installed through Homebrew, it also asks Homebrew's public formulae API for the current cask version. Nothing is sent to the developer (as with any update check or download, GitHub and Homebrew see the request; the developer never does).

The hooks read each agent's hook events and write small status files to `~/.agents-status-bar/` on your Mac. Your prompts, code and conversations never leave your machine because of this app.

---
Back to the [README](README.md).
