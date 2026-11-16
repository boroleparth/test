import { useCallback, useEffect, useRef, useState } from 'react';
import ChatView from './components/ChatView.jsx';
import ProgressView from './components/ProgressView.jsx';
import NotesView from './components/NotesView.jsx';
import SettingsView from './components/SettingsView.jsx';
import { ChatIcon, NotesIcon, PlusIcon, ProgressIcon, SettingsIcon } from './components/Icons.jsx';
import {
  DEFAULT_LOG,
  loadConversations,
  loadLog,
  loadNotes,
  loadSettings,
  saveConversations,
  saveLog,
  saveNotes,
  saveSettings,
  uid,
} from './lib/storage.js';
import { chatWithFallback, usableProviders } from './lib/providers.js';
import { buildApiMessages, buildSystemPrompt, CONTINUE_PROMPT, extractTags, MODES } from './lib/prompts.js';

const TABS = [
  { id: 'chat', label: 'Chat', Icon: ChatIcon },
  { id: 'progress', label: 'Progress', Icon: ProgressIcon },
  { id: 'notes', label: 'Notes', Icon: NotesIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

const titleFrom = (text) => {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 48 ? t.slice(0, 45) + '…' : t;
};

/** Applies hidden tutor tags (topic / quiz result) from a reply to the learning log. */
function applyTags(log, tags, conversationId) {
  const next = { ...log, topics: { ...log.topics }, quizzes: [...log.quizzes], lastConversationId: conversationId };
  const now = Date.now();
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  for (const tag of tags) {
    const topic = clean(tag.topic);
    if (topic) {
      const key = Object.keys(next.topics).find((k) => k.toLowerCase() === topic.toLowerCase()) || topic;
      const prev = next.topics[key];
      next.topics[key] = prev
        ? { ...prev, lastSeen: now, count: prev.count + 1 }
        : { name: topic, firstSeen: now, lastSeen: now, count: 1 };
    }
    const q = tag.quiz;
    if (q && typeof q === 'object') {
      const total = Math.max(1, Math.min(10, Number(q.total) || 1));
      const correct = Math.max(0, Math.min(total, Number(q.correct) || 0));
      next.quizzes.push({ id: uid(), topic: clean(q.topic) || topic || 'General', correct, total, ts: now });
    }
  }
  next.quizzes = next.quizzes.slice(-500);
  return next;
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [conversations, setConversations] = useState(loadConversations);
  const [log, setLog] = useState(loadLog);
  const [notes, setNotes] = useState(loadNotes);
  const [tab, setTab] = useState('chat');
  const [activeId, setActiveId] = useState(() => loadLog().lastConversationId);
  const [draftMode, setDraftMode] = useState('explain'); // mode for a chat not started yet
  const [busy, setBusy] = useState(false);
  const [swWorker, setSwWorker] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const abortRef = useRef(null);
  const convRef = useRef(conversations);
  convRef.current = conversations;

  const active = conversations.find((c) => c.id === activeId) || null;
  const mode = active?.mode || draftMode;

  // ---- Persistence (debounced so streaming doesn't hammer storage) ----
  useEffect(() => void saveSettings(settings), [settings]);
  useEffect(() => void saveLog(log), [log]);
  useEffect(() => void saveNotes(notes), [notes]);
  useEffect(() => {
    const t = setTimeout(() => saveConversations(conversations), busy ? 800 : 0);
    return () => clearTimeout(t);
  }, [conversations, busy]);

  // ---- Theme + text size ----
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.style.fontSize = settings.fontSize + 'px';
    const dark =
      settings.theme === 'dark' || (settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f172a' : '#f8fafc');
  }, [settings.theme, settings.fontSize]);

  // ---- PWA: update banner + install prompt ----
  useEffect(() => {
    const onUpdate = (e) => setSwWorker(e.detail);
    const onInstallable = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('sw-update', onUpdate);
    window.addEventListener('beforeinstallprompt', onInstallable);
    return () => {
      window.removeEventListener('sw-update', onUpdate);
      window.removeEventListener('beforeinstallprompt', onInstallable);
    };
  }, []);

  const updateConv = useCallback((id, fn) => {
    setConversations((list) => list.map((c) => (c.id === id ? fn(c) : c)));
  }, []);
  const updateMsg = useCallback(
    (convId, msgId, patch) =>
      updateConv(convId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m)),
      })),
    [updateConv]
  );

  /** Asks the AI for the next assistant message in a conversation. */
  const runAssistant = useCallback(
    async (conv) => {
      const assistant = { id: uid(), role: 'assistant', content: '', ts: Date.now(), streaming: true };
      const history = conv.messages;
      updateConv(conv.id, (c) => ({ ...c, messages: [...c.messages, assistant], updatedAt: Date.now() }));

      const system = buildSystemPrompt({ settings, mode: conv.mode, notes, log });
      const apiMessages = buildApiMessages(system, history);
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);

      // Collect streamed text and update the screen at most once per animation frame.
      let text = '';
      let frame = 0;
      const flush = () => {
        frame = 0;
        updateMsg(conv.id, assistant.id, { content: text });
      };

      try {
        const result = await chatWithFallback(settings.providers, apiMessages, {
          temperature: settings.temperature,
          signal: controller.signal,
          onDelta: (d) => {
            text += d;
            if (!frame) frame = requestAnimationFrame(flush);
          },
          onSwitch: (msg) => updateMsg(conv.id, assistant.id, { notice: msg }),
        });
        cancelAnimationFrame(frame);
        const final = result.text || text;
        updateMsg(conv.id, assistant.id, {
          content: final,
          streaming: false,
          provider: `${result.provider.name} · ${result.provider.model}`,
          error: final.trim() ? undefined : 'The tutor sent an empty reply. Tap Retry.',
        });
        setLog((l) => applyTags(l, extractTags(final), conv.id));
      } catch (err) {
        cancelAnimationFrame(frame);
        const aborted = err.name === 'AbortError';
        updateMsg(conv.id, assistant.id, {
          content: text,
          streaming: false,
          error: aborted ? (text ? undefined : 'Stopped.') : err.message,
          stopped: aborted || undefined,
        });
        setLog((l) => ({ ...l, lastConversationId: conv.id }));
      } finally {
        abortRef.current = null;
        setBusy(false);
      }
    },
    [settings, notes, log, updateConv, updateMsg]
  );

  /** Sends a user message. Starts a new conversation if none is open. */
  const send = useCallback(
    (text, opts = {}) => {
      if (busy) return;
      const { forceMode } = opts;
      // conversationId: undefined = use the open lesson, null = force a new lesson.
      const targetId = opts.conversationId !== undefined ? opts.conversationId : activeId;
      const userMsg = { id: uid(), role: 'user', content: text, ts: Date.now() };
      let conv = targetId ? convRef.current.find((c) => c.id === targetId) : null;
      if (!conv) {
        conv = {
          id: uid(),
          title: titleFrom(text),
          mode: forceMode || draftMode,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
        };
        setConversations((list) => [conv, ...list]);
      }
      const updated = { ...conv, messages: [...conv.messages, userMsg], updatedAt: Date.now() };
      // Move the conversation to the top of the list.
      setConversations((list) => [updated, ...list.filter((c) => c.id !== conv.id)]);
      setActiveId(conv.id);
      setTab('chat');
      runAssistant(updated);
    },
    [busy, activeId, draftMode, runAssistant]
  );

  const retry = useCallback(() => {
    if (!active || busy) return;
    const msgs = [...active.messages];
    while (msgs.length && msgs[msgs.length - 1].role === 'assistant') msgs.pop();
    if (!msgs.length) return;
    const conv = { ...active, messages: msgs };
    updateConv(active.id, () => conv);
    runAssistant(conv);
  }, [active, busy, updateConv, runAssistant]);

  const setMode = (m) => {
    if (active) updateConv(active.id, (c) => ({ ...c, mode: m }));
    else setDraftMode(m);
  };

  const newChat = () => {
    if (busy) abortRef.current?.abort();
    setActiveId(null);
    setTab('chat');
  };

  const openConv = (id) => {
    setActiveId(id);
    setLog((l) => ({ ...l, lastConversationId: id }));
    setTab('chat');
  };

  const deleteConv = (id) => {
    setConversations((list) => list.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
    if (log.lastConversationId === id) setLog((l) => ({ ...l, lastConversationId: null }));
  };

  const practice = (topic) => {
    setActiveId(null);
    setDraftMode('quiz');
    send(`Quiz me on ${topic}. Focus on what I might have gotten wrong before.`, { conversationId: null, forceMode: 'quiz' });
  };

  const reloadAll = () => {
    setSettings(loadSettings());
    setConversations(loadConversations());
    setLog(loadLog());
    setNotes(loadNotes());
    setActiveId(null);
  };

  const hasProvider = usableProviders(settings.providers).length > 0;
  const headerTitle =
    tab === 'chat' ? active?.title || 'New lesson' : TABS.find((t) => t.id === tab).label;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-title">
          <h1>{headerTitle}</h1>
          {tab === 'chat' && <span className="badge">{MODES[mode].label}</span>}
        </div>
        {tab === 'chat' && (
          <button className="icon-btn" onClick={newChat} aria-label="New lesson">
            <PlusIcon />
          </button>
        )}
      </header>

      {swWorker && (
        <div className="update-banner" role="status">
          <span>A new version is ready.</span>
          <button className="btn btn-small btn-primary" onClick={() => swWorker.postMessage('SKIP_WAITING')}>
            Update
          </button>
        </div>
      )}

      <main className="content">
        {tab === 'chat' && (
          <ChatView
            conversation={active}
            mode={mode}
            setMode={setMode}
            onSend={send}
            onStop={() => abortRef.current?.abort()}
            busy={busy}
            onRetry={retry}
            hasProvider={hasProvider}
            goSettings={() => setTab('settings')}
          />
        )}
        {tab === 'progress' && (
          <ProgressView
            log={log}
            conversations={conversations}
            activeId={activeId}
            onOpen={openConv}
            onContinue={(id) => send(CONTINUE_PROMPT, { conversationId: id })}
            onNewChat={newChat}
            onDelete={deleteConv}
            onPractice={practice}
            onClearLog={() => setLog({ ...DEFAULT_LOG, lastConversationId: log.lastConversationId })}
          />
        )}
        {tab === 'notes' && <NotesView notes={notes} setNotes={setNotes} />}
        {tab === 'settings' && (
          <SettingsView
            settings={settings}
            setSettings={setSettings}
            onDataReplaced={reloadAll}
            installPrompt={installPrompt}
            onInstall={async () => {
              installPrompt.prompt();
              await installPrompt.userChoice;
              setInstallPrompt(null);
            }}
          />
        )}
      </main>

      <nav className="tabbar" aria-label="Main">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={'tab' + (tab === id ? ' active' : '')}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => setTab(id)}
          >
            <Icon />
            <span>{label}</span>
            {id === 'settings' && !hasProvider && <i className="dot" aria-label="needs setup" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
