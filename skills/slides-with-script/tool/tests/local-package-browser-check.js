async (page) => {
  if (!page.url().startsWith('file:')) throw new Error('Open a generated ready entry through a local file URL.');
  const checks = [];
  const failures = [];
  const network = [];
  page.on('pageerror', error => failures.push(error.message));
  page.context().on('request', request => {
    if (/^https?:/.test(request.url())) network.push(request.url());
  });
  function check(value, message) {
    if (!value) throw new Error(message);
    checks.push(message);
  }
  async function current(number) {
    await page.waitForFunction(number => document.getElementById('current-script').dataset.slide === String(number) &&
      document.getElementById('reader').dataset.stale === 'false', number);
    // The source deck locks navigation for 600 ms.
    await page.waitForTimeout(650);
  }
  await page.waitForFunction(() => document.getElementById('open')?.disabled === false);
  check((await page.locator('#status').textContent()).includes('Checked 7 slides') &&
    await page.locator('#setup').isHidden(), 'Local ready entry automatically validates seven slides');
  check(page.context().pages().length === 1, 'Local entry waits for the audience action');
  const pending = page.waitForEvent('popup');
  await page.locator('#open').click();
  const audience = await pending;
  audience.on('pageerror', error => failures.push(error.message));
  await current(1);
  check(audience.url().startsWith('file:') && await audience.title() === 'Presentation',
    'Audience popup runs from local files');
  const frame = audience.frameLocator('#audience');
  await frame.getByRole('button', { name: 'Go to slide 4', exact: true }).click();
  await current(4);
  check((await page.locator('.section').evaluateAll(elements => elements.map(element => element.dataset.slide))).join(',') === '3,4,5',
    'Local Slide 4 shows sections 3, 4, and 5');
  await audience.keyboard.press('ArrowLeft');
  await current(3);
  check((await page.locator('.section').evaluateAll(elements => elements.map(element => element.dataset.slide))).join(',') === '2,3,4',
    'Local backward navigation shows sections 2, 3, and 4');
  check(await audience.locator('#reader, #private-header, script[src="package-data.js"]').count() === 0 &&
    !await frame.locator('body').evaluate(body => body.textContent.includes('In our Angular-to-React migration,')),
    'Local audience contains no private script or controls');
  await audience.close();
  await page.waitForFunction(() => document.getElementById('reader').dataset.stale === 'true');
  check(network.length === 0, 'Local presentation needs no HTTP requests or server');
  check(failures.length === 0, `No local browser page errors: ${failures.join(', ')}`);
  return { passed: checks.length, checks };
}
