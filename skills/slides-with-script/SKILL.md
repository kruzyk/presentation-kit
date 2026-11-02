---
name: slides-with-script
description: Creates a ready-to-open HTML presentation package with a synchronized private speaking script. Use when a user needs slides-web, speaker notes, or separate audience and private presenter windows.
---

# Slides with script

## Purpose

Select an available branded HTML skill or the bundled `slides-web-neutral` fallback.
Use the separate `slides-speaking-script` skill to create the speaking script.
Use the included [browser tool](tool/README.md) to synchronize both files.
Use `tool/package.mjs` to create a package that loads both files automatically.

## Workflow

1. Obtain the topic, audience, purpose, language, slide count, and speaking time limit.
2. Identify existing decks and approved scripts.
3. If the user supplies approved files, preserve them.
4. Follow [deck skill selection](references/deck-skill-selection.md) to discover and invoke a compatible generator.
5. Follow the selected skill's design-brief approval gate before generating a new deck.
6. Produce a self-contained HTML deck with `.slide` elements and embedded resources.
7. Preserve the deck's keyboard, wheel, touch, and dot navigation.
8. Invoke `slides-speaking-script` with the skill tool.
9. Supply the final deck and time limit to that skill.
10. Check one script section for each slide.
11. Compare section numbers and titles with the final deck.
12. Run the packager with the final deck, final script, and a new output directory.
13. Open the generated `index.html` in a desktop browser.
14. Check the automatic validation result before presenting.
15. Let the user select **Open audience window**.
16. Check forward and backward navigation in isolated test windows.
17. Check the first and last slide boundaries.
18. Deliver the ready entry path, source paths, launch instructions, and duration estimates.

```sh
node /path/to/slides-with-script/tool/package.mjs /path/to/deck.html /path/to/script.md /path/to/new-ready-package
```

Resolve the packager path from this installed skill directory.
Do not assume that the current project contains the tool.
Use a new output directory for each delivery.
The packager refuses existing output directories.
Node.js 18 or later is necessary only when generating the package.
The generated presentation does not need Node.js, Python, a server, or a browser extension.
It loads its local classic data script without `fetch`.
The browser checks slide counts, section numbers, and titles before enabling audience launch.
Do not open a new demonstration while the user presents from another window.
The launch page becomes the private presenter window.
The popup becomes the audience window.
If the browser creates a tab, move it to a separate window before sharing it.
Manual selection remains available through `tool/index.html` or **Change files** in a ready package.

## Existing files

Do not regenerate an approved deck to add synchronization.
The tool adds a communication bridge only to the in-memory audience copy.
It does not change the source file, slide content, or layout.
Record source hashes before and after a preservation test.
The package contains byte-identical source copies in `sources/`.
Do not edit the generated `package-data.js` to revise approved content.
Regenerate into a new directory after an approved source change.

## Supported deck contract

Use self-contained HTML with `.slide` elements in document order.
Each slide must contain a first `h1` or `h2` title.
The tool detects scroll-based slides by visible viewport area.
It also supports decks with exactly one `.slide.active` element.
If the deck uses another state model, report the unsupported contract.
Embed fonts, images, CSS, and JavaScript before loading the deck.
Do not load untrusted HTML.

## Privacy and failure rules

Never send script text to the audience window.
Show script sections only in the private presenter window.
Keep the previous, current, and next sections in three fixed rows.
Distinguish the central section with its label, background, border, and text size.
Scroll each section independently when its text exceeds the available height.
Reset section scroll positions when the slide changes.
If synchronization fails, hide the script instead of showing uncertain text.
Report blocked popups, invalid sections, mismatched titles, and missing slides.
Share only the audience window.
The tool cannot prevent whole-desktop sharing.

## Delivery check

- [ ] The agent discovered available generators and invoked the selected deck skill and speaking-script skill.
- [ ] The deck and script mapping passes.
- [ ] The ready entry automatically loads both final files without manual selection.
- [ ] The browser enables audience launch only after validation.
- [ ] Both packaged source copies match the final input bytes.
- [ ] The audience window contains no speaking script or presenter controls.
- [ ] Slide 4 shows script sections 3, 4, and 5 when those slides exist.
- [ ] Backward navigation updates all three sections.
- [ ] The audience window shows Slide 1 after closing and reopening.
- [ ] Source hashes remain unchanged for approved files.
