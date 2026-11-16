import { MODES } from '../lib/prompts.js';
import { PlusIcon, TrashIcon } from './Icons.jsx';

const timeAgo = (ts) => {
  if (!ts) return '';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(ts).toLocaleDateString();
};

export default function ProgressView({ log, conversations, activeId, onOpen, onContinue, onNewChat, onDelete, onPractice, onClearLog }) {
  const lastConv = conversations.find((c) => c.id === log.lastConversationId) || conversations[0];
  const topics = Object.values(log.topics || {}).sort((a, b) => b.lastSeen - a.lastSeen);
  const quizzes = log.quizzes || [];
  const correct = quizzes.reduce((s, q) => s + q.correct, 0);
  const total = quizzes.reduce((s, q) => s + q.total, 0);
  const pct = total ? Math.round((correct / total) * 100) : null;

  const quizByTopic = {};
  for (const q of quizzes) {
    const t = (quizByTopic[q.topic] ||= { c: 0, n: 0 });
    t.c += q.correct;
    t.n += q.total;
  }

  return (
    <div className="page">
      <section className="card continue-card">
        <h2>Continue where you left off</h2>
        {lastConv ? (
          <>
            <p className="muted">
              {MODES[lastConv.mode]?.icon} {lastConv.title} · {timeAgo(lastConv.updatedAt)}
            </p>
            <div className="row">
              <button className="btn btn-primary grow" onClick={() => onContinue(lastConv.id)}>
                Recap &amp; continue
              </button>
              <button className="btn" onClick={() => onOpen(lastConv.id)}>
                Open
              </button>
            </div>
          </>
        ) : (
          <p className="muted">Nothing yet — start your first lesson!</p>
        )}
        <button className="btn btn-ghost full" onClick={onNewChat}>
          <PlusIcon size={20} /> New lesson
        </button>
      </section>

      <section className="stats">
        <div className="stat">
          <strong>{topics.length}</strong>
          <span>topics</span>
        </div>
        <div className="stat">
          <strong>{total}</strong>
          <span>quiz answers</span>
        </div>
        <div className="stat">
          <strong>{pct == null ? '–' : pct + '%'}</strong>
          <span>correct</span>
        </div>
      </section>

      <section className="card">
        <h2>Topics covered</h2>
        {topics.length === 0 ? (
          <p className="muted">Topics appear here automatically as you learn.</p>
        ) : (
          <>
            <p className="muted small">Tap a topic to get quizzed on it.</p>
            <div className="topic-list">
              {topics.map((t) => {
                const q = quizByTopic[t.name];
                const score = q ? Math.round((q.c / q.n) * 100) : null;
                const cls = score == null ? '' : score >= 80 ? ' good' : score < 60 ? ' weak' : ' ok';
                return (
                  <button key={t.name} className={'topic' + cls} onClick={() => onPractice(t.name)}>
                    <span>{t.name}</span>
                    <small>{score == null ? `${t.count}×` : `${score}%`}</small>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {quizzes.length > 0 && (
        <section className="card">
          <h2>Recent quiz answers</h2>
          <ul className="quiz-list">
            {quizzes
              .slice(-10)
              .reverse()
              .map((q) => (
                <li key={q.id}>
                  <span className={q.correct >= q.total ? 'ok-dot' : 'bad-dot'} aria-hidden="true" />
                  <span className="grow">{q.topic}</span>
                  <span className="muted small">
                    {q.correct}/{q.total} · {timeAgo(q.ts)}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Lessons</h2>
        {conversations.length === 0 ? (
          <p className="muted">No lessons yet.</p>
        ) : (
          <ul className="conv-list">
            {conversations.map((c) => (
              <li key={c.id} className={c.id === activeId ? 'active' : ''}>
                <button className="conv-open" onClick={() => onOpen(c.id)}>
                  <span className="conv-title">
                    {MODES[c.mode]?.icon} {c.title}
                  </span>
                  <span className="muted small">
                    {c.messages.length} messages · {timeAgo(c.updatedAt)}
                  </span>
                </button>
                <button
                  className="icon-btn"
                  aria-label={`Delete lesson ${c.title}`}
                  onClick={() => confirm(`Delete "${c.title}"?`) && onDelete(c.id)}
                >
                  <TrashIcon size={20} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(topics.length > 0 || quizzes.length > 0) && (
        <button
          className="btn btn-ghost danger full"
          onClick={() => confirm('Clear topics and quiz results? Lessons are kept.') && onClearLog()}
        >
          Reset learning log
        </button>
      )}
    </div>
  );
}
