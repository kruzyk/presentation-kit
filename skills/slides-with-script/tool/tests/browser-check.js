async (page) => {
  if (!/^https?:/.test(page.url())) throw new Error('Open the tool through a local static HTTP server before this test.');
  const tool = new URL('.', page.url());
  const deckName = 'Trinity_Nexus_Product_20261013_v6.html';
  const scriptName = 'Trinity_Nexus_Product_20261013_v6-cleared_speaker-script.md';
  const responses = await Promise.all([
    page.request.get(new URL(`demo/${deckName}`, tool).href),
    page.request.get(new URL(`demo/${scriptName}`, tool).href),
  ]);
  if (responses.some(response => !response.ok())) throw new Error('A demonstration fixture request failed.');
  const [deck, script] = await Promise.all(responses.map(response => response.text()));
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  const checks = [];
  function check(value, message) {
    if (!value) throw new Error(message);
    checks.push(message);
  }
  async function load(html = deck, text = script) {
    await page.locator('#deck-file').setInputFiles({ name: deckName, mimeType: 'text/html', buffer: Buffer.from(html) });
    await page.locator('#script-file').setInputFiles({ name: scriptName, mimeType: 'text/plain', buffer: Buffer.from(text) });
    await page.getByRole('button', { name: 'Check files', exact: true }).click();
    await page.waitForFunction(() => document.getElementById('status').textContent !== 'Checking files.');
  }
  async function current(number) {
    await page.waitForFunction(number => document.getElementById('current-script').dataset.slide === String(number) &&
      document.getElementById('reader').dataset.stale === 'false', number);
    // The unchanged demonstration deck locks navigation for 600 ms.
    await page.waitForTimeout(650);
  }
  async function open() {
    const pending = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Open audience window', exact: true }).click();
    const audience = await pending;
    audience.on('pageerror', error => failures.push(error.message));
    await audience.waitForLoadState();
    await current(1);
    return audience;
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(new URL('index.html', tool).href);
  await load();
  check(await page.locator('#open').isEnabled(), 'Approved deck and embedded favicon pass validation');
  let audience = await open();
  check(await audience.title() === 'Presentation', 'Audience window uses the fixed Presentation title');
  const frame = audience.frameLocator('#audience');
  await frame.getByRole('button', { name: 'Go to slide 4', exact: true }).click();
  await current(4);
  check((await page.locator('.section').evaluateAll(elements => elements.map(element => element.dataset.slide))).join(',') === '3,4,5',
    'Slide 4 shows sections 3, 4, and 5');
  const positions = await page.locator('.section').evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, border: getComputedStyle(element).borderTopWidth };
  }));
  check(positions[0].bottom < positions[1].top && positions[1].bottom < positions[2].top &&
    positions[1].border === '3px', 'Current section stays central and has a distinct border');
  const typography = await page.evaluate(() => ({
    headerHeight: document.getElementById('private-header').getBoundingClientRect().height,
    headerFont: getComputedStyle(document.querySelector('h1')).fontSize,
    labelFont: getComputedStyle(document.querySelector('.position')).fontSize,
    contextTitleFont: getComputedStyle(document.querySelector('#previous-script h2')).fontSize,
    currentTitleFont: getComputedStyle(document.querySelector('#current-script h2')).fontSize,
    scriptFont: getComputedStyle(document.querySelector('#current-script p')).fontSize,
  }));
  check(typography.headerHeight <= 90 && typography.headerFont === '16px' && typography.labelFont === '10px' &&
    typography.contextTitleFont === '13px' && typography.currentTitleFont === '15px' && typography.scriptFont === '23px',
    'Compact header and section titles leave the speaking text at its original size');
  const expectedParagraphs = await page.evaluate(script => {
    const section = globalThis.SlidesWithScript.parseScript(script)[3];
    return section.markdown.trim().split(/\r?\n\s*\r?\n/).filter(block => !/^\s*---\s*$/.test(block))
      .map(block => block.replace(/\*\*/g, '').replace(/\r\n/g, '\n'));
  }, script);
  check(JSON.stringify(await page.locator('#current-script p').allTextContents()) === JSON.stringify(expectedParagraphs),
    'Rendered script preserves all approved paragraphs and spoken words');
  check(await audience.locator('#private-header, #reader, #script-file').count() === 0,
    'Audience wrapper contains no presenter controls or script');
  check(await frame.locator('body').evaluate(body => !body.textContent.includes('In our Angular-to-React migration,')),
    'Audience deck contains no private speaking text');
  const audienceCopy = await audience.locator('#audience').getAttribute('srcdoc');
  const boundary = deck.toLowerCase().lastIndexOf('</body>');
  const tailLength = deck.length - boundary;
  check(audienceCopy.startsWith(deck.slice(0, boundary)) && audienceCopy.endsWith(deck.slice(boundary)) &&
    /^<script>/.test(audienceCopy.slice(boundary, -tailLength)), 'Audience copy preserves the complete source around the bridge');
  await audience.keyboard.press('ArrowLeft');
  await current(3);
  check((await page.locator('.section').evaluateAll(elements => elements.map(element => element.dataset.slide))).join(',') === '2,3,4',
    'Backward keyboard navigation updates all three sections');
  await audience.keyboard.press('End');
  await current(7);
  check(await page.locator('#next').isDisabled() && (await page.locator('#next-script').textContent()).includes('No next slide'),
    'Last slide has an explicit boundary');
  await audience.keyboard.press('Home');
  await current(1);
  check(await page.locator('#previous').isDisabled() && (await page.locator('#previous-script').textContent()).includes('No previous slide'),
    'First slide has an explicit boundary');
  await frame.locator('body').evaluate(body => body.ownerDocument.dispatchEvent(
    new body.ownerDocument.defaultView.WheelEvent('wheel', { deltaY: 120, bubbles: true })));
  await current(2);
  check(true, 'Wheel navigation synchronizes');
  await frame.locator('body').evaluate(body => {
    const document = body.ownerDocument;
    const start = new document.defaultView.Event('touchstart', { bubbles: true });
    Object.defineProperty(start, 'touches', { value: [{ clientY: 20 }] });
    document.dispatchEvent(start);
    const end = new document.defaultView.Event('touchend', { bubbles: true });
    Object.defineProperty(end, 'changedTouches', { value: [{ clientY: 160 }] });
    document.dispatchEvent(end);
  });
  await current(1);
  check(true, 'Backward touch navigation synchronizes');
  await page.getByRole('button', { name: 'Next slide', exact: true }).click();
  await current(2);
  check(true, 'Private navigation follows the deck state');
  await frame.locator('body').evaluate(body => body.querySelector('.slide').remove());
  await page.waitForFunction(() => document.getElementById('reader').dataset.stale === 'true');
  check((await page.locator('#status').textContent()).includes('Synchronization failed'),
    'A changed slide count hides the script');
  await audience.reload();
  await current(1);
  check(true, 'Audience refresh reconnects at Slide 1');
  await audience.close();
  await page.waitForFunction(() => document.getElementById('reader').dataset.stale === 'true');
  audience = await open();
  check(true, 'Audience close and reopen restores synchronization');
  await audience.close();
  await page.getByRole('button', { name: 'Change files', exact: true }).click();
  await load(deck, script.replace('## Slide 4', '## Slide 9'));
  check(await page.locator('#open').isDisabled() && (await page.locator('#status').textContent()).includes('Expected Slide 4'),
    'Invalid numbering prevents audience launch');
  await load(deck, script.replace('## Slide 4 — The next owner receives the context, not just the code',
    '## Slide 4 - Wrong title'));
  check(await page.locator('#open').isDisabled() && (await page.locator('#status').textContent()).includes('different title'),
    'Mismatched titles prevent audience launch');
  await load(deck, script.slice(0, script.indexOf('## Slide 7')));
  check(await page.locator('#open').isDisabled() && (await page.locator('#status').textContent()).includes('7 slides'),
    'Missing sections prevent audience launch');
  await load(deck.replace('</head>', '<link rel="stylesheet" href="missing.css"></head>'));
  check(await page.locator('#open').isDisabled() && (await page.locator('#status').textContent()).includes('resources'),
    'External resources prevent audience launch');
  await load('<!doctype html><html><body><h1>Not a deck</h1></body></html>');
  check(await page.locator('#open').isDisabled() && (await page.locator('#status').textContent()).includes('No .slide'),
    'Unsupported HTML prevents audience launch');
  await load();
  await page.evaluate(() => {
    const original = window.open;
    window.open = () => null;
    document.getElementById('open').click();
    window.open = original;
  });
  check((await page.locator('#status').textContent()).includes('browser blocked'), 'Blocked popups report an explicit error');
  audience = await open();
  await audience.locator('#audience').evaluate(frame => frame.remove());
  await page.waitForFunction(() => document.getElementById('reader').dataset.stale === 'true');
  check(true, 'Lost synchronization hides the script');
  await audience.close();
  check(failures.length === 0, `No browser errors: ${failures.join(', ')}`);
  return { passed: checks.length, typography, checks };
}
