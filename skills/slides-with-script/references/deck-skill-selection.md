# Select a deck skill

## Discover available skills

Use the current agent's available-skill list or skill discovery tool.
Read skill descriptions before selecting a candidate.
Check all available HTML presentation skills, not only a skill named `slides-web`.
A different name can identify the required branded generator.
Do not assume that a plugin exists because a previous session used it.
Do not search unrelated home directories or scan credentials for installed skills.
If discovery cannot list skills, state that limitation.
The bundled neutral skill remains available through its adjacent `SKILL.md`.

## Selection order

1. Preserve an approved input deck instead of generating another deck.
2. If the user names a skill, inspect that skill first.
3. Otherwise, match available branded skills to the requested or documented project brand.
4. Check the candidate's output contract before generating content.
5. If exactly one compatible branded skill matches, invoke that skill.
6. If several compatible branded skills match, ask the user to select one.
7. If no brand is specified and exactly one compatible branded skill exists, use it and state the selection.
8. If no brand is specified and several brands exist, ask the user to select a brand or the neutral option.
9. If no compatible branded skill exists and branding is optional, invoke `slides-web-neutral`.
10. If branding is required but unavailable, report the missing skill or assets before generating content.

If the user explicitly requests neutral slides, use `slides-web-neutral` instead of a branded generator.
Never silently replace required branding with a neutral presentation.
If a selected branded skill fails to load, report the failure.
Use the neutral skill only when the user permits neutral output.
Do not download a private plugin or copy its resources as an automatic fallback.

## Compatibility check

The candidate must produce self-contained HTML.
Each slide needs a `.slide` element and a first `h1` or `h2` title.
The deck must support viewport-based detection or exactly one `.slide.active` element.
The HTML must work inside an iframe with `sandbox="allow-scripts"`.
Navigation must accept ArrowLeft, ArrowRight, Home, and End events on `document`.
Embed assets instead of introducing external resource requests.
Preserve the selected skill's design approval requirements.
PowerPoint-only and PDF-only generators do not satisfy this contract.

If compatibility is uncertain, read the candidate's instructions and check a generated deck in isolated test windows.
If its mandatory rules conflict with this contract, report the conflict.
Do not alter an approved source deck to force compatibility.

## Neutral fallback

Invoke `slides-web-neutral` through the agent's skill tool.
If discovery does not expose it, read `../../slides-web-neutral/SKILL.md` relative to this reference file.
Use its adjacent `template.html` without importing corporate resources.
Keep the fallback name distinct from `slides-web` so it cannot hide an installed plugin.
After deck generation, continue with `slides-speaking-script` and the existing packager.
Report which deck skill generated the presentation.

## Selection scenarios

| Available skills | Request | Result |
| --- | --- | --- |
| No branded generator | Neutral or unspecified | Use `slides-web-neutral` |
| One compatible branded generator with any name | Brand unspecified | Use that generator and state the selection |
| Several branded generators | Brand unspecified | Ask for the brand or neutral output |
| Matching branded generator and neutral fallback | Specified brand | Use the branded generator |
| Branded generator without required assets | Required brand | Report the blocker |
| PowerPoint-only generator | HTML, branding optional | Use `slides-web-neutral` |
| Approved HTML deck | Add narration | Preserve the deck and generate no replacement |
