#!/usr/bin/env node
// Maps an agent hook event to this session's file: ~/.agents-status-bar/state.d/<session_id>.json
// Usage: node update.js <prompt|pre|post|notify|permreq|stop|interrupt> [--source=claude|codex]
// The source defaults to claude, so hook commands installed by older versions keep working.

const core = require("./core");

const event = process.argv[2] || "";
const adapter = core.loadSource(core.parseSource(process.argv));

core.readPayload((p) => {
  core.debugLog(adapter.name, event, p);
  if (core.applyUpdate(adapter, event, p, adapter.transition(event, p))) core.relaunchIfNeeded();
  process.exit(0);
});
