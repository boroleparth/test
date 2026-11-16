import { useRef } from 'react';
import { PlusIcon, TrashIcon } from './Icons.jsx';
import { uid } from '../lib/storage.js';

const MAX_NOTE = 4000; // characters of each note sent to the tutor

export default function NotesView({ notes, setNotes }) {
  const fileRef = useRef(null);
  const update = (id, patch) =>
    setNotes(notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)));
  const add = (title = '', content = '') =>
    setNotes([{ id: uid(), title, content, enabled: true, updatedAt: Date.now() }, ...notes]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 200_000) return alert('That file is too large (max 200 KB).');
    add(file.name.replace(/\.[^.]+$/, ''), await file.text());
  };

  const activeCount = notes.filter((n) => n.enabled && n.content.trim()).length;

  return (
    <div className="page">
      <section className="card">
        <h2>My notes</h2>
        <p className="muted">
          Paste your notes, a course syllabus or a list of topics. Notes switched <strong>on</strong> are sent to the
          tutor with every message, so it can follow your plan.
        </p>
        <p className="warn small">Notes go to your AI provider — don’t paste passwords or private info.</p>
        <div className="row">
          <button className="btn btn-primary grow" onClick={() => add()}>
            <PlusIcon size={20} /> New note
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Import .txt/.md
          </button>
          <input ref={fileRef} type="file" accept=".txt,.md,text/plain,text/markdown" hidden onChange={onFile} />
        </div>
        <p className="muted small">{activeCount} note(s) in use.</p>
      </section>

      {notes.map((n) => (
        <section key={n.id} className="card note">
          <div className="row">
            <input
              className="input grow"
              value={n.title}
              placeholder="Title (e.g. My JS course plan)"
              aria-label="Note title"
              onChange={(e) => update(n.id, { title: e.target.value })}
            />
            <button
              className="icon-btn"
              aria-label="Delete note"
              onClick={() => confirm('Delete this note?') && setNotes(notes.filter((x) => x.id !== n.id))}
            >
              <TrashIcon size={20} />
            </button>
          </div>
          <textarea
            className="input note-text"
            value={n.content}
            rows={6}
            placeholder={'e.g.\n- Week 1: HTML structure\n- Week 2: CSS layout (flexbox, grid)\n- Week 3: JS functions'}
            aria-label="Note text"
            onChange={(e) => update(n.id, { content: e.target.value })}
          />
          <div className="row between">
            <label className="switch">
              <input type="checkbox" checked={n.enabled} onChange={(e) => update(n.id, { enabled: e.target.checked })} />
              <span>Use in chat</span>
            </label>
            <span className={'small ' + (n.content.length > MAX_NOTE ? 'warn' : 'muted')}>
              {n.content.length > MAX_NOTE
                ? `Only first ${MAX_NOTE} chars used`
                : `${n.content.length}/${MAX_NOTE}`}
            </span>
          </div>
        </section>
      ))}
    </div>
  );
}
