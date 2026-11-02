---
name: slides-web-neutral
description: Creates self-contained HTML presentations without corporate branding or external assets. Use when no compatible branded presentation skill is available, or when the user requests neutral browser slides.
---

# Neutral HTML slides

## Purpose

Create a single HTML deck from the supplied topic, sources, audience, language, and time limit.
This skill contains no corporate logos, fonts, templates, or copied plugin resources.
It does not replace an installed branded skill.

## Workflow

1. Identify approved decks and content before generating new files.
2. Preserve approved files unless the user permits changes.
3. Determine the audience, purpose, language, duration, and required slide count.
4. Propose slide titles, key messages, and visual layouts.
5. Obtain approval for the plan before generating a new deck.
6. Use [template.html](template.html) as the starting structure.
7. Replace its example content with the approved content.
8. Add or remove complete `.slide` sections as necessary.
9. Keep the navigation script and its state contract.
10. Use diagrams, comparisons, or charts when they explain the content better than lists.
11. Embed every required asset in the HTML.
12. Check navigation and layout in an isolated browser page.
13. Deliver the HTML path and report any untested browser behavior.

## Deck contract

Use `.slide` elements in document order.
Give every slide a first `h1` or `h2` with its exact title.
Keep exactly one `.slide.active` element.
Hide every inactive slide with the `hidden` attribute.
Keep inactive slides in the document so the presenter can count them.
Update the active class and hidden state together.
Preserve ArrowLeft, ArrowRight, Home, End, wheel, touch, and navigation-button support.
The presenter sends navigation events to `document`, not to a framework router.
Do not require storage, network access, modules, or same-origin iframe permission.
Use system fonts and neutral colors.
Do not introduce a company name, logo, or proprietary font.
Embed images as data URLs or inline SVG.
Keep CSS and JavaScript inside the output HTML.
Respect reduced-motion preferences and visible keyboard focus.
Check that content fits the viewport without clipping.
The template permits scrolling within long slides.
Reduce content or divide slides when the approved layout requires a fixed canvas.
Do not invent metrics, sources, or claims.

## Speaking script and ready package

This skill generates the deck only.
For synchronized narration, return the deck to `slides-with-script`.
That skill invokes `slides-speaking-script` and generates the ready package.
The speaking-script headings must match the final slide titles.

## Check before delivery

- [ ] The user approved the slide plan.
- [ ] The deck contains only approved content and permitted assets.
- [ ] Exactly one slide has the active class.
- [ ] Navigation works forward and backward.
- [ ] The first and last slides stop at their boundaries.
- [ ] The HTML runs without external requests.
- [ ] No corporate resources or private narration appear in the deck.
