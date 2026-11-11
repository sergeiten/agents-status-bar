# Contributing

Thanks for your interest. This is a tiny menu bar app and I'd like to keep it that way.

It does one thing: show the live status of your AI coding agents (Claude Code and Codex today). It stays local (the only network call is a daily update check), free (no API key, no spend), and small (a status bar, not a dashboard).

## What's welcome

Bug fixes, performance wins, animation and visual polish, better session focus, and compatibility fixes (macOS versions, CPU architectures, terminals). Support for another coding agent is welcome too, as long as it has a hook system: write one adapter in `hooks/sources/` plus an installer entry in `hooks/install.js`.

Check the [known issues](https://github.com/sergeiten/agents-status-bar/blob/main/TROUBLESHOOTING.md#known-issues) in TROUBLESHOOTING.md first: some behavior that looks like a bug is understood and intentional.

## Won't be merged

- Sending your conversation, files, or project to any API or relay.
- Anything that costs money or needs an API key.
- Usage meters, cost dashboards, analytics, or telemetry.
- Heavy work in the hooks. They run on every event, so they write one small state file and exit: no network, no per-prompt API calls.
- Hardcoding for one locale, provider, relay, or terminal.
- New settings stores or dependencies for a minor feature when what's already there works.
- Changing how your machine behaves: preventing sleep, holding power assertions, running privileged helpers, or any background action beyond showing status. The app displays state, it doesn't act on your system.
- Ports to Linux or Windows. Great projects, but as your own fork. This one is macOS.
- Artwork, logos, mascots or animations taken from an agent vendor's products (Anthropic, OpenAI, …). Original art only.

## Building

You'll need macOS 12+, the Swift toolchain (Xcode Command Line Tools), and Node.js (the hooks run on Node).

```bash
make build          # -> build/Agents Status Bar.app
make run            # build, then (re)launch it
make dmg            # also builds a .dmg
make test           # hook and installer tests
make icons          # regenerate the tündük icon files from scripts/generate-tunduk.py
```

Signing and notarization need a Developer ID: `TEAM_ID=<your team> make dmg`. Without it you get an ad-hoc build, which is fine for testing. Launch it, start a Claude Code or Codex session, and the icon appears.

Build off the latest `main` so you're not fixing something that already changed.

## Testing

Before you open a PR, actually run it. "Builds clean" is not testing.

Test it on the surfaces you touched, because they behave differently:

- the **Claude desktop app**,
- **Claude Code in a terminal**, and
- **Codex in a terminal**.

And tell me which terminal you used (Terminal.app, Ghostty, iTerm2, WezTerm, and so on). Behavior genuinely differs between them. For any visual or timing change, attach a screenshot or a short screen recording.


## What to expect

This is a small side project. Replies can be slow, and a perfectly good PR may be declined because it adds complexity or scope we don't want to carry. That's not a knock on your work. When in doubt keep the change small, and check the [known issues](https://github.com/sergeiten/agents-status-bar/blob/main/TROUBLESHOOTING.md#known-issues) first: some behavior that looks like a bug is intentional and already understood, timing, lifecycle, and self-quit especially.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat`, `fix`, `chore`, `refactor`, `style`, `docs`, `perf`. Branches: `type/kebab-case-description`.

## License

MIT. By contributing, you agree your contributions are licensed under it.
