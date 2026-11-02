async (page) => {
  const tool = new URL('.', page.url());
  const ready = new URL('demo/ready-v6/index.html', tool).href;
  const dataURL = new URL('demo/ready-v6/package-data.js', tool).href;
  const checks = [];
  const failures = [];
  const requests = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('request', request => requests.push({ url: request.url(), type: request.resourceType() }));
  function check(value, message) {
    if (!value) throw new Error(message);
    checks.push(message);
  }
  async function checked() {
    await page.waitForFunction(() => document.getElementById('open') &&
      (document.getElementById('open').disabled === false || document.getElementById('status').dataset.error === 'true'));
  }
  async function current(number) {
    await page.waitForFunction(number => document.getElementById('current-script').dataset.slide === String(number) &&
      document.getElementById('reader').dataset.stale === 'false', number);
    // The source deck locks navigation for 600 ms.
    await page.waitForTimeout(650);
  }
  async function open() {
    const pending = page.waitForEvent('popup');
    await page.locator('#open').click();
    const audience = await pending;
    audience.on('pageerror', error => failures.push(error.message));
    await audience.waitForLoadState();
    await current(1);
    return audience;
  }
  await page.goto(ready);
  await checked();
  check(await page.locator('#open').isEnabled() && await page.locator('#setup').isHidden(),
    'Ready entry automatically loads and validates seven matching sections');
  check(await page.locator('#deck-file').evaluate(input => input.files.length) === 0 &&
    await page.locator('#script-file').evaluate(input => input.files.length) === 0,
    'Automatic loading does not require file selectors');
  check(page.context().pages().length === 1, 'Automatic loading does not open an audience popup');
  check(!requests.some(request => ['fetch', 'xhr'].includes(request.type)),
    'Ready entry loads classic scripts without fetch or XMLHttpRequest');
  await page.evaluate(() => {
    const original = window.open;
    window.open = () => null;
    document.getElementById('open').click();
    window.open = original;
  });
  check((await page.locator('#status').textContent()).includes('browser blocked'),
    'Ready entry reports blocked popups');
  let audience = await open();
  const frame = audience.frameLocator('#audience');
  check(await audience.title() === 'Presentation' &&
    await audience.locator('#private-header, #reader, script[src="package-data.js"]').count() === 0,
    'Ready audience contains no presenter controls or package data script');
  await frame.getByRole('button', { name: 'Go to slide 4', exact: true }).click();
  await current(4);
  check((await page.locator('.section').evaluateAll(elements => elements.map(element => element.dataset.slide))).join(',') === '3,4,5',
    'Packaged Slide 4 shows sections 3, 4, and 5');
  const [deckResponse, scriptResponse] = await Promise.all([
    page.request.get(new URL('demo/ready-v6/sources/deck.html', tool).href),
    page.request.get(new URL('demo/ready-v6/sources/speaker-script.md', tool).href),
  ]);
  if (!deckResponse.ok() || !scriptResponse.ok()) throw new Error('Packaged source request failed.');
  const deck = await deckResponse.text();
  const script = await scriptResponse.text();
  const paragraphs = await page.evaluate(script => globalThis.SlidesWithScript.parseScript(script)[3].markdown.trim()
    .split(/\r?\n\s*\r?\n/).filter(block => !/^\s*---\s*$/.test(block))
    .map(block => block.replace(/\*\*/g, '').replace(/\r\n/g, '\n')), script);
  check(JSON.stringify(await page.locator('#current-script p').allTextContents()) === JSON.stringify(paragraphs),
    'Automatic script loading preserves all Slide 4 words and paragraphs');
  const copy = await audience.locator('#audience').getAttribute('srcdoc');
  const boundary = deck.toLowerCase().lastIndexOf('</body>');
  check(copy.startsWith(deck.slice(0, boundary)) && copy.endsWith(deck.slice(boundary)) &&
    !copy.includes('In our Angular-to-React migration,'),
    'Ready audience preserves the deck and excludes private script text');
  await audience.keyboard.press('ArrowLeft');
  await current(3);
  check((await page.locator('.section').evaluateAll(elements => elements.map(element => element.dataset.slide))).join(',') === '2,3,4',
    'Packaged backward navigation updates all sections');
  await audience.keyboard.press('End');
  await current(7);
  check(await page.locator('#next').isDisabled(), 'Packaged last slide boundary disables Next');
  await audience.keyboard.press('Home');
  await current(1);
  check(await page.locator('#previous').isDisabled(), 'Packaged first slide boundary disables Previous');
  await audience.reload();
  await current(1);
  check(true, 'Packaged audience refresh reconnects');
  await audience.close();
  await page.waitForFunction(() => document.getElementById('reader').dataset.stale === 'true');
  audience = await open();
  check(true, 'Packaged audience close and reopen reconnects');
  await audience.close();
  await page.reload();
  await checked();
  check(await page.locator('#open').isEnabled(), 'Private refresh automatically validates package data again');
  await page.locator('#change').click();
  check(await page.locator('#setup').isVisible() && await page.locator('#open').isDisabled(),
    'Change files restores manual selection without stale package state');
  await page.locator('#deck-file').setInputFiles({ name: 'deck.html', mimeType: 'text/html', buffer: Buffer.from(deck) });
  await page.locator('#script-file').setInputFiles({ name: 'script.md', mimeType: 'text/plain', buffer: Buffer.from(script) });
  await page.locator('#load').click();
  await checked();
  check(await page.locator('#open').isEnabled(), 'Ready entry still validates manually selected files');
  audience = await open();
  await page.locator('#next').click();
  await current(2);
  check(true, 'Manual fallback retains two-window synchronization');
  await audience.close();
  const invalidCases = [
    { value: undefined, message: 'package is missing or invalid' },
    { value: { version: 2, deck, script }, message: 'package is missing or invalid' },
    { value: { version: 1, deck, script: 42 }, message: 'package is missing or invalid' },
    { value: { version: 1, deck, script: '## Slide 2 - Wrong\n\nRead.' }, message: 'Expected Slide 1' },
    { value: { version: 1, deck, script: script.replace('## Slide 4 — The next owner receives the context, not just the code',
      '## Slide 4 - Wrong title') }, message: 'different title' },
    { value: { version: 1, deck, script: script.slice(0, script.indexOf('## Slide 7')) }, message: '7 slides' },
    { value: { version: 1, deck: '<h1>No slides</h1>', script }, message: 'No .slide' },
    { value: { version: 1, deck: deck.replace('</head>', '<script src="external.js"></script></head>'), script }, message: 'resources' },
  ];
  for (const item of invalidCases) {
    await page.route(dataURL, route => route.fulfill({
      contentType: 'text/javascript',
      body: `globalThis.SlidesWithScriptPackage = ${JSON.stringify(item.value) ?? 'undefined'};`,
    }));
    await page.goto(ready);
    await checked();
    check(await page.locator('#open').isDisabled() && await page.locator('#setup').isVisible() &&
      (await page.locator('#status').textContent()).includes(item.message),
      `Malformed package blocks launch and permits manual selection: ${item.message}`);
    await page.unroute(dataURL);
  }
  await page.route(dataURL, route => route.abort());
  await page.goto(ready);
  await checked();
  check(await page.locator('#open').isDisabled() &&
    (await page.locator('#status').textContent()).includes('package is missing or invalid'),
    'Missing package data file reports an explicit error');
  await page.unroute(dataURL);
  await page.route(dataURL, route => route.fulfill({
    contentType: 'text/javascript', body: 'globalThis.SlidesWithScriptPackage = {',
  }));
  await page.goto(ready);
  await checked();
  check(await page.locator('#open').isDisabled() &&
    (await page.locator('#status').textContent()).includes('package is missing or invalid'),
    'Invalid data-script syntax also blocks launch with an explicit package error');
  check(failures.length === 1 && /Unexpected|SyntaxError/.test(failures[0]),
    'Malformed JavaScript produces only its expected syntax error');
  failures.length = 0;
  await page.unroute(dataURL);
  check(failures.length === 0, `No browser page errors: ${failures.join(', ')}`);
  return { passed: checks.length, checks };
}
