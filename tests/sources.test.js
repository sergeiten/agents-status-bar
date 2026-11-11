const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");

const hooksDir = path.resolve(__dirname, "../hooks");

// Run the installer/uninstaller against a temp HOME with process-control calls stubbed out.
const runScript = (name, home) => {
  execFileSync(process.execPath, ["-e", [
    `require("node:child_process").execSync = () => {};`,
    `require(${JSON.stringify(path.join(hooksDir, name))});`,
  ].join("\n")], { env: { ...process.env, HOME: home }, stdio: "pipe" });
};

// Fire a hook script the way an agent would: payload on stdin. The quit marker stops the
// self-heal relaunch from opening the real app during tests.
const fire = (home, script, args, payload, env = {}) => {
  fs.mkdirSync(path.join(home, ".claude", "statusbar"), { recursive: true });
  fs.writeFileSync(path.join(home, ".claude", "statusbar", "quit-intent"), "");
  execFileSync(process.execPath, [path.join(hooksDir, script), ...args], {
    env: { ...process.env, HOME: home, ...env },
    input: JSON.stringify(payload),
    stdio: "pipe",
  });
};

const readState = (home, id) =>
  JSON.parse(fs.readFileSync(path.join(home, ".claude", "statusbar", "state.d", id + ".json"), "utf8"));

const tmpHome = (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "statusbar sources test-"));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  return home;
};

const commands = (cfg) =>
  Object.values(cfg.hooks).flat().flatMap((g) => g.hooks || []).map((h) => h.command || "");

test("codex hooks are installed only when ~/.codex exists", (t) => {
  const home = tmpHome(t);
  runScript("install.js", home);
  assert.equal(fs.existsSync(path.join(home, ".codex", "hooks.json")), false);
});

test("codex install appends after user hooks, is idempotent, and uninstalls cleanly", (t) => {
  const home = tmpHome(t);
  const codexHooks = path.join(home, ".codex", "hooks.json");
  const userGroup = { hooks: [{ type: "command", command: "bash ~/mine.sh session", timeout: 10 }] };
  fs.mkdirSync(path.dirname(codexHooks), { recursive: true });
  fs.writeFileSync(codexHooks, JSON.stringify({ hooks: { SessionStart: [userGroup] } }));

  runScript("install.js", home);
  const cfg = JSON.parse(fs.readFileSync(codexHooks, "utf8"));
  const ours = commands(cfg).filter((c) => c.includes("--source=codex"));
  assert.equal(ours.length, 8);
  // The user's group keeps index 0 (Codex keys hook trust by position).
  assert.deepEqual(cfg.hooks.SessionStart[0], userGroup);
  assert.match(cfg.hooks.SessionStart[1].hooks[0].command, /lifecycle\.js' start --source=codex$/);
  assert.ok(cfg.hooks.Interrupt);
  // Codex matchers are regexes: we never write the Claude-style "*".
  assert.ok(Object.values(cfg.hooks).flat().every((g) => g.matcher === undefined));
  // Scripts for every source are copied next to the entry points.
  for (const f of ["core.js", "sources/claude.js", "sources/codex.js"]) {
    assert.ok(fs.existsSync(path.join(home, ".claude", "statusbar", f)), f);
  }

  runScript("install.js", home);
  assert.deepEqual(JSON.parse(fs.readFileSync(codexHooks, "utf8")), cfg);

  runScript("uninstall.js", home);
  assert.deepEqual(JSON.parse(fs.readFileSync(codexHooks, "utf8")), { hooks: { SessionStart: [userGroup] } });
  const claude = JSON.parse(fs.readFileSync(path.join(home, ".claude", "settings.json"), "utf8"));
  assert.equal(commands(claude).filter((c) => c.includes(".claude/statusbar")).length, 0);
});

test("claude events write source=claude state (default, no flag)", (t) => {
  const home = tmpHome(t);
  const env = { CLAUDE_CODE_ENTRYPOINT: "cli", TERM_PROGRAM: "iTerm.app" };
  fire(home, "update.js", ["prompt"], { session_id: "c1", cwd: "/x/proj" }, env);
  let s = readState(home, "c1");
  assert.equal(s.source, "claude");
  assert.equal(s.state, "thinking");
  assert.equal(s.entrypoint, "cli");
  assert.equal(s.project, "proj");
  assert.ok(s.startedAt > 0);
  const started = s.startedAt;

  fire(home, "update.js", ["pre"], { session_id: "c1", tool_name: "Edit" }, env);
  s = readState(home, "c1");
  assert.equal(s.label, "Editing");
  assert.equal(s.startedAt, started);
  assert.equal(s.cwd, "/x/proj"); // carried over

  fire(home, "update.js", ["notify"], { session_id: "c1", message: "Claude is waiting for your input" }, env);
  assert.equal(readState(home, "c1").state, "tool"); // non-permission notify ignored

  fire(home, "update.js", ["stop"], { session_id: "c1" }, env);
  s = readState(home, "c1");
  assert.equal(s.state, "done");
  assert.equal(s.startedAt, 0);
});

test("codex events map to the normalized states", (t) => {
  const home = tmpHome(t);
  const env = { TERM_PROGRAM: "Apple_Terminal" };
  fire(home, "lifecycle.js", ["start", "--source=codex"], { session_id: "x1", cwd: "/w/repo", source: "startup" }, env);
  let s = readState(home, "x1");
  assert.equal(s.source, "codex");
  assert.equal(s.state, "idle");
  assert.equal(s.started, false);
  assert.equal(s.entrypoint, "codex");

  fire(home, "update.js", ["prompt", "--source=codex"], { session_id: "x1", cwd: "/w/repo", turn_id: "t", prompt: "hi" }, env);
  assert.equal(readState(home, "x1").state, "thinking");

  fire(home, "update.js", ["pre", "--source=codex"], { session_id: "x1", tool_name: "apply_patch" }, env);
  assert.equal(readState(home, "x1").label, "Editing");

  fire(home, "update.js", ["permreq", "--source=codex"], { session_id: "x1", tool_name: "Bash" }, env);
  assert.equal(readState(home, "x1").state, "permission");

  fire(home, "update.js", ["interrupt", "--source=codex"], { session_id: "x1" }, env);
  s = readState(home, "x1");
  assert.equal(s.state, "idle");
  assert.equal(s.startedAt, 0);
  assert.equal(s.term_program, "Apple_Terminal");
  assert.ok(s.pid > 0);

  fire(home, "lifecycle.js", ["end", "--source=codex"], { session_id: "x1" }, env);
  assert.equal(fs.existsSync(path.join(home, ".claude", "statusbar", "state.d", "x1.json")), false);
});

test("codex pid resolution skips a wrapping shell", (t) => {
  const home = tmpHome(t);
  const script = path.join(hooksDir, "update.js");
  fs.mkdirSync(path.join(home, ".claude", "statusbar"), { recursive: true });
  fs.writeFileSync(path.join(home, ".claude", "statusbar", "quit-intent"), "");
  // `sh -c "...; true"` keeps sh alive as node's parent (no exec optimization), like a wrapper.
  execFileSync("/bin/sh", ["-c", `"${process.execPath}" "${script}" pre --source=codex; true`], {
    env: { ...process.env, HOME: home },
    input: JSON.stringify({ session_id: "x2", tool_name: "Bash" }),
    stdio: "pipe",
  });
  assert.equal(readState(home, "x2").pid, process.pid);
});
