# Presentation kit

Create HTML presentations with a synchronized private speaking script.
Share the audience window while a separate presenter window shows the previous, current, and next script sections.
The current section stays central and visually distinct.
Forward and backward slide changes update the script.

The kit contains three agent skills and a standalone browser tool:

| Skill | Purpose |
| --- | --- |
| [`slides-with-script`](skills/slides-with-script/SKILL.md) | Select a deck generator, create narration, and build a ready-to-open package |
| [`slides-speaking-script`](skills/slides-speaking-script/SKILL.md) | Create a timed script with one section per slide |
| [`slides-web-neutral`](skills/slides-web-neutral/SKILL.md) | Generate neutral HTML when no suitable branded skill is available |

## Requirements

| Task | Requirements |
| --- | --- |
| Generate presentation content | An agent that supports skills, such as GitHub Copilot CLI |
| Generate a ready package | Node.js 18 or later, without additional packages |
| Present an existing ready package | A current desktop browser |
| Use the manual file selector | A current desktop browser |

Presentation use does not need Copilot, Node.js, Python, an extension, or a server.
Keep the generated files together when copying a package to another computer.

## Install for Copilot CLI

Clone this repository:

```sh
git clone https://github.com/kruzyk/presentation-kit.git
```

Register the skills directory with its absolute path:

```sh
copilot skill add /absolute/path/to/presentation-kit/skills
copilot skill list
```

Register the directory, not individual `SKILL.md` files.
The parent skill needs its adjacent tool and reference files.
If an existing session does not discover new skills, start a new session.
Do not interrupt an active presentation to refresh skill discovery.

For project-level installation, copy all three skill folders into `.github/skills/`.
For another agent, use its documented skill directory.

## Create a presentation

In the project that contains your source material, invoke:

```text
/slides-with-script Create an English sprint-review presentation from this
project's README. The audience is the team and one stakeholder. Allow five
minutes, including one short question. Create a separate speaking script
that explains the slides without repeating their text.
```

1. Review the selected generator and its slide plan.
2. Approve the plan before the agent generates a new deck.
3. Review the deck and speaking script.
4. Approve any changes to previously approved narration.
5. Open the generated package's `index.html` when you are ready to present.
6. Wait for automatic slide-to-script validation.
7. Select **Open audience window**.
8. Share only the window titled **Presentation**.

Keep the private presenter window open on a screen that you do not share.
It shows three independently scrollable script sections.
The audience receives the deck without the script or presenter controls.
The browser can block unsolicited popups, so opening the audience window requires your click.

### Branded generators and neutral fallback

The parent checks the current agent's available presentation skills.
It checks descriptions and HTML compatibility, not only the name `slides-web`.
A compatible branded generator takes priority when its brand matches the request.
If one branded generator exists and no brand is specified, the parent uses it and states that selection.
If several brands match without a clear choice, the parent asks you to select one.
If no suitable branded generator exists, it uses `slides-web-neutral` when branding is optional.
An explicit request for neutral slides uses the neutral skill.

Required branding does not silently become neutral output.
The parent reports missing brand assets or incompatible output formats.
Install branded skills separately if you need them.
This repository contains no corporate fonts, logos, or copied plugin resources.
See the [selection rules](skills/slides-with-script/references/deck-skill-selection.md).

## Try the included neutral example

Run this command from the repository root.
Use a new output directory:

```sh
node skills/slides-with-script/tool/package.mjs \
  skills/slides-web-neutral/template.html \
  skills/slides-web-neutral/example-script.md \
  ready-example
```

Open `ready-example/index.html` in a browser.
The page automatically loads and checks the deck and script.
Select **Open audience window** after validation passes.
At Slide 2, the private window shows script sections 1, 2, and 3.

The example uses generic content and system fonts.
It does not require a branded plugin or private demonstration files.

## Package your own deck and script

From the repository root, run:

```sh
node skills/slides-with-script/tool/package.mjs \
  /absolute/path/to/deck.html \
  /absolute/path/to/script.md \
  /absolute/path/to/new-ready-package
```

The output directory must not exist.
The generator preserves both input files and includes byte-identical copies under `sources/`.
A local classic JavaScript file supplies the inputs without local-file `fetch`.
The browser checks slide counts, section numbers, and titles before enabling audience launch.
Invalid data or a mismatched script prevents launch and produces an error.
Select **Change files** to use the manual selector instead.

For manual use without generation, open this repository's `index.html`.
Select the deck and script, then select **Check files**.
Only open trusted, self-contained HTML decks.

## Input format

Decks need `.slide` elements in document order.
Every slide needs a first `h1` or `h2` title.
The presenter supports viewport-based detection or exactly one `.slide.active` element.
Embed resources in the HTML and preserve supported keyboard navigation.

The UTF-8 script needs one nonempty section per slide:

```markdown
## Slide 1 - Exact title from the deck

Read this paragraph.

## Slide 2 - Exact title from the deck

Read this **important sentence**.
```

Numbers start at 1 and follow slide order.
Titles must match the deck after whitespace normalization.
The renderer supports paragraphs, line breaks, bold, and emphasis.
Use `/slides-speaking-script` separately when you already have a deck.

## Privacy and browser limits

Ready packages contain private narration and source copies.
Do not distribute a ready package as an audience-only document.
Keep private decks and generated packages outside this repository.
Git excludes local `tool/demo/` files and the documented `ready-example/` output.

Share only the audience window, not your whole desktop.
The tool cannot prevent whole-desktop sharing or guarantee separate physical screens.
The browser controls popups, full-screen mode, and its address bar.
Browser policies can block local scripts or the communication bridge.
If synchronization fails, the presenter hides the script.

The runtime checks cover Chromium on macOS.
Other browser and operating-system combinations need separate checks.
See the [tool documentation](skills/slides-with-script/tool/README.md) for restrictions and recovery.

## Tests

The neutral tests need only Node.js and the files in this repository:

```sh
node --test skills/slides-with-script/tool/tests/neutral.test.mjs
```

They check the fallback contract, generator-selection instructions, and exact package input preservation.
The [neutral browser check](skills/slides-with-script/tool/tests/neutral-browser-check.js) checks real two-window behavior in an isolated context.
The tool documentation explains its execution.
Older regression tests use optional local files under `tool/demo/` that this repository does not distribute.
