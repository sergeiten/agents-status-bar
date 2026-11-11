# Troubleshooting

**You don't open this app, it opens itself.** The only time you launch it by hand is once, right after install, so it can set up the agent hooks. After that it starts itself whenever a Claude Code or Codex session is running and quits when none is. So opening it from Finder or Spotlight with no session active can look like it launches and immediately quits. That is expected, not a crash: just start a session and the icon appears on its own. Upgrades self-heal: drop the new version into Applications and it refreshes its own hooks the next time it starts up. (It relaunches itself when your next session begins, and on a version change it re-runs its installer automatically, so you never run anything by hand.)

**Updated (or just installed) while sessions were already running?** Sessions already open appear the next time they do something (a prompt or a tool call), so the menu can look empty until then. Starting a new session also works.

**Codex sessions don't show up?** Codex only runs new or changed hooks after you trust them. Run `/hooks` in Codex and trust the Agents Status Bar entries; Codex also warns about untrusted hooks when it starts. The hooks are only installed if `~/.codex` existed when the app first launched; if you installed Codex later, re-run the installer (see below).

**Using Chat or Cowork in the desktop app?** Those don't move the icon. Claude Code Chat and Cowork don't fire the same hooks this app runs on, so there's no live signal to drive the timer or the animation. Only Claude Code sessions move it: the desktop app's Code mode, or `claude` in a terminal. You'll still see the resting icon while the desktop app is open.

**Icon stuck on "thinking" in the terminal after you interrupted?** If you press Esc or Ctrl+C during the early thinking phase, before any output has streamed, Claude Code doesn't emit a signal for the app to catch, so the icon can sit on thinking until it times out (about 15 minutes). Sending any new prompt clears it right away. This one is terminal only, and it's an upstream Claude Code quirk, covered under [Known issues](#known-issues) below.

**Icon stuck on "thinking" in the desktop app?** If a session hits your usage limit mid-turn, Claude Code fires no hook to close it out, so the icon keeps thinking until it times out (about 15 minutes). To clear it right away, click the icon in the menu bar and choose **Quit**.

**The icon doesn't appear at all?**
- Make sure an agent session is actually running, not just a terminal window open. Start a new session (or restart Claude Code) and the bar appears automatically.
- A session that was already running *before* you installed won't show up until you start a fresh session.
- Confirm it's running with `pgrep -x AgentsStatusBar`: a number means it's running (it may just be hidden), no output means it exited because no session is active.
- If first-launch setup never took, run the installer manually: `node "/Applications/Agents Status Bar.app/Contents/Resources/install.js"`
- To see every hook event, set `AGENTS_STATUSBAR_DEBUG=1` in the environment the agent runs in; events are logged to `~/.agents-status-bar/hooks.log`.

**Also running the original Claude Status Bar?** That's a separate app with its own hooks and files (`~/.claude/statusbar`). Both can run side by side, but you'll see two icons for Claude Code sessions. Quit or uninstall one of them if that's not what you want.

**Seeing 2 icons?** The desktop app shows its own menu bar icon (the quick-screenshot one). To avoid two icons sitting side by side, open Claude's **Settings → General** and turn that built-in menu bar item off.

---

## Known issues

**Interrupting during the reasoning phase (CLI only) can freeze the icon on "thinking".** If you hit Ctrl+C while a turn is still in the extended-thinking phase, before any answer text has streamed, Claude Code writes nothing to the transcript and fires no hook, so there's no signal for the app to react to. The session sits on "thinking" until the 15-minute cap.
- Clears instantly if you type a new prompt in that session or close the terminal.
- Interrupting *after* answer text starts streaming recovers normally, within a poll.
- The desktop app is unaffected. Root cause is upstream in Claude Code, not fixable from here.

**Clicking a session brings the app forward, not the exact session.** Desktop sessions raise the Claude app rather than that specific conversation; terminal sessions raise your terminal app rather than that window or tab. Exact terminal focus would need a one-time Automation permission grant and isn't implemented yet.

**The app launches and tracks sessions inside Cursor.** Cursor's Third-party skills feature reads the same `~/.claude/settings.json` and runs your hooks against its own agent, so Cursor sessions show up here too. Most things work (animation, timer, rows); the amber permission dot, the CLI/APP pill and click-to-focus don't, because Cursor doesn't pass those events. To turn it off, disable **Third-party skills** in Cursor's Settings → Features. Your Claude Code usage is unaffected.

---
Back to the [README](README.md).
