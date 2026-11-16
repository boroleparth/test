// Markdown -> safe HTML.
// AI output is untrusted text, so we:
//   1. escape any raw HTML the model writes (it is shown as text, not run),
//   2. highlight code with highlight.js (which escapes code),
//   3. run the result through DOMPurify as a final safety net.
import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import scss from 'highlight.js/lib/languages/scss';
import python from 'highlight.js/lib/languages/python';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import java from 'highlight.js/lib/languages/java';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import php from 'highlight.js/lib/languages/php';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import diff from 'highlight.js/lib/languages/diff';
import plaintext from 'highlight.js/lib/languages/plaintext';

Object.entries({
  javascript, typescript, xml, css, scss, python, json, bash, shell, sql, java, c, cpp, csharp, go, rust, php, yaml, markdown, diff, plaintext,
}).forEach(([name, lang]) => hljs.registerLanguage(name, lang));
hljs.registerAliases(['jsx', 'js', 'mjs'], { languageName: 'javascript' });
hljs.registerAliases(['tsx', 'ts'], { languageName: 'typescript' });
hljs.registerAliases(['html', 'svg', 'vue'], { languageName: 'xml' });
hljs.registerAliases(['sh', 'zsh', 'console', 'terminal'], { languageName: 'bash' });
hljs.registerAliases(['py'], { languageName: 'python' });

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const marked = new Marked({ gfm: true, breaks: true });
marked.use({
  renderer: {
    // Raw HTML in the model's answer is displayed as text, never rendered.
    html({ text }) {
      return escapeHtml(text);
    },
    code({ text, lang }) {
      const language = (lang || '').trim().split(/\s+/)[0].toLowerCase();
      let highlighted;
      if (language && hljs.getLanguage(language)) {
        highlighted = hljs.highlight(text, { language, ignoreIllegals: true }).value;
      } else {
        highlighted = escapeHtml(text);
      }
      const label = escapeHtml(language || 'code');
      return `<div class="codeblock"><div class="codeblock-bar"><span class="codeblock-lang">${label}</span><button type="button" class="copy-btn" aria-label="Copy code">Copy</button></div><pre><code class="hljs">${highlighted}</code></pre></div>`;
    },
  },
});

// Open links in a new tab safely, and allow only http(s)/mailto links.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    const href = node.getAttribute('href') || '';
    if (!/^(https?:|mailto:|#)/i.test(href)) node.removeAttribute('href');
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow');
  }
});

export function renderMarkdown(text) {
  const html = marked.parse(text || '');
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'textarea', 'select', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['style'],
  });
}
