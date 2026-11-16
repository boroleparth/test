import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Message from './Message.jsx';
import { MODES, MODE_KEYS } from '../lib/prompts.js';
import { SendIcon, StopIcon } from './Icons.jsx';

export default function ChatView({ conversation, mode, setMode, onSend, onStop, busy, onRetry, hasProvider, goSettings }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const stickToBottom = useRef(true);
  const messages = conversation?.messages || [];
  const last = messages[messages.length - 1];

  // Auto-scroll while the answer streams, unless the learner scrolled up to read.
  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (messages.length === 0) el.scrollTop = 0;
    else if (stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, last?.content, last?.error, last?.notice]);
  useEffect(() => {
    stickToBottom.current = true;
  }, [conversation?.id]);

  // Grow the text box with its content (up to a limit).
  useLayoutEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [text]);

  const submit = (value = text) => {
    const v = value.trim();
    if (!v || busy) return;
    stickToBottom.current = true;
    onSend(v);
    setText('');
  };

  const onKeyDown = (e) => {
    // Enter sends on desktop; on phones Enter makes a new line (use the send button).
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (e.key === 'Enter' && !e.shiftKey && !coarse && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const m = MODES[mode];

  return (
    <div className="chat">
      <div className="modes" role="tablist" aria-label="Tutor mode">
        {MODE_KEYS.map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={k === mode}
            className={'chip' + (k === mode ? ' active' : '')}
            onClick={() => setMode(k)}
          >
            <span aria-hidden="true">{MODES[k].icon}</span> {MODES[k].label}
          </button>
        ))}
      </div>

      <div className="messages" ref={listRef} onScroll={onScroll} aria-live="polite">
        {messages.length === 0 ? (
          <div className="empty">
            <h2>
              {m.icon} {m.label}
            </h2>
            {!hasProvider && (
              <div className="setup-card">
                <p>
                  <strong>First, connect a free AI provider.</strong> It takes about 2 minutes and needs no credit card.
                </p>
                <button className="btn btn-primary" onClick={goSettings}>
                  Set up in Settings
                </button>
              </div>
            )}
            <p className="muted">Try one of these, or type your own:</p>
            <div className="starters">
              {m.starters.map((s) => (
                <button key={s} className="starter" onClick={() => submit(s)} disabled={busy}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <Message key={msg.id} message={msg} isLast={i === messages.length - 1} onRetry={busy ? null : onRetry} />
          ))
        )}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-input"
          ref={inputRef}
          rows={1}
          value={text}
          placeholder={m.hint}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          enterKeyHint="enter"
          autoComplete="off"
          spellCheck="true"
        />
        {busy ? (
          <button type="button" className="send-btn stop" onClick={onStop} aria-label="Stop answer">
            <StopIcon />
          </button>
        ) : (
          <button type="submit" className="send-btn" disabled={!text.trim()} aria-label="Send">
            <SendIcon />
          </button>
        )}
      </form>
    </div>
  );
}
