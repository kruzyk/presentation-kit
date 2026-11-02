import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const tool = fileURLToPath(new URL('../', import.meta.url));
const deck = join(tool, 'demo/Trinity_Nexus_Product_20261013_v6.html');
const script = join(tool, 'demo/Trinity_Nexus_Product_20261013_v6-cleared_speaker-script.md');
const packageCommand = (...args) => spawnSync(process.execPath, [join(tool, 'package.mjs'), ...args], { encoding: 'utf8' });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('generates deterministic files and preserves both approved sources exactly', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'slides-package-'));
  try {
    const before = await Promise.all([readFile(deck), readFile(script)]);
    const first = join(temp, 'first');
    const second = join(temp, 'second');
    assert.equal(packageCommand(deck, script, first).status, 0);
    assert.equal(packageCommand(deck, script, second).status, 0);
    const names = await readdir(first);
    assert.deepEqual(names, ['app.js', 'audience.html', 'core.js', 'index.html', 'package-data.js', 'sources']);
    for (const name of names.filter(name => name !== 'sources')) {
      assert.deepEqual(await readFile(join(first, name)), await readFile(join(second, name)));
    }
    for (const name of ['app.js', 'audience.html', 'core.js']) {
      assert.deepEqual(await readFile(join(first, name)), await readFile(join(tool, name)));
    }
    const sourceCopies = await Promise.all([readFile(join(first, 'sources/deck.html')),
      readFile(join(first, 'sources/speaker-script.md'))]);
    assert.deepEqual(sourceCopies, before);
    assert.deepEqual(await Promise.all([readFile(deck), readFile(script)]), before);
    assert.deepEqual(before.map(digest), [
      '2f96ed764bde5b9356b565e18b80b7977f0e14374d7a2e33ce5f3fd19516d84c',
      '9912e1f65528f33f391118790b213edaf948816eabf45ca38904ac9dc067e3fc',
    ]);
    const context = {};
    runInNewContext(await readFile(join(first, 'package-data.js'), 'utf8'), context);
    assert.equal(context.SlidesWithScriptPackage.deck, before[0].toString('utf8'));
    assert.equal(context.SlidesWithScriptPackage.script, before[1].toString('utf8'));
    const entry = await readFile(join(first, 'index.html'), 'utf8');
    assert.match(entry, /<html lang="en" data-presentation-package>/);
    assert.ok(entry.indexOf('src="package-data.js"') < entry.indexOf('src="app.js"'));
    assert.match(entry, /adjacent <code>sources<\/code> folder/);
    for (const name of names.filter(name => name !== 'sources')) {
      assert.deepEqual(await readFile(join(first, name)), await readFile(join(tool, 'demo/ready-v6', name)));
    }
    assert.equal(packageCommand(deck, script, first).status, 1);
    assert.deepEqual(await readFile(join(first, 'sources/deck.html')), before[0]);
  } finally {
    await rm(temp, { recursive: true });
  }
});

test('rejects missing arguments, invalid UTF-8 and invalid script sections before writing output', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'slides-package-'));
  try {
    assert.equal(packageCommand().status, 1);
    const invalid = join(temp, 'invalid.md');
    const output = join(temp, 'output');
    await writeFile(invalid, Buffer.from([0xff]));
    assert.equal(packageCommand(deck, invalid, output).status, 1);
    await writeFile(invalid, '## Slide 2 - Wrong\n\nRead this.\n');
    const result = packageCommand(deck, invalid, output);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Expected Slide 1/);
    await assert.rejects(readdir(output), { code: 'ENOENT' });
    assert.equal(packageCommand(join(temp, 'absent.html'), script, output).status, 1);
  } finally {
    await rm(temp, { recursive: true });
  }
});

test('embeds Unicode, CRLF, BOM and JavaScript-shaped text without executing or changing it', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'slides-package-'));
  try {
    const html = '\uFEFF<!doctype html>\r\n<div class="slide"><h1>Title</h1></div>';
    const text = '\uFEFF## Slide 1 - Title\r\n\r\nZażółć **text** </script> \u2028\u2029 " ` ${globalThis.bad = true}\r\n';
    const htmlPath = join(temp, 'deck.html');
    const textPath = join(temp, 'script.txt');
    const output = join(temp, 'output');
    await writeFile(htmlPath, html);
    await writeFile(textPath, text);
    assert.equal(packageCommand(htmlPath, textPath, output).status, 0);
    const context = {};
    runInNewContext(await readFile(join(output, 'package-data.js'), 'utf8'), context);
    assert.equal(context.SlidesWithScriptPackage.deck, html);
    assert.equal(context.SlidesWithScriptPackage.script, text);
    assert.equal(context.bad, undefined);
    assert.equal(await readFile(join(output, 'sources/speaker-script.md'), 'utf8'), text);
  } finally {
    await rm(temp, { recursive: true });
  }
});
