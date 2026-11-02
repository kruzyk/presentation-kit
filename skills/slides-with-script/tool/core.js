(function () {
  'use strict';

  function parseScript(source) {
    if (typeof source !== 'string') throw new Error('The script must contain text.');
    const headings = [...source.matchAll(/^## Slide ([1-9]\d*) (?:—|–|-|:) (.+)\r?$/gm)];
    if (!headings.length) {
      throw new Error('No slide sections found. Use: ## Slide 1 - Title');
    }
    const sections = headings.map((heading, index) => {
      const number = Number(heading[1]);
      if (number !== index + 1) {
        throw new Error(`Expected Slide ${index + 1}. Found Slide ${number}. Use consecutive sections in slide order.`);
      }
      const markdown = source.slice(heading.index + heading[0].length, headings[index + 1]?.index ?? source.length);
      if (!markdown.replace(/^\s*---\s*$/gm, '').trim()) {
        throw new Error(`Slide ${number} has no script text.`);
      }
      return { number, title: heading[2].trim(), markdown };
    });
    const otherHeadings = [...source.matchAll(/^##\s+.*$/gm)];
    if (otherHeadings.length !== headings.length) {
      throw new Error('An invalid section heading exists. Use only: ## Slide N - Title');
    }
    return sections;
  }

  function normalizeTitle(title) {
    return title.replace(/\s+/g, ' ').trim();
  }

  function parsePackage(data) {
    if (!data || typeof data !== 'object' || data.version !== 1 ||
        typeof data.deck !== 'string' || !data.deck.trim() ||
        typeof data.script !== 'string' || !data.script.trim()) {
      throw new Error('The presentation package is missing or invalid. Rebuild the package or select both files manually.');
    }
    return { deck: data.deck, script: data.script };
  }

  function validateMapping(sections, titles) {
    if (sections.length !== titles.length) {
      throw new Error(`The deck has ${titles.length} slides. The script has ${sections.length} sections.`);
    }
    titles.forEach((title, index) => {
      if (!title || normalizeTitle(title) !== normalizeTitle(sections[index].title)) {
        throw new Error(`Slide ${index + 1} has a different title. Check the deck and script mapping.`);
      }
    });
  }

  function escapeHTML(text) {
    return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function renderMarkdown(markdown) {
    return markdown.trim().split(/\r?\n\s*\r?\n/).filter(block => !/^\s*---\s*$/.test(block)).map(block => {
      const text = escapeHTML(block).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>').replace(/\r?\n/g, '<br>\n');
      return `<p>${text}</p>`;
    }).join('');
  }

  function neighbours(sections, index) {
    if (!Number.isInteger(index) || index < 0 || index >= sections.length) {
      throw new Error('The slide number is outside the script.');
    }
    return [sections[index - 1] ?? null, sections[index], sections[index + 1] ?? null];
  }

  globalThis.SlidesWithScript = Object.freeze({ parseScript, parsePackage, validateMapping, normalizeTitle, renderMarkdown, neighbours });
})();
