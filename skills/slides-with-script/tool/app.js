(function () {
  'use strict';
  const core = globalThis.SlidesWithScript;
  const byId = id => document.getElementById(id);
  const role = location.hash.match(/^#audience=([a-f0-9]{32})$/);
  const protocol = 'slides-with-script-v1';

  // This function runs inside the deck. It receives no speaker text.
  function deckBridge(token, protocol) {
    const slides = [...document.querySelectorAll('.slide')];
    let queued = false;
    function report() {
      queued = false;
      const count = document.querySelectorAll('.slide').length;
      const active = slides.map((slide, index) => ({ slide, index })).filter(item => item.slide.classList.contains('active'));
      let index = -1;
      if (count !== slides.length || active.length > 1) {
        parent.postMessage({ protocol, token, type: 'state', index, count }, '*');
        return;
      } else if (active.length === 1) {
        index = active[0].index;
      } else {
        let best = 0.5;
        slides.forEach((slide, candidate) => {
          const style = getComputedStyle(slide);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return;
          const rect = slide.getBoundingClientRect();
          const width = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
          const height = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
          const area = Math.min(rect.width, innerWidth) * Math.min(rect.height, innerHeight);
          const fraction = area > 0 ? width * height / area : 0;
          if (fraction > best) { best = fraction; index = candidate; }
        });
      }
      parent.postMessage({ protocol, token, type: 'state', index, count }, '*');
    }
    function schedule() {
      if (!queued) { queued = true; requestAnimationFrame(report); }
    }
    addEventListener('scroll', schedule, true);
    addEventListener('resize', schedule);
    new MutationObserver(schedule).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    addEventListener('message', event => {
      if (event.source !== parent || event.data?.protocol !== protocol || event.data.token !== token) return;
      if (event.data.type === 'navigate' && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.data.key)) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: event.data.key, bubbles: true }));
        schedule();
      }
    });
    setInterval(report, 1000);
    schedule();
  }

  function instrument(html, token) {
    const bridge = `<script>(${deckBridge.toString()})(${JSON.stringify(token)},${JSON.stringify(protocol)});<\/script>`;
    const close = html.toLowerCase().lastIndexOf('</body>');
    return close < 0 ? html + bridge : html.slice(0, close) + bridge + html.slice(close);
  }

  if (role) {
    startAudience(role[1]);
    return;
  }
  if (location.pathname.endsWith('/audience.html')) return;

  let deck = '';
  let sections = [];
  let popup = null;
  let token = '';
  let index = 0;
  let lastState = 0;
  let generation = 0;
  let lastShown = -1;

  function status(message, error = false) {
    byId('status').textContent = message;
    byId('status').dataset.error = String(error);
  }
  function stale(message) {
    byId('reader').dataset.stale = 'true';
    byId('previous').disabled = true;
    byId('next').disabled = true;
    status(message, true);
  }
  function closeAudience() {
    if (popup && !popup.closed) popup.close();
    popup = null;
    lastState = 0;
    lastShown = -1;
  }
  function show(current) {
    core.neighbours(sections, current).forEach((section, offset) => {
      const element = byId(['previous-script', 'current-script', 'next-script'][offset]);
      element.replaceChildren();
      const position = document.createElement('span');
      position.className = 'position';
      position.textContent = ['Previous', 'Current', 'Next'][offset];
      element.append(position);
      if (!section) {
        const text = document.createElement('p');
        text.textContent = offset === 0 ? 'Start of presentation. No previous slide.' : 'End of presentation. No next slide.';
        element.append(text);
      } else {
        const heading = document.createElement('h2');
        heading.textContent = `Slide ${section.number} - ${section.title}`;
        element.append(heading);
        const content = document.createElement('div');
        content.innerHTML = core.renderMarkdown(section.markdown);
        element.append(content);
        element.dataset.slide = String(section.number);
      }
      if (!section) delete element.dataset.slide;
      element.scrollTop = 0;
    });
    lastShown = current;
  }

  function resetInputs() {
    generation++;
    closeAudience();
    deck = '';
    sections = [];
    byId('open').disabled = true;
    byId('reader').hidden = true;
    byId('setup').hidden = false;
    byId('previous').disabled = byId('next').disabled = true;
    return generation;
  }

  function checkInputs(html, script) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const slides = [...parsed.querySelectorAll('.slide')];
    if (!slides.length) throw new Error('No .slide elements found. Select a supported HTML deck.');
    const externalCSS = [...html.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)]
      .some(match => !/^(?:data:|#)/i.test(match[2].trim()));
    if (parsed.querySelector('base, script[src], link[href]:not([href^="data:"]):not([href^="#"]), img[src]:not([src^="data:"])') ||
        externalCSS || /(?:src|href)\s*=\s*['"](?:https?:|\/\/)/i.test(html)) {
      throw new Error('The deck has external or relative resources. Embed all resources before you load this deck.');
    }
    const titles = slides.map(slide => {
      const heading = slide.querySelector('h1, h2');
      if (!heading) return '';
      heading.querySelectorAll('br').forEach(br => br.replaceWith(' '));
      return heading.textContent;
    });
    const parsedSections = core.parseScript(script.replace(/^\uFEFF/, ''));
    core.validateMapping(parsedSections, titles);
    deck = html;
    sections = parsedSections;
    byId('open').disabled = false;
    status(`Checked ${sections.length} slides. Open the audience window.`);
  }

  byId('load').addEventListener('click', async () => {
    const request = resetInputs();
    const deckFile = byId('deck-file').files[0];
    const scriptFile = byId('script-file').files[0];
    if (!deckFile || !scriptFile) { status('Select both files before you continue.', true); return; }
    status('Checking files.');
    try {
      const buffers = await Promise.all([deckFile.arrayBuffer(), scriptFile.arrayBuffer()]);
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const [html, script] = buffers.map(buffer => decoder.decode(buffer));
      if (request !== generation) return;
      checkInputs(html, script);
    } catch (error) {
      if (request === generation) status(error.message, true);
    }
  });

  if (document.documentElement.hasAttribute('data-presentation-package')) {
    resetInputs();
    try {
      const data = core.parsePackage(globalThis.SlidesWithScriptPackage);
      checkInputs(data.deck, data.script);
      byId('setup').hidden = true;
    } catch (error) {
      status(error.message, true);
    }
    delete globalThis.SlidesWithScriptPackage;
  }

  byId('open').addEventListener('click', () => {
    if (!deck || !sections.length) return;
    if (popup && !popup.closed) { popup.focus(); return; }
    token = [...crypto.getRandomValues(new Uint8Array(16))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    const audienceURL = new URL('audience.html', location.href);
    audienceURL.hash = `audience=${token}`;
    popup = window.open(audienceURL.href, `audience-${token}`, 'popup,width=1280,height=800');
    if (!popup) { status('The browser blocked the audience window. Allow popups for this page.', true); return; }
    lastShown = -1;
    lastState = Date.now();
    byId('setup').hidden = true;
    byId('reader').hidden = false;
    stale('Waiting for the audience window. Do not read until synchronization starts.');
  });

  addEventListener('message', event => {
    const message = event.data;
    if (!popup || event.source !== popup || message?.protocol !== protocol || message.token !== token) return;
    if (message.type === 'ready') {
      popup.postMessage({ protocol, token, type: 'load', html: deck, expectedCount: sections.length }, '*');
    } else if (message.type === 'state') {
      lastState = Date.now();
      if (message.count !== sections.length || !Number.isInteger(message.index) || message.index < 0 || message.index >= sections.length) {
        stale('Synchronization failed. No single visible slide matches the script.');
        return;
      }
      index = message.index;
      if (lastShown !== index) show(index);
      byId('reader').dataset.stale = 'false';
      byId('previous').disabled = index === 0;
      byId('next').disabled = index === sections.length - 1;
      status(`Connected. Slide ${index + 1} of ${sections.length}. Share only the audience window.`);
    } else if (message.type === 'error') {
      stale(message.message);
    }
  });

  function navigate(key) {
    if (popup && !popup.closed && byId('reader').dataset.stale === 'false') {
      popup.postMessage({ protocol, token, type: 'navigate', key }, '*');
    }
  }
  byId('previous').addEventListener('click', () => navigate('ArrowLeft'));
  byId('next').addEventListener('click', () => navigate('ArrowRight'));
  byId('font-size').addEventListener('input', event => {
    byId('reader').style.setProperty('--script-size', `${event.target.value}px`);
  });
  byId('change').addEventListener('click', () => {
    generation++;
    closeAudience();
    byId('setup').hidden = false;
    byId('reader').hidden = true;
    byId('open').disabled = true;
    byId('previous').disabled = byId('next').disabled = true;
    deck = '';
    sections = [];
    status('Select files. Check the files before you open another audience window.');
  });
  setInterval(() => {
    if (!popup) return;
    if (popup.closed) {
      stale('The audience window is closed. Open it again to restart at Slide 1.');
      popup = null;
    } else if (Date.now() - lastState > 5000) {
      stale('Synchronization stopped. Keep both windows open. Check the audience window.');
    }
  }, 1000);
  addEventListener('beforeunload', closeAudience);

  function startAudience(sessionToken) {
    document.title = 'Presentation';
    document.body.replaceChildren();
    document.body.style.background = '#fff';
    const error = document.createElement('p');
    error.id = 'audience-error';
    error.setAttribute('role', 'alert');
    error.textContent = 'Waiting for the presentation.';
    document.body.append(error);
    if (!opener) {
      error.textContent = 'The private presenter window is missing. Open the presentation from that window.';
      return;
    }
    const controller = opener;
    const frame = document.createElement('iframe');
    frame.id = 'audience';
    frame.title = 'Audience deck';
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('allow', 'fullscreen');
    let loaded = false;
    let lastReport = Date.now();
    addEventListener('message', event => {
      const message = event.data;
      if (message?.protocol !== protocol || message.token !== sessionToken) return;
      if (event.source === controller) {
        if (message.type === 'load' && !loaded) {
          loaded = true;
          frame.srcdoc = instrument(message.html, sessionToken);
          document.body.replaceChildren(frame);
          frame.addEventListener('load', () => frame.focus(), { once: true });
        } else if (message.type === 'navigate') {
          frame.contentWindow.postMessage(message, '*');
        }
      } else if (event.source === frame.contentWindow && message.type === 'state') {
        lastReport = Date.now();
        controller.postMessage(message, '*');
      }
    });
    function ready() {
      controller.postMessage({ protocol, token: sessionToken, type: 'ready' }, '*');
    }
    ready();
    setInterval(() => {
      if (!loaded) ready();
      if (controller.closed) {
        document.body.replaceChildren(error);
        error.textContent = 'The private presenter window is closed. Restart the presentation.';
      } else if (Date.now() - lastReport > 5000) {
        controller.postMessage({ protocol, token: sessionToken, type: 'error', message: 'The deck did not report a visible slide. Check its navigation and script policy.' }, '*');
      }
    }, 1000);
  }
})();
