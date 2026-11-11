#!/usr/bin/env node
// SessionStart/SessionEnd hooks. Usage: node lifecycle.js <start|end> [--source=claude|codex]
// (hook JSON, incl. session_id, on stdin). The source defaults to claude.

const core = require("./core");

const event = process.argv[2];
const adapter = core.loadSource(core.parseSource(process.argv));

core.readPayload((p) => {
  core.debugLog(adapter.name, event, p);
  if (event === "start") core.applyStart(adapter, p);
  else if (event === "end") core.applyEnd(p);
  process.exit(0);
});
