import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import '../core.js';

const core = globalThis.SlidesWithScript;
const example = '# Deck\n\n## Slide 1 - First\n\n**One.**\n\n---\n\n## Slide 2 - Second\n\nTwo.\n';

test('parses consecutive sections and preserves exact source slices', () => {
  const sections = core.parseScript(example);
  assert.equal(sections.length, 2);
  assert.equal(sections[0].markdown, '\n\n**One.**\n\n---\n\n');
  assert.equal(sections[1].markdown, '\n\nTwo.\n');
  core.validateMapping(sections, ['First', 'Second']);
});

test('rejects missing, duplicate, unordered and empty sections', () => {
  for (const source of [
    'unstructured text',
    '## Slide 2 - Second\n\nTwo',
    '## Slide 1 - First\n\nOne\n\n## Slide 1 - First\n\nAgain',
    '## Slide 1 - First\n\n---',
    '## Slide 1 - First\n\nOne\n\n## Slide x - Bad\n\nText',
    '## Slide 1 - First\n\nOne\n\n## Slide 3 - Third\n\nThree',
  ]) assert.throws(() => core.parseScript(source));
});

test('rejects count and title mismatches', () => {
  const sections = core.parseScript(example);
  assert.throws(() => core.validateMapping(sections, ['First']));
  assert.throws(() => core.validateMapping(sections, ['First', 'Wrong']));
  core.validateMapping(sections, [' First  ', 'Second']);
});

test('accepts package text without changing its content', () => {
  const data = { version: 1, deck: '<!doctype html>\r\n', script: example };
  assert.deepEqual(core.parsePackage(data), { deck: data.deck, script: data.script });
});

test('rejects absent, malformed and unsupported package data', () => {
  for (const data of [undefined, null, 'text', {}, { version: 2, deck: 'html', script: example },
    { version: 1, deck: 42, script: example }, { version: 1, deck: 'html', script: [] },
    { version: 1, deck: '', script: example }, { version: 1, deck: 'html', script: ' ' }]) {
    assert.throws(() => core.parsePackage(data), /package is missing or invalid/);
  }
});

test('handles first, last and invalid positions', () => {
  const sections = core.parseScript(example);
  assert.equal(core.neighbours(sections, 0)[0], null);
  assert.equal(core.neighbours(sections, 1)[2], null);
  assert.throws(() => core.neighbours(sections, -1));
  assert.throws(() => core.neighbours(sections, 2));
});

test('escapes HTML and preserves paragraphs and emphasis', () => {
  const html = core.renderMarkdown('**Read** this.\nSame paragraph.\n\n*Next* <script>alert(1)</script>\n\n---');
  assert.equal(html, '<p><strong>Read</strong> this.<br>\nSame paragraph.</p><p><em>Next</em> &lt;script&gt;alert(1)&lt;/script&gt;</p>');
});

test('approved demonstration has seven sections and slide 4 neighbours', async () => {
  const source = await readFile(new URL('../demo/Trinity_Nexus_Product_20261013_v6-cleared_speaker-script.md', import.meta.url), 'utf8');
  const sections = core.parseScript(source);
  assert.equal(sections.length, 7);
  assert.deepEqual(core.neighbours(sections, 3).map(section => section.number), [3, 4, 5]);
  for (const section of sections) assert.ok(source.includes(section.markdown));
});
