# Agents Status Bar

A tiny macOS menu bar app that shows the **live status of your AI coding agents** (Claude Code and OpenAI Codex): an animated icon while an agent is thinking or running a tool, a yellow dot when one is waiting for your permission, and the elapsed time of the current turn. It's lightweight, with no window, no Dock icon and no usage dashboards.

Built so you can tab away during a long "thinking" stretch and still see, at a glance, whether your agents are working, waiting on you, or done.

## Install

1. Download the latest `AgentsStatusBar.dmg` from [Releases](https://github.com/sergeiten/agents-status-bar/releases).
2. Open it and drag **Agents Status Bar** into Applications.
3. Launch it once. On first launch it sets up the hooks for Claude Code and, if it's installed, Codex.
4. Start a new agent session. The icon appears whenever an agent is running.

> [!IMPORTANT]
> **Codex:** Codex only runs new hooks after you trust them. Run `/hooks` in Codex once after installing.
>
> **Installed mid-session?** Sessions already open appear the next time they do something (a prompt or a tool call). Starting a new session also works.

To build from source instead, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Updating

The app checks once a day and the menu shows **Update available** when a new release is out; clicking it opens the releases page. Download the new DMG and drag it into Applications. The hooks refresh themselves on the next launch.

## What it shows

- **Thinking / working:** the icon animates, with a live `1m 1s` timer.
- **Running a tool:** a short label (`Editing`, `Reading`, `Running command`, `Using tool`, …).
- **Awaiting permission:** a paused yellow dot.
- **Idle / done:** the icon rests on the tündük mark.

Everything is controlled from the menu:

- **Show timer:** toggle the elapsed `1m 1s` clock.
- **Show text:** show the status label next to the icon (`Pondering…`, `Weaving…`, `Editing`, `Running command`), or turn it off for an icon-only menu bar (on by default).
- **Animation:**
  - **Tündük** (default): the tündük crown from the Kyrgyz flag, gently swaying while agents work. It stays still when macOS Reduce Motion is on.
  - **Unicode:** a glyph spinner.
- **Color:** **Gold** or **System** (adaptive black/white).
- **Completion Sound:** a chime when a turn finishes: **Off** (default), **Every turn**, or only after turns of **1 / 5 / 15 min+**. Pick the sound underneath: **Classic**, **Glass**, **Marimba**, **Komuz** or **Singing Bowl**. Choosing one plays a preview.
- **Version and update:** the menu shows your current version and tells you when an update is ready.

### Where it works

| Surface | Tracked? |
|---|---|
| Claude Code CLI (terminal) | ✅ |
| Claude Code Desktop, **Code** tab | ✅ |
| Cursor (Claude Code extension) | ✅ |
| Claude Desktop, **Chat/Cowork** tab | ❌ |
| OpenAI Codex CLI | ✅ (run `/hooks` in Codex once to trust the hooks) |

**Multi-session support.** When several sessions run at once (multiple terminals, a terminal plus the desktop app, or Claude Code next to Codex), the menu bar shows the highest-priority one: a session waiting for your permission is never hidden behind one that's thinking. The dropdown lists every live session, with a pill for its surface (`CLI`, `APP`, `CDX`).

## How it works

> [!NOTE]
> You don't open this app; it opens itself when an agent session starts, and quits when none is running. The only manual launch is the very first one after install, to set up the hooks. Opened by hand with no session active, it quits again after a few seconds. That's normal.

Each agent fires hooks as it works. A small adapter per agent (`hooks/sources/`) turns those events into one session file in `~/.agents-status-bar/state.d/`, and the app aggregates every live session into a single icon: a permission dot if one needs you, animating if any session is working, resting when all are idle.

The installer merges its hooks into `~/.claude/settings.json` and, when Codex is installed, `~/.codex/hooks.json` (backing each up first). It never touches hooks it didn't add. The app's only network activity is a once-a-day update check against GitHub's public API ([details](PRIVACY.md)).

## Requirements

- macOS 12+
- [Claude Code](https://claude.com/claude-code) (CLI or the Desktop app) and/or the [Codex CLI](https://github.com/openai/codex)
- Node.js

## Troubleshooting

See [Troubleshooting](TROUBLESHOOTING.md).

## Uninstall

```bash
node "/Applications/Agents Status Bar.app/Contents/Resources/uninstall.js"   # removes only our hooks
rm -rf ~/.agents-status-bar                                                  # removes the app's data
```

Then drag the app to the Trash.

## Based on Claude Status Bar

Agents Status Bar is a fork of [Claude Status Bar](https://github.com/m1ckc3s/claude-status-bar) by Mick Cesanek, used under the MIT License. Thank you to Mick and to everyone who contributed to the original project; see [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md).

## Trademarks / Not affiliated

This is an unofficial, open-source project. **It is not affiliated with, endorsed by, or sponsored by Anthropic, OpenAI, or the author of Claude Status Bar.** "Claude" and "Claude Code" are trademarks of Anthropic, and "Codex" and "OpenAI" are trademarks of OpenAI. They're used here only to describe which tools the app works with. The MIT License covers this project's source code and conveys no rights to anyone's trademarks.

## License

[MIT](LICENSE)
