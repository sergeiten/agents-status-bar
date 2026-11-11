// OpenAI Codex CLI adapter: maps Codex hook events to normalized session states.
// Codex hooks mirror Claude Code's (same hooks.json shape, same stdin fields: session_id, cwd,
// transcript_path, tool_name, …), plus an Interrupt event that Claude Code lacks.

const cp = require("child_process");
const path = require("path");

const TOOL_LABELS = {
  Bash: "Running command", apply_patch: "Editing", update_plan: "Planning",
  spawn_agent: "Delegating", view_image: "Reading",
};

const SHELLS = new Set(["sh", "bash", "zsh", "dash", "fish"]);

module.exports = {
  name: "codex",

  transition(event, p) {
    switch (event) {
      case "prompt":    return { state: "thinking", label: "Thinking…", resetClock: true };
      case "pre":       return { state: "tool", label: TOOL_LABELS[p.tool_name || ""] || "Using tool" };
      case "post":      return { state: "thinking", label: "Thinking…" };
      case "permreq":   return { state: "permission", label: "Awaiting permission" };
      case "stop":      return { state: "done", label: "Done" };
      // Esc mid-turn. Claude Code has no hook for this (the app tails its transcript instead);
      // Codex tells us directly, so just rest.
      case "interrupt": return { state: "idle", label: "" };
      default:          return null;
    }
  },

  env(prev) {
    return {
      entrypoint: "codex",
      term_program: process.env.TERM_PROGRAM || prev.term_program || "",
    };
  },

  // The app reaps a session once this pid is gone, so it must be Codex itself, not a short-lived
  // shell that Codex might wrap the hook command in. Walk up past any shell parents (at most a few
  // hops) to the first non-shell ancestor.
  agentPid() {
    let pid = process.ppid;
    for (let i = 0; i < 3 && pid > 1; i++) {
      let out = "";
      try { out = cp.execFileSync("/bin/ps", ["-o", "ppid=,comm=", "-p", String(pid)], { encoding: "utf8" }).trim(); } catch { break; }
      const m = out.match(/^(\d+)\s+(.*)$/);
      if (!m || !SHELLS.has(path.basename(m[2]).replace(/^-/, ""))) break;
      pid = Number(m[1]);
    }
    return pid;
  },
};
