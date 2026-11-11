# Icon design prompt

A self-contained brief for generating the app's agent-neutral icon with any design model (Codex, ChatGPT, or another image or vector tool). Copy everything under **Prompt** into the tool.

When the result is ready, save the menu bar mark as `assets/mark.svg` and the app icon as `assets/app-icon.svg`. Then run `make icons` to regenerate `Sources/RestingMark.swift` and `assets/AppIcon.icns`. Run `swift scripts/render-mark.swift preview <dir> <out.png>` to compare candidates at real menu bar size.

---

## Prompt

Design an icon for a small macOS menu bar utility.

**What the app does.** It shows, at a glance, the live status of the AI coding agents running on the user's Mac: Claude Code, OpenAI Codex, and others later. It has three states: an agent is **working** (an animation plays), an agent is **waiting for the user's permission** (a small yellow dot), or everything is **idle**. The app is a quiet, neutral utility that watches several agents at once. It does not belong to any one vendor.

**What you are designing.** You are designing the **idle / resting mark**: the glyph that sits in the macOS menu bar when nothing is happening. While agents work, the app animates (for example, three dots orbit each other, merge, and then settle back into this mark). So the mark should feel like the *settled* end of that motion: calm, balanced and still.

**It must not suggest any vendor or existing product.**
- No sparks, sparkles, stars or asterisks (Claude).
- No knots, flowers or hexagonal loops (OpenAI).
- No crabs or mascots, no robot or android faces.
- No brain, chip or "AI" lettering.

**Avoid generic stock metaphors.** These were already tried and rejected because they read as icons for something else:
- audio level bars or equalizers (they look like audio or voice apps)
- a terminal `>_` prompt (it looks like Terminal.app and other dev tools)
- linked nodes or graph shapes (they look like git, forks or CI)
- a plain eye or "visibility" glyph (it looks like show/hide password)
- dots arranged above a curve (it reads as a smiley face)

**The direction we want.** Aim for an ownable, distinctive mark of SF Symbols quality: geometric, confident, with a clear silhouette and one idea. Directions worth exploring include:
- a beacon or quiet signal at rest
- an orbit that has come to rest, e.g. a ring holding a single settled dot
- a stack of status lights reduced to its essence
- a bracketed or framed dot
- a lens or watchtower abstraction
- three dots resolving into a single form

Propose **three clearly different concepts**.

**Menu bar mark: technical requirements.** These are strict, because the mark is used as a monochrome template alpha mask.
- SVG, `viewBox="0 0 24 24"`, `width="24" height="24"`.
- One solid fill, `#000`, and nothing else. No strokes (outline every stroke into a filled path), no gradients, opacity, text, filters, masks or clipPaths.
- About 1.5 units of padding on every side, optically centered.
- It must stay crisp and recognizable at **16–18 pt** (18 px at 1×, 36 px at 2×). Use bold shapes and rounded terminals, keep gaps and counters at least 1.5 units, and use no hairline details. At 18 px it should read in under a second.
- The app tints it at runtime as system black/white (adaptive for light and dark menu bars) or orange `#d97757`. It must look good in all of these.

**App icon: technical requirements.**
- SVG, `viewBox="0 0 1024 1024"`.
- A macOS-style rounded square of about `x=100 y=100 w=824 h=824 rx=185` (leave the standard margin for the macOS icon grid).
- A tasteful background: a solid color or a subtle linear gradient. Put the same mark on it, enlarged, centered and in a contrasting color.
- It must look good on both light and dark docks and still read at 32 px.
- Modern and restrained: no skeuomorphic textures, no heavy drop shadows.

**Deliverables.**
1. `mark-1.svg`, `mark-2.svg`, `mark-3.svg`: the three menu bar concepts.
2. `app-1.svg`, `app-2.svg`, `app-3.svg`: the matching app icons.
3. `notes.md`: one line per concept with its name and the reasoning behind it.

**Self-check before finishing.**
- Every SVG is well-formed XML.
- Each mark uses only filled `#000` paths.
- Render each mark at 18 px on a dark strip and on a light strip, and judge honestly whether it is still legible and distinctive at that size. Revise any concept that turns into a blob or reads as one of the rejected metaphors above.
