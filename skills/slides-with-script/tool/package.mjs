import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import './core.js';

const [deckPath, scriptPath, outputPath, ...extra] = process.argv.slice(2);
if (!deckPath || !scriptPath || !outputPath || extra.length) {
  console.error('Usage: node package.mjs <deck.html> <script.md> <new-output-directory>');
  process.exitCode = 1;
} else {
  const output = resolve(outputPath);
  try {
    const runtime = dirname(fileURLToPath(import.meta.url));
    const files = ['index.html', 'audience.html', 'core.js', 'app.js'];
    const [deckBytes, scriptBytes, ...runtimeBytes] = await Promise.all([
      readFile(resolve(deckPath)), readFile(resolve(scriptPath)),
      ...files.map(file => readFile(resolve(runtime, file))),
    ]);
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    const data = { version: 1, deck: decoder.decode(deckBytes), script: decoder.decode(scriptBytes) };
    globalThis.SlidesWithScript.parsePackage(data);
    globalThis.SlidesWithScript.parseScript(data.script.replace(/^\uFEFF/, ''));
    const entry = runtimeBytes[0].toString('utf8')
      .replace('<html lang="en">', '<html lang="en" data-presentation-package>')
      .replace('    <script src="app.js" defer></script>',
        '    <script src="package-data.js" defer></script>\n    <script src="app.js" defer></script>')
      .replace('You can select the unchanged v6 files from the adjacent <code>demo</code> folder.',
        'You can select the packaged copies from the adjacent <code>sources</code> folder.');
    if (!entry.includes('data-presentation-package') || !entry.includes('src="package-data.js"')) {
      throw new Error('The launcher template is incompatible. Restore the installed runtime files.');
    }
    const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    await mkdir(dirname(output), { recursive: true });
    await mkdir(output);
    await mkdir(resolve(output, 'sources'));
    await Promise.all([
      writeFile(resolve(output, 'index.html'), entry, { flag: 'wx' }),
      ...files.slice(1).map((file, index) => writeFile(resolve(output, file), runtimeBytes[index + 1], { flag: 'wx' })),
      writeFile(resolve(output, 'package-data.js'), `globalThis.SlidesWithScriptPackage = ${json};\n`, { flag: 'wx' }),
      writeFile(resolve(output, 'sources/deck.html'), deckBytes, { flag: 'wx' }),
      writeFile(resolve(output, 'sources/speaker-script.md'), scriptBytes, { flag: 'wx' }),
    ]);
    console.log(`Created ${resolve(output, 'index.html')}`);
    console.log('Open this file in a browser. Select Open audience window after the file checks pass.');
  } catch (error) {
    console.error(`Package generation failed: ${error.message}`);
    console.error('Use a new output directory. Existing files remain unchanged. A write failure can leave an incomplete new directory.');
    process.exitCode = 1;
  }
}
