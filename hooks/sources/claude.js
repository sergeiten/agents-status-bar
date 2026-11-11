// Claude Code adapter: maps Claude Code hook events to normalized session states.

const TOOL_LABELS = {
  Bash: "Running command", Edit: "Editing", Write: "Writing", MultiEdit: "Editing",
  NotebookEdit: "Editing", Read: "Reading", Grep: "Searching", Glob: "Searching",
  WebFetch: "Browsing web", WebSearch: "Searching web", Task: "Delegating",
  TodoWrite: "Planning",
};

module.exports = {
  name: "claude",

  // event = the update.js argv verb. Returns { state, label, resetClock? } or null to ignore.
  transition(event, p) {
    switch (event) {
      case "prompt": return { state: "thinking", label: "Thinking…", resetClock: true };
      case "pre":    return { state: "tool", label: TOOL_LABELS[p.tool_name || ""] || "Using tool" };
      case "post":   return { state: "thinking", label: "Thinking…" };
      case "notify": {
        // Only a permission prompt drives the icon here (CLI path; desktop uses permreq). Ignore
        // every other Notification (esp. the idle_prompt "Claude is waiting for your input") so the
        // icon rests instead of parking on a confusing "Waiting for you".
        const m = (p.message || "").toLowerCase();
        const isPerm = p.notification_type === "permission_prompt" ||
          m.includes("permission") || m.includes("approve") || m.includes("allow");
        return isPerm ? { state: "permission", label: "Awaiting permission" } : null;
      }
      // Desktop-app permission signal; not redundant with notify (that's CLI-only).
      case "permreq": return { state: "permission", label: "Awaiting permission" };
      case "stop":    return { state: "done", label: "Done" };
      default:        return null;
    }
  },

  env(prev) {
    return {
      // CLAUDE_CODE_ENTRYPOINT tags the surface running this session ("cli", "claude-desktop", …);
      // carried over from prev for the odd event where the env var isn't set.
      entrypoint: process.env.CLAUDE_CODE_ENTRYPOINT || prev.entrypoint || "",
      // TERM_PROGRAM identifies the terminal app for a CLI session (Apple_Terminal, iTerm.app,
      // vscode, WezTerm, …); the app uses it to bring that terminal to the front on a row click.
      term_program: process.env.TERM_PROGRAM || prev.term_program || "",
    };
  },

  // process.ppid IS this session's `claude` process (verified: hooks are spawned directly by it,
  // stable for the session's life, on both CLI and desktop).
  agentPid() { return process.ppid; },
};
