async (page) => {
  const base = new URL('/', page.url());
  const response = await page.request.get(new URL('skills/slides-web-neutral/template.html', base).href);
  if (!response.ok()) throw new Error('Neutral template request failed.');
  const deck = await response.text();
  const titles = ['A clear presentation', 'Explain the main idea', 'Choose the next action'];
  const script = titles.map((title, index) => `## Slide ${index + 1} - ${title}\n\nPRIVATE_NEUTRAL_NARRATION_${index + 1}\n`).join('\n');
  const checks = [];
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  function check(value, message) {
    if (!value) throw new Error(message);
    checks.push(message);
  }
  async function current(number) {
    await page.waitForFunction(number => document.getElementById('current-script').dataset.slide === String(number) &&
      document.getElementById('reader').dataset.stale === 'false', number);
  }
  await page.goto(new URL('skills/slides-with-script/tool/index.html', base).href);
  await page.locator('#deck-file').setInputFiles({ name: 'neutral.html', mimeType: 'text/html', buffer: Buffer.from(deck) });
  await page.locator('#script-file').setInputFiles({ name: 'script.md', mimeType: 'text/plain', buffer: Buffer.from(script) });
  await page.locator('#load').click();
  await page.waitForFunction(() => document.getElementById('open').disabled === false);
  check(true, 'Neutral template passes existing deck and script validation');
  const pending = page.waitForEvent('popup');
  await page.locator('#open').click();
  const audience = await pending;
  audience.on('pageerror', error => failures.push(error.message));
  try {
    await current(1);
    const frame = audience.frameLocator('#audience');
    check(await frame.locator('.slide.active').count() === 1 &&
      await frame.locator('.slide[hidden]').count() === 2, 'Exactly one neutral slide is active and visible');
    check(await page.locator('#previous').isDisabled(), 'First slide boundary stops backward navigation');
    await frame.getByRole('button', { name: 'Go to slide 2', exact: true }).click();
    await current(2);
    check((await page.locator('.section').evaluateAll(elements => elements.map(element => element.dataset.slide))).join(',') === '1,2,3',
      'Neutral Slide 2 shows previous, current, and next narration');
    await frame.getByRole('button', { name: 'Previous slide', exact: true }).click();
    await current(1);
    check(true, 'Deck button navigation updates the private script');
    await audience.keyboard.press('End');
    await current(3);
    check(await page.locator('#next').isDisabled(), 'End key reaches the final slide boundary');
    await audience.keyboard.press('Home');
    await current(1);
    check(true, 'Home key returns to the first slide');
    await audience.keyboard.press('ArrowRight');
    await current(2);
    await audience.keyboard.press('ArrowLeft');
    await current(1);
    check(true, 'Arrow-key navigation synchronizes in both directions');
    await page.locator('#next').click();
    await current(2);
    await page.locator('#previous').click();
    await current(1);
    check(true, 'Private navigation controls work with the neutral template');
    await frame.locator('body').evaluate(body => body.ownerDocument.dispatchEvent(
      new body.ownerDocument.defaultView.WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })));
    await current(2);
    check(true, 'Wheel navigation updates the private script');
    await page.waitForTimeout(360);
    await frame.locator('body').evaluate(body => {
      const document = body.ownerDocument;
      const start = new document.defaultView.Event('touchstart', { bubbles: true });
      Object.defineProperty(start, 'touches', { value: [{ clientX: 20 }] });
      document.dispatchEvent(start);
      const end = new document.defaultView.Event('touchend', { bubbles: true });
      Object.defineProperty(end, 'changedTouches', { value: [{ clientX: 160 }] });
      document.dispatchEvent(end);
    });
    await current(1);
    check(true, 'Horizontal touch gesture synchronizes backward');
    check(await audience.locator('#reader, #private-header').count() === 0 &&
      !await frame.locator('body').evaluate(body => body.textContent.includes('PRIVATE_NEUTRAL_NARRATION')),
      'Neutral audience receives no private narration or presenter controls');
    const resources = await frame.locator('body').evaluate(body =>
      body.ownerDocument.defaultView.performance.getEntriesByType('resource').map(entry => entry.name));
    check(resources.length === 0, 'Neutral deck requests no external resources');
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      await audience.setViewportSize(viewport);
      const layout = await frame.locator('body').evaluate(body => ({
        width: body.scrollWidth, viewport: body.ownerDocument.defaultView.innerWidth,
        nav: body.querySelector('nav').getBoundingClientRect().toJSON(),
      }));
      check(layout.width <= layout.viewport && layout.nav.left >= 0 && layout.nav.right <= layout.viewport,
        `Neutral deck and navigation fit a ${viewport.width}-pixel viewport`);
    }
    await audience.reload();
    await current(1);
    check(true, 'Audience reload reconnects the neutral deck');
  } finally {
    await audience.close();
  }
  check(failures.length === 0, `No neutral browser errors: ${failures.join(', ')}`);
  return { passed: checks.length, checks };
}
