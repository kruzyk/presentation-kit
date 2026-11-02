# Slides with script

A static browser tool connects an HTML deck to a private speaking script.
The tool works independently from Trinity Nexus.
No build or runtime installation is necessary for presentation use.

## Generate a ready package

Use Node.js 18 or later on the computer that generates the package.
No additional packages are necessary.
Run:

```sh
node /Users/U479524/Projects/presentation-kit/skills/slides-with-script/tool/package.mjs \
  /absolute/path/to/deck.html \
  /absolute/path/to/script.md \
  /absolute/path/to/new-ready-package
```

The final argument must identify a new directory.
The packager refuses an existing directory instead of replacing its contents.
It checks UTF-8 encoding and script section structure before writing files.
The browser checks deck resources and slide-to-script mapping when you open the entry.
If file writing fails, the new output directory can contain an incomplete package.
Use another new directory after correcting the reported error.

The generated files are:

| Path | Purpose |
| --- | --- |
| `index.html` | Private entry with automatic package validation |
| `audience.html` | Audience window without private controls |
| `core.js` | Script and package validation |
| `app.js` | Window communication and shared input validation |
| `package-data.js` | Exact deck and script text as a classic JavaScript data file |
| `sources/deck.html` | Byte-identical copy of the input deck |
| `sources/speaker-script.md` | Byte-identical copy of the input script |

Identical inputs and runtime files produce identical package files.
The packager does not write timestamps or absolute input paths into the output.
It does not change either source file.
Copy the complete generated directory to the presentation laptop.
Keep all five runtime files together.
The source copies support review and manual selection.
The package contains private speaking text, so do not distribute it as an audience-only document.

## Open a ready presentation

1. Open the generated `index.html` in a desktop browser.
2. Wait for the automatic checks to pass.
3. Select **Open audience window**.
4. Allow the popup if the browser blocks it.
5. Share only the window titled **Presentation**.
6. Keep **Private presenter - Do not share this window** on your private screen.
7. Click the audience deck before using its keyboard navigation.

The ready entry loads both texts from its adjacent `package-data.js`.
It does not use local-file `fetch`, path inputs, or a server.
Malformed data, missing data, and mismatched files produce explicit errors.
The audience button stays disabled when validation fails.
The manual selector remains available after an error.
Select **Change files** to use different files manually.

Node.js, Python, Copilot, and a server are not necessary on the presentation laptop.
Browser policies can still restrict local scripts or popups.

## Open windows with manual selection

1. Open `index.html` in a current desktop browser.
2. Select the HTML deck.
3. Select the UTF-8 Markdown or text script.
4. Select **Check files**.
5. Select **Open audience window**.
6. Allow the popup if the browser blocks it.
7. Share only the window titled **Presentation**.
8. Keep **Private presenter - Do not share this window** on your private screen.
9. Click the audience deck before using its keyboard navigation.

The file-selection page becomes the private presenter window.
Browser preferences can make the popup a tab.
Move that tab to a separate window before sharing it.
The browser does not guarantee separate physical screens.
The tool cannot prevent whole-desktop sharing.

The audience window uses the fixed title **Presentation**.
The browser controls the address bar, not this page.
A normal popup cannot guarantee a hidden address bar.
To hide browser controls, activate the audience window.
Select the browser's full-screen command.
If its toolbar remains visible, disable the browser's toolbar option for full-screen mode.
These settings depend on the browser.

The private window shows three fixed rows.
The compact header and small section titles reserve space for the speaking text.
The middle row contains the current slide's script.
The other rows contain the previous and next scripts.
Each row scrolls independently.
The tool resets their scroll positions when the slide changes.
Use **Text size** to adjust the reading size.
The start and end rows explicitly identify missing neighbours.

Use the deck's keys, navigation dots, mouse wheel, or touch gestures.
The tool reads the deck's state instead of counting key presses.
The private window also supplies previous and next buttons.
These buttons send arrow-key events to the deck.

## Demonstration

Open `demo/ready-v6/index.html` for automatic loading.
Select **Open audience window** after validation passes.

For manual selection, open the base `index.html`.
Select both files from `demo/`:

- `Trinity_Nexus_Product_20261013_v6.html`
- `Trinity_Nexus_Product_20261013_v6-cleared_speaker-script.md`

These files are unchanged copies of the approved sources.
Select the fourth navigation dot in the audience deck.
The private window must show sections 3, 4, and 5.
Navigate backward.
It must then show sections 2, 3, and 4.

## Script format

```markdown
# My presentation

## Slide 1 - Exact title from the deck

Read this paragraph.

Read this **important sentence**.

## Slide 2 - Exact title from the deck

Read this next paragraph.
```

Numbers must be consecutive and start at 1.
Every slide needs one nonempty section.
Titles must match the first `h1` or `h2` in each slide.
The comparison normalizes whitespace.
An em dash, an en dash, or a colon can replace the heading separator.
A document title and horizontal separators are optional.
Do not use other level-two headings.
The renderer supports paragraphs, line breaks, bold, and emphasis.
It escapes HTML and does not execute script text.
It shows other Markdown syntax as literal text.
It does not change the selected script file.

## Supported decks

