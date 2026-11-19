import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { buildDocument, STARTER } from '../lib/playground.js';

const PANES = [
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'js', label: 'JS' },
  { id: 'result', label: 'Result' },
];

// Symbols that are slow to reach on a phone keyboard.
const SYMBOLS = ['⇥', '{', '}', '(', ')', '[', ']', '<', '>', '/', '=', ';', ':', '"', "'", '`', '$', '.', ',', '+', '-', '*', '!', '&', '|', '_', '#'];

const MAX_LOGS = 300;

export default function PlaygroundView({ code, setCode, autoRun, onAutoRunDone, loadedNote, onUndoLoad, onAskTutor }) {
  const [pane, setPane] = useState('js');
  const [runId, setRunId] = useState(0); // 0 = not run yet in this visit
  const [logs, setLogs] = useState([]);
  const [runnerFailed, setRunnerFailed] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const editorRef = useRef(null);
  const frameRef = useRef(null);
  const pendingCursor = useRef(null);
  const codeRef = useRef(code);
  codeRef.current = code;

  const run = useCallback(() => {
    setLogs([]);
    setRunnerFailed(false);
    setRunId((n) => n + 1);
    setPane('result');
  }, []);

  // Code loaded from a chat "Run" button: run it once, straight away.
  useEffect(() => {
    if (autoRun) {
      run();
      onAutoRunDone();
    }
  }, [autoRun, run, onAutoRunDone]);

  // Talk to the sandboxed runner of the current run.
  useEffect(() => {
    if (!runId) return;
    const frame = frameRef.current;
    let ready = false;
    const onMessage = (e) => {
      if (!frame || e.source !== frame.contentWindow) return; // ignore everything else
      const d = e.data || {};
      if (d.type === 'runner-ready' && !ready) {
        ready = true;
        frame.contentWindow.postMessage({ type: 'run', doc: buildDocument(codeRef.current) }, '*');
      } else if (d.type === 'console' && typeof d.text === 'string') {
        const level = ['log', 'info', 'warn', 'error', 'debug'].includes(d.level) ? d.level : 'log';
        setLogs((l) => [...l.slice(-(MAX_LOGS - 1)), { id: Math.random(), level, text: d.text }]);
      } else if (d.type === 'console-clear') {
        setLogs([]);
      }
    };
    window.addEventListener('message', onMessage);
    const timer = setTimeout(() => !ready && setRunnerFailed(true), 6000);
    return () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
    };
  }, [runId]);

  // Put the cursor back where it belongs after inserting text.
  useLayoutEffect(() => {
    const pos = pendingCursor.current;
    const ta = editorRef.current;
    if (pos != null && ta) {
      ta.focus();
      ta.setSelectionRange(pos, pos);
      pendingCursor.current = null;
    }
  });

  const insert = (text) => {
    const ta = editorRef.current;
    if (!ta || pane === 'result') return;
    const { selectionStart: a, selectionEnd: b, value } = ta;
    setCode({ ...codeRef.current, [pane]: value.slice(0, a) + text + value.slice(b) });
    pendingCursor.current = a + text.length;
  };

  const onKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      run();
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      insert('  ');
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Auto-indent: keep the current line's indentation (+2 after an opening bracket).
      const ta = e.currentTarget;
      const before = ta.value.slice(0, ta.selectionStart);
      const line = before.slice(before.lastIndexOf('\n') + 1);
      const indent = line.match(/^\s*/)[0] + (/[{[(]\s*$/.test(line) ? '  ' : '');
      e.preventDefault();
      insert('\n' + indent);
    }
  };

  const errorCount = logs.filter((l) => l.level === 'error').length;
  const isEditor = pane !== 'result';

  return (
    <div className="playground">
      <div className="pg-tabs" role="tablist" aria-label="Playground">
        {PANES.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pane === p.id}
            className={'pg-tab' + (pane === p.id ? ' active' : '')}
            onClick={() => (p.id === 'result' && !runId ? run() : setPane(p.id))}
          >
            {p.label}
            {p.id !== 'result' && code[p.id].trim() && <i className="pg-dot" aria-hidden="true" />}
            {p.id === 'result' && errorCount > 0 && <span className="pg-badge">{errorCount}</span>}
          </button>
        ))}
      </div>

      {loadedNote && (
        <div className="pg-note" role="status">
          <span>{loadedNote}</span>
          <button className="btn btn-small btn-ghost" onClick={onUndoLoad}>
            Undo
          </button>
        </div>
      )}

      {isEditor ? (
        <>
          <label htmlFor="pg-editor" className="sr-only">
            {pane.toUpperCase()} code
          </label>
          <textarea
            id="pg-editor"
            key={pane}
            ref={editorRef}
            className="pg-editor"
            value={code[pane]}
            onChange={(e) => setCode({ ...codeRef.current, [pane]: e.target.value })}
            onKeyDown={onKeyDown}
            placeholder={pane === 'html' ? '<h1>Hello</h1>' : pane === 'css' ? 'h1 { color: tomato; }' : "console.log('Hello!');"}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            wrap="off"
            data-gramm="false"
          />
          <div className="pg-symbols" aria-label="Insert symbol">
            {SYMBOLS.map((s) => (
              <button
                key={s}
                type="button"
                className="pg-sym"
                aria-label={s === '⇥' ? 'Insert indent' : `Insert ${s}`}
                // pointerdown + preventDefault keeps the phone keyboard open
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => insert(s === '⇥' ? '  ' : s)}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="pg-result">
          <div className="pg-frame-wrap">
            {runId > 0 && (
              <iframe
                key={runId}
                ref={frameRef}
                className="pg-frame"
                title="Playground result"
                src="./runner.html"
                // allow-scripts WITHOUT allow-same-origin = your code runs as an anonymous
                // site and cannot read the app's storage (your API keys).
                sandbox="allow-scripts allow-modals allow-forms"
                referrerPolicy="no-referrer"
              />
            )}
            {runnerFailed && (
              <p className="pg-fail">Couldn’t start the playground. Check your connection and tap Run again.</p>
            )}
          </div>
          <div className={'pg-console' + (consoleOpen ? '' : ' closed')}>
            <div className="pg-console-bar">
              <button className="pg-console-toggle" aria-expanded={consoleOpen} onClick={() => setConsoleOpen(!consoleOpen)}>
                {consoleOpen ? '▾' : '▸'} Console {logs.length > 0 && <span className="muted">({logs.length})</span>}
              </button>
              <button className="btn btn-small btn-ghost" onClick={() => setLogs([])} disabled={!logs.length}>
                Clear
              </button>
            </div>
            {consoleOpen && (
              <div className="pg-logs" role="log" aria-live="polite">
                {logs.length === 0 ? (
                  <p className="muted small">Output from console.log() appears here.</p>
                ) : (
                  logs.map((l) => (
                    <div key={l.id} className={'pg-log ' + l.level}>
                      {l.text}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pg-actions">
        <button className="btn btn-primary grow" onClick={run}>
          ▶ Run
        </button>
        <button className="btn grow" onClick={() => onAskTutor(logs)} disabled={!code.html.trim() && !code.css.trim() && !code.js.trim()}>
          Ask tutor
        </button>
        <button
          className="btn"
          aria-label="Reset playground to the example"
          onClick={() => {
            if (confirm('Replace all playground code with the starter example?')) {
              setCode({ ...STARTER });
              setLogs([]);
              setRunId(0);
              setPane('js');
            }
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
