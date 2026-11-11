// Shared plumbing for every source's hooks (Claude Code, Codex, …).
// Each source adapter in ./sources/ only turns its own hook payload + env into the normalized
// session record; everything else (paths, atomic writes, the app relaunch) lives here.
//
// The state dir sits under ~/.claude for historical reasons, but it is source-neutral: every
// agent writes its sessions to the same state.d/, and the app aggregates them all.

const fs = require("fs");
const os = require("os");
const path = require("path");
const cp = require("child_process");

const BUNDLE_ID = "com.local.claudestatusbar";
const EXEC = "ClaudeStatusBar";
const dir = path.join(os.homedir(), ".claude", "statusbar");
const stateDir = path.join(dir, "state.d");
// Written by the app's Quit menu item; suppresses the self-heal relaunch so Quit sticks.
// lifecycle.js removes it on the next SessionStart (a new session = fresh consent).
const quitMarker = path.join(dir, "quit-intent");

const SOURCES = ["claude", "codex"];

// `--source=<name>` anywhere in argv; absent = claude, so hook commands installed by older
// versions (which never passed it) keep working unchanged.
function parseSource(argv) {
  const flag = argv.find((a) => a.startsWith("--source="));
  const name = flag ? flag.slice("--source=".length) : "claude";
  return SOURCES.includes(name) ? name : "claude";
}

function loadSource(name) {
  return require(path.join(__dirname, "sources", name + ".js"));
}

const safeId = (s) => String(s || "").replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 64) || "unknown";

const writeAtomic = (file, obj) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + "." + process.pid + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, file);
};

const readJSON = (file) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return {}; } };

const statePathFor = (sessionId) => path.join(stateDir, safeId(sessionId) + ".json");

const appRunning = () => { try { cp.execSync(`pgrep -x ${EXEC}`, { stdio: "ignore" }); return true; } catch { return false; } };

const openApp = () => {
  try { cp.spawn("open", ["-g", "-b", BUNDLE_ID], { stdio: "ignore", detached: true }).unref(); } catch {}
};

// Self-heal: a session with live state but no app to show it relaunches the app. Covers
// install-while-a-session-is-already-open (that session never fires SessionStart, the only
// other opener) and an app killed/crashed mid-session. Skipped after an explicit menu Quit.
const relaunchIfNeeded = () => {
  if (fs.existsSync(quitMarker)) return;
  if (!appRunning()) openApp();
};

// Read all of stdin, then call fn(parsedPayload) exactly once. Hooks always pipe stdin, but a
// timeout guarantees we never hang the agent's session.
function readPayload(fn, timeoutMs = 1000) {
  let raw = "", done = false;
  const finish = () => {
    if (done) return; done = true;
    let p = {};
    try { p = JSON.parse(raw || "{}"); } catch {}
    fn(p);
  };
  process.stdin.on("data", (d) => (raw += d));
  process.stdin.on("end", finish);
  process.stdin.on("error", finish);
  setTimeout(finish, timeoutMs).unref();
}

// Off by default; CLAUDE_STATUSBAR_DEBUG=1 logs every hook invocation to hooks.log.
function debugLog(source, event, p) {
  if (process.env.CLAUDE_STATUSBAR_DEBUG !== "1") return;
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, "hooks.log"),
      `${new Date().toISOString()} [${source}:${event}] ppid=${process.ppid} tool=${p.tool_name || "-"} mode=${p.permission_mode || "-"} msg=${JSON.stringify(p.message || "").slice(0, 160)} keys=${Object.keys(p).join(",")}\n`);
  } catch {}
}

// Apply a normalized event to this session's state file. `transition` is what the adapter
// returned for the event: { state, label } or null (= ignore). Returns true if a write happened.
//
// This session's own file is the unit of state AND the liveness marker. Writing it on any event
// also tracks sessions that predate the hook install (never fired SessionStart).
function applyUpdate(adapter, event, p, transition) {
  if (!transition) return false;
  const statePath = statePathFor(p.session_id);
  const prev = readJSON(statePath);
  const ts = Math.floor(Date.now() / 1000);

  // Turn clock: a prompt starts it, tool/thinking events keep (or lazily start) it, and any
  // resting/permission state clears it.
  let startedAt = prev.startedAt || 0;
  if (transition.state === "thinking" && transition.resetClock) startedAt = ts;
  else if (transition.state === "thinking" || transition.state === "tool") { if (!startedAt) startedAt = ts; }
  else startedAt = 0;

  const env = adapter.env(prev);
  // The app reads <cwd>/.git/HEAD for the branch and disambiguates same-named projects by
  // parent folder; carried over from prev for events whose payload omits cwd.
  const cwd = p.cwd || prev.cwd || "";
  const out = {
    source: adapter.name,
    state: transition.state,
    label: transition.label,
    tool: p.tool_name || "",
    project: p.cwd ? path.basename(p.cwd) : prev.project || "",
    cwd,
    sessionId: p.session_id || "",
    transcript: p.transcript_path || prev.transcript || "",
    entrypoint: env.entrypoint,
    term_program: env.term_program,
    // The agent's own long-lived process; the app reaps the session with kill(pid,0) once it's gone.
    pid: adapter.agentPid(),
    // started:true — any update event is real activity, so the session graduates from "merely
    // opened" to visible in the dropdown.
    started: true,
    startedAt,
    ts,
  };
  try { writeAtomic(statePath, out); } catch {}
  return true;
}

// SessionStart: seed an idle file. Counts the session immediately (launch + liveness), and clears
// any frozen state from a resume (SessionStart fires on resume with no active turn).
// started:false keeps a merely-opened conversation out of the dropdown until real activity.
function applyStart(adapter, p) {
  // A new session voids a prior explicit Quit.
  try { fs.rmSync(quitMarker, { force: true }); } catch {}
  fs.mkdirSync(stateDir, { recursive: true });
  // If the app isn't running, any leftover session files are stale (e.g. a prior crash) — clear
  // them so the count starts honest.
  if (!appRunning()) { try { for (const f of fs.readdirSync(stateDir)) fs.rmSync(path.join(stateDir, f), { force: true }); } catch {} }
  const cwd = p.cwd || "";
  const env = adapter.env({});
  try {
    writeAtomic(statePathFor(p.session_id), {
      source: adapter.name, state: "idle", label: "", tool: "", project: cwd ? path.basename(cwd) : "", cwd,
      sessionId: safeId(p.session_id), transcript: p.transcript_path || "", entrypoint: env.entrypoint,
      term_program: env.term_program, pid: adapter.agentPid(), started: false, startedAt: 0,
      ts: Math.floor(Date.now() / 1000),
    });
  } catch {}
  openApp();
}

// SessionEnd: removing the file drops the session from the aggregate — this is also what recovers
// a frozen animation on force-quit (SessionEnd fires, but no Stop).
function applyEnd(p) {
  try { fs.rmSync(statePathFor(p.session_id), { force: true }); } catch {}
}

module.exports = {
  dir, stateDir, quitMarker, SOURCES,
  parseSource, loadSource, safeId, writeAtomic, readPayload, debugLog,
  applyUpdate, applyStart, applyEnd, relaunchIfNeeded,
};
