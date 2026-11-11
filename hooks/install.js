#!/usr/bin/env node
// Installs the status-bar hooks for every supported agent, merging (never clobbering) the user's
// existing hooks:
//   - Claude Code: ~/.claude/settings.json (always)
//   - OpenAI Codex: ~/.codex/hooks.json (only if ~/.codex exists, i.e. Codex is installed)
// Copies the hook scripts to ~/.claude/statusbar/. Re-runnable: existing status-bar hooks are
// stripped before re-adding.

const fs = require("fs");
const os = require("os");
const path = require("path");
const cp = require("child_process");

const home = os.homedir();
const sbDir = path.join(home, ".claude", "statusbar");
const MARKER = sbDir; // every hook command we add points inside this dir
const updateDest = path.join(sbDir, "update.js");
const lifecycleDest = path.join(sbDir, "lifecycle.js");

// Retire the old 0.0.2 background watcher LaunchAgent on upgrade (0.0.3+ self-quits).
const OLD_AGENT_LABEL = "com.local.claudestatusbar.watcher";
const oldAgentPlist = path.join(home, "Library", "LaunchAgents", OLD_AGENT_LABEL + ".plist");
try { cp.execSync(`launchctl bootout gui/${process.getuid()}/${OLD_AGENT_LABEL}`, { stdio: "ignore" }); } catch {}
if (fs.existsSync(oldAgentPlist)) { fs.rmSync(oldAgentPlist); console.log("Removed old desktop watcher LaunchAgent."); }

fs.mkdirSync(sbDir, { recursive: true });
fs.rmSync(path.join(sbDir, "watcher.sh"), { force: true });
// Retire pre-multi-session artifacts (single global state + empty liveness markers).
fs.rmSync(path.join(sbDir, "state.json"), { force: true });
fs.rmSync(path.join(sbDir, "sessions.d"), { recursive: true, force: true });
// The hook scripts: two entry points, the shared core, and one adapter per source.
for (const f of ["update.js", "lifecycle.js", "core.js"]) fs.copyFileSync(path.join(__dirname, f), path.join(sbDir, f));
fs.mkdirSync(path.join(sbDir, "sources"), { recursive: true });
for (const f of fs.readdirSync(path.join(__dirname, "sources")).filter((f) => f.endsWith(".js"))) {
  fs.copyFileSync(path.join(__dirname, "sources", f), path.join(sbDir, "sources", f));
}

const shellQuote = (value) => `'${value.replace(/'/g, `'\\''`)}'`;
const quotedMarkerPrefix = shellQuote(MARKER).slice(0, -1);
const isOurs = (command) =>
  command.includes(MARKER) || command.includes(quotedMarkerPrefix);
const nodeCmd = (script, args) =>
  `PATH="/opt/homebrew/bin:/usr/local/bin\${PATH:+:$PATH}" node ${shellQuote(script)} ${args}`;

const stripOurs = (arr) =>
  (arr || [])
    .map((entry) => ({
      ...entry,
      hooks: (entry.hooks || []).filter((h) => !isOurs(h.command || "")),
    }))
    .filter((entry) => (entry.hooks || []).length > 0);

// Merge `hooks` ([event, command, matcher?] triples) into the JSON file at `file` (a Claude
// settings.json or a Codex hooks.json; both use the same { hooks: { Event: [groups] } } shape).
// Our groups are always appended AFTER the user's, so the user's entries keep their positions
// (Codex keys hook trust by file:event:group:index).
function installInto(file, hooks) {
  let settings = {};
  if (fs.existsSync(file)) {
    settings = JSON.parse(fs.readFileSync(file, "utf8"));
    const bak = file + ".bak-statusbar";
    if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);
  }
  settings.hooks = settings.hooks || {};
  for (const [evt, command, matcher] of hooks) {
    settings.hooks[evt] = stripOurs(settings.hooks[evt]);
    const handlers = [{ type: "command", command }];
    settings.hooks[evt].push(matcher ? { matcher, hooks: handlers } : { hooks: handlers });
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(settings, null, 2) + "\n");
  console.log("Installed status-bar hooks into", file);
  console.log("Backup (first run only):", file + ".bak-statusbar");
}

// --- Claude Code ---
// Status hooks drive the animation/label; lifecycle hooks launch the app on open (the app quits
// itself when no longer needed).
installInto(path.join(home, ".claude", "settings.json"), [
  ["UserPromptSubmit", nodeCmd(updateDest, "prompt")],
  ["PreToolUse", nodeCmd(updateDest, "pre"), "*"],
  ["PostToolUse", nodeCmd(updateDest, "post"), "*"],
  ["Notification", nodeCmd(updateDest, "notify")],
  ["PermissionRequest", nodeCmd(updateDest, "permreq"), "*"],
  ["Stop", nodeCmd(updateDest, "stop")],
  ["SessionStart", nodeCmd(lifecycleDest, "start")],
  ["SessionEnd", nodeCmd(lifecycleDest, "end")],
]);

// --- OpenAI Codex ---
// Codex matchers are regexes, so groups go in without one (= match everything). Codex runs new
// hooks only after the user trusts them once via /hooks; it warns about untrusted hooks on startup.
const codexDir = path.join(home, ".codex");
if (fs.existsSync(codexDir)) {
  const codex = (script, evt) => nodeCmd(script, `${evt} --source=codex`);
  installInto(path.join(codexDir, "hooks.json"), [
    ["UserPromptSubmit", codex(updateDest, "prompt")],
    ["PreToolUse", codex(updateDest, "pre")],
    ["PostToolUse", codex(updateDest, "post")],
    ["PermissionRequest", codex(updateDest, "permreq")],
    ["Stop", codex(updateDest, "stop")],
    ["Interrupt", codex(updateDest, "interrupt")],
    ["SessionStart", codex(lifecycleDest, "start")],
    ["SessionEnd", codex(lifecycleDest, "end")],
  ]);
  console.log("Codex: run /hooks in Codex once to trust the new status-bar hooks.");
}

console.log("Scripts in", sbDir);