Use trusted, self-contained HTML from a compatible generator.
Both the bundled `slides-web-neutral` template and compatible branded generators can supply decks.
Slides need `.slide` elements in document order.
The bridge supports vertical scroll navigation and one `.slide.active` element.
It observes scroll events, state changes, and viewport changes.
It reports the visible slide at least once per second while the browser runs the page.
At least half of a scroll-based slide must occupy the viewport.
During an uncertain transition, the private view hides the script.

The tool rejects common external or relative resource references.
Embed all fonts, images, styles, and scripts before loading.
The tool does not guarantee resource detection for arbitrary JavaScript or CSS.
It is not a security scanner.
Do not use untrusted decks.
The audience iframe uses a sandbox with script permission, but no same-origin permission.
Decks that need storage, external assets, or browser APIs can fail in this sandbox.
Such decks need a separate adapter and are outside this tool's contract.

The tool does not change the deck on disk.
It inserts a communication script into the in-memory audience copy.
The deck keeps its original content, CSS, and navigation code.
The audience receives only the deck, session identifier, and navigation commands.
It never receives the speaking script.

## Browser restrictions and recovery

Use a current Chrome, Edge, Firefox, or Safari on a laptop.
The tool uses classic scripts and `postMessage`, so it can run from local files.
No origin-dependent storage or `BroadcastChannel` is necessary.
Strict browser policies can block local scripts, popups, or the injected bridge.
If local scripts fail, serve this folder with a static HTTP server.
No tool backend is necessary.
If the deck contains a strict Content Security Policy, it can block the bridge.
The private window then reports a synchronization failure.

Keep both windows open.
Closing or refreshing the private window ends the audience session.
A ready entry loads and checks its package again after a private-window refresh.
For the manual launcher, select and check the files again.
Refreshing the audience window loads the deck again from the private window.
The audience window shows Slide 1 after closing and reopening.
Select **Change files** before loading another deck.
The tool closes the old audience window to prevent a mismatched script.

If no valid state arrives for five seconds, the tool hides the script.
Browser suspension can trigger this error.
Return to both windows to restore state reports.
Never read a hidden or stale script.

## Reuse and skill installation

Copy this whole `tool` folder to any project or laptop.
Keep `index.html`, `audience.html`, `core.js`, and `app.js` together.
For a ready package, also keep its generated `package-data.js`.
Keep `package.mjs` in the installed skill when you need package generation.
The demonstration files and tests are optional for normal use.
No Trinity Nexus package is necessary.

For another agent environment, copy all three skill folders to its skill discovery directory.
Install branded generators separately when necessary.
Do not copy its proprietary fonts or branding resources into these skills.
The parent discovers compatible installed branded skills before selecting the bundled neutral fallback.
This package stores the skill folders in `presentation-kit/skills/`.
Copy all three folders to `.github/skills/` for project-level skill discovery.
Restart or reload the agent's skill discovery after installation.

## Tests

Run the dependency-free parsing tests:

```sh
node --test /Users/U479524/Projects/presentation-kit/skills/slides-with-script/tool/tests/*.test.mjs
```

For the browser regression, serve this folder with a local static HTTP server.
For example, Python users can run:

```sh
python3 -m http.server 43822 --bind 127.0.0.1 --directory /Users/U479524/Projects/presentation-kit/skills/slides-with-script/tool
```

Use an isolated browser context for tests.
Do not navigate, reload, or close an active presentation tab.
Run `tests/browser-check.js` and `tests/package-browser-check.js` sequentially through HTTP.
Run `tests/local-package-browser-check.js` against the generated entry through a `file:` URL.
The package checks require the generated `demo/ready-v6/` directory.
The file contains one async function that receives a Playwright page.
The following runner creates isolated contexts and closes only those contexts:

```javascript
async (page) => {
  const browser = page.context().browser();
  const base = 'http://127.0.0.1:43822/';
  const tests = [
    ['browser-check.js', base + 'index.html'],
    ['package-browser-check.js', base + 'index.html'],
    ['local-package-browser-check.js',
      'file:///Users/U479524/Projects/presentation-kit/skills/slides-with-script/tool/demo/ready-v6/index.html'],
  ];
  const results = {};
  for (const [name, url] of tests) {
    const context = await browser.newContext();
    try {
      const response = await context.request.get(base + 'tests/' + name);
      if (!response.ok()) throw new Error('Regression script request failed.');
      const run = new Function('return (' + await response.text() + ')')();
      const testPage = await context.newPage();
      await testPage.goto(url);
      results[name] = await run(testPage);
    } finally {
      await context.close();
    }
  }
  return results;
}
```

Use only the supplied test file from your local server.
The tests check two-window navigation, boundaries, errors, reopening, automatic loading, manual selection, and text preservation.
It does not install packages.
See `demo/verification.md` for the recorded demonstration results.
See `demo/ready-package-verification.md` for the automatic-loading checks.

The neutral fallback has independent tests that do not need private demonstration files:

```sh
node --test skills/slides-with-script/tool/tests/neutral.test.mjs
```

Run that command from the installation root.
For `tests/neutral-browser-check.js`, serve the installation root instead of only this tool directory.
Supply an isolated page at that server's `/skills/slides-with-script/tool/index.html`.
The test checks the neutral template and its synchronization through the existing presenter.
