import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Script, runInNewContext } from 'node:vm';
import '../core.js';

const skills = new URL('../../../', import.meta.url);
const template = new URL('slides-web-neutral/template.html', skills);
const core = globalThis.SlidesWithScript;

test('neutral skill stays distinct and links to its self-contained template', async () => {
  const instructions = await readFile(new URL('slides-web-neutral/SKILL.md', skills), 'utf8');
  assert.match(instructions, /^---\nname: slides-web-neutral\n/);
  assert.match(instructions, /Use when/);
  assert.ok(instructions.split('\n').length < 100);
  assert.match(instructions, /\[template.html\]\(template.html\)/);
  const html = await readFile(template, 'utf8');
  assert.doesNotMatch(html, /<(?:script|img)\b[^>]*\bsrc=|<link\b|\burl\s*\(|@font-face/i);
  assert.doesNotMatch(html, /Lufthansa|LHG|Trinity|U479524|https?:\/\//i);
  assert.equal([...html.matchAll(/<section class="slide(?: active)?(?: cover)?"/g)].length, 3);
  assert.equal([...html.matchAll(/class="slide active/g)].length, 1);
  new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
});

test('parent routes through discovery instead of requiring a named branded plugin', async () => {
  const parent = await readFile(new URL('slides-with-script/SKILL.md', skills), 'utf8');
  const selectionURL = new URL('slides-with-script/references/deck-skill-selection.md', skills);
  const selection = await readFile(selectionURL, 'utf8');
  assert.match(parent, /references\/deck-skill-selection.md/);
  assert.doesNotMatch(parent, /Invoke `slides-web` with the skill tool/);
  assert.match(selection, /not only a skill named `slides-web`/);
  assert.match(selection, /current agent's available-skill list or skill discovery tool/);
  assert.match(selection, /several compatible branded skills match, ask/);
  assert.match(selection, /branding is required but unavailable, report/);
  assert.match(selection, /explicitly requests neutral slides, use `slides-web-neutral`/);
  assert.match(selection, /PowerPoint-only and PDF-only generators do not satisfy/);
  assert.match(selection, /Keep the fallback name distinct/);
  const fallback = new URL('../../slides-web-neutral/SKILL.md', selectionURL);
  assert.match(await readFile(fallback, 'utf8'), /name: slides-web-neutral/);
});

test('included example script matches the neutral template titles', async () => {
  const html = await readFile(template, 'utf8');
  const script = await readFile(new URL('slides-web-neutral/example-script.md', skills), 'utf8');
  const titles = [...html.matchAll(/<h[12]>([^<]+)<\/h[12]>/g)].map(match => match[1]);
  const sections = core.parseScript(script);
  core.validateMapping(sections, titles);
  assert.deepEqual(core.neighbours(sections, 1).map(section => section.number), [1, 2, 3]);
});

test('neutral template packages with exact source copies and matching script sections', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'neutral-slides-'));
  try {
    const html = await readFile(template, 'utf8');
    const titles = [...html.matchAll(/<h[12]>([^<]+)<\/h[12]>/g)].map(match => match[1]);
    const script = titles.map((title, index) => `## Slide ${index + 1} - ${title}\n\nPrivate narration ${index + 1}.\n`).join('\n');
    core.validateMapping(core.parseScript(script), titles);
    const scriptPath = join(temporary, 'speaker-script.md');
    await writeFile(scriptPath, script);
    const output = join(temporary, 'ready');
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL('../package.mjs', import.meta.url)),
      fileURLToPath(template), scriptPath, output,
    ], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(join(output, 'sources/deck.html'), 'utf8'), html);
    assert.equal(await readFile(join(output, 'sources/speaker-script.md'), 'utf8'), script);
    const context = {};
    runInNewContext(await readFile(join(output, 'package-data.js'), 'utf8'), context);
    const data = core.parsePackage(context.SlidesWithScriptPackage);
    assert.equal(data.deck, html);
    assert.equal(data.script, script);
    core.validateMapping(core.parseScript(data.script), titles);
  } finally {
    await rm(temporary, { recursive: true });
  }
});
