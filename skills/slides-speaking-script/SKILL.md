---
name: slides-speaking-script
description: Creates a timed speaking script with one section per slide. Use when an HTML deck needs speaker notes, narration, or a synchronized presenter script.
---

# Slides speaking script

## Inputs

Use the final HTML deck, audience, purpose, language, and requested time limit.
If an input is missing, ask one focused question.
If the user authorizes autonomous work, state the assumptions instead.

## Workflow

1. Read each `.slide` element in document order.
2. Extract its first `h1` or `h2` title.
3. Replace title line breaks with spaces.
4. Record one script section for each slide.
5. Explain the slide's message with spoken language.
6. Add context, transitions, and examples that the supplied sources support.
7. Do not only repeat bullet points.
8. Do not invent facts.
9. Calculate the total word count.
10. Estimate speech time at the agreed speaking rate.
11. Reserve time for pauses and transitions.
12. If the script exceeds the time limit, reduce unapproved text.
13. Check every section number and title against the final deck.

Use 130 words per minute when the user supplies no speaking rate.
Reserve 10 percent of the time limit for pauses when the user supplies no pause allowance.
Record the rate, word count, pause allowance, and estimated duration in a separate delivery note.
The estimate is not a measured speaking duration.

## Approved text

Do not rewrite approved text without permission.
Preserve its words, order, paragraphs, and emphasis.
Copy an approved source without changes when its format already matches the contract.
If conversion is necessary, change only section markers.
Compare the spoken text before and after conversion.
If approved text exceeds the time limit, report the conflict.
Do not shorten it without permission.

## Output contract

Write a UTF-8 `.md` or `.txt` file:

```markdown
# Presentation title

## Slide 1 - Exact deck title

Spoken text for the first slide.

## Slide 2 - Exact deck title

Spoken text for the second slide.
```

Use consecutive numbers from 1 to the deck's slide count.
Use exactly one `## Slide N - Title` heading per slide.
The tool also accepts an em dash, an en dash, or a colon as the separator.
Keep titles identical after whitespace normalization.
Do not use other level-two headings or empty sections.
Use paragraphs, `**bold**`, and `*emphasis*`.
Do not include stage instructions among words the presenter must read.
Keep timing notes outside the script file.

## Delivery check

- [ ] Each slide has one section.
- [ ] Section numbers follow the deck order.
- [ ] Section titles match the deck.
- [ ] The script explains and supplements the slide content.
- [ ] The duration fits the limit, or the delivery note explains the conflict.
- [ ] Approved words remain unchanged.

Supply the script to `slides-with-script` for the synchronized private view.
