import { memo, useMemo } from 'react';
import { renderMarkdown } from '../lib/markdown.js';
import { stripTags } from '../lib/prompts.js';
import { CopyIcon, RetryIcon } from './Icons.jsx';

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / non-secure contexts.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

function flash(button, label) {
  const old = button.textContent;
  button.textContent = label;
  button.classList.add('done');
  setTimeout(() => {
    button.textContent = old;
    button.classList.remove('done');
  }, 1500);
}

// One click handler for all "Copy" / "Run" buttons inside rendered markdown (no inline handlers).
async function onMarkdownClick(e, onRunCode) {
  const btn = e.target.closest('.copy-btn, .run-btn');
  if (!btn) return;
  const code = btn.closest('.codeblock')?.querySelector('code');
  if (!code) return;
  if (btn.classList.contains('run-btn')) {
    onRunCode?.(btn.dataset.lang, code.textContent);
    return;
  }
  flash(btn, (await copyText(code.textContent)) ? 'Copied!' : 'Failed');
}

function Message({ message, onRetry, isLast, onRunCode }) {
  const { role, content, streaming, error, notice, provider } = message;
  const visible = role === 'assistant' ? stripTags(content) : content;
  const html = useMemo(() => (role === 'assistant' ? renderMarkdown(visible) : ''), [role, visible]);

  if (role === 'user') {
    return (
      <div className="msg msg-user">
        <div className="bubble">{content}</div>
      </div>
    );
  }

  return (
    <div className="msg msg-assistant">
      {notice && <div className="notice" role="status">{notice}</div>}
      {visible ? (
        <div className="markdown" onClick={(e) => onMarkdownClick(e, onRunCode)} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        streaming && (
          <div className="typing" aria-label="Tutor is typing">
            <span />
            <span />
            <span />
          </div>
        )
      )}
      {error && (
        <div className="error-box" role="alert">
          <p>{error}</p>
          {isLast && onRetry && (
            <button className="btn btn-small" onClick={onRetry}>
              <RetryIcon size={18} /> Retry
            </button>
          )}
        </div>
      )}
      {!streaming && visible && (
        <div className="msg-meta">
          {provider && <span>{provider}</span>}
          <button
            className="icon-btn small"
            aria-label="Copy answer"
            onClick={async (e) => flash(e.currentTarget.querySelector('.lbl'), (await copyText(visible)) ? '✓' : '✗')}
          >
            <CopyIcon size={16} />
            <span className="lbl" />
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(Message);
