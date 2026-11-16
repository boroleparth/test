import { useRef, useState } from 'react';
import { listModels, streamChat, usableProviders } from '../lib/providers.js';
import { exportAll, importAll, clearAll } from '../lib/storage.js';
import { DownIcon, EyeIcon, UpIcon } from './Icons.jsx';

const KEY_STEPS = {
  gemini: [
    'Open Google AI Studio (link below) and sign in with a Google account.',
    'Tap “Create API key”. If asked, let it create a new project.',
    'Copy the key (starts with “AIza…”) and paste it here.',
    'Free tier: no credit card. Limits are per minute and per day.',
  ],
  groq: [
    'Open the Groq console (link below) and sign up (Google/GitHub/email).',
    'Go to “API Keys” → “Create API Key”, give it a name.',
    'Copy the key (starts with “gsk_”) — it is shown only once — and paste it here.',
    'Free tier: no credit card. Very fast; daily limits per model.',
  ],
  openrouter: [
    'Open OpenRouter (link below) and sign up.',
    'Go to Settings → Keys → “Create Key”.',
    'Copy the key (starts with “sk-or-”) and paste it here.',
    'Only use models ending in “:free”. Free models have small daily limits.',
  ],
  custom: ['Any OpenAI-compatible endpoint. Base URL is the part before /chat/completions.'],
};

function ProviderCard({ p, index, count, onChange, onMove, temperature }) {
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState([]);
  const [status, setStatus] = useState(null); // { ok, text }
  const [loading, setLoading] = useState('');
  const set = (patch) => onChange({ ...p, ...patch });
  const ready = usableProviders([p]).length === 1;

  const loadModels = async () => {
    setLoading('models');
    setStatus(null);
    try {
      const ids = await listModels(p);
      setModels(ids);
      setStatus({ ok: true, text: `Found ${ids.length} models. Pick one from the list in the Model box.` });
    } catch (err) {
      setStatus({ ok: false, text: err.message });
    } finally {
      setLoading('');
    }
  };

  const test = async () => {
    setLoading('test');
    setStatus(null);
    try {
      const reply = await streamChat(p, [{ role: 'user', content: 'Reply with just: OK' }], { temperature });
      setStatus({ ok: true, text: `Works! Reply: “${reply.trim().slice(0, 60)}”` });
    } catch (err) {
      setStatus({ ok: false, text: err.message });
    } finally {
      setLoading('');
    }
  };

  const listId = `models-${p.id}`;
  const options = [...new Set([...(p.suggestions || []), ...models])];

  return (
    <div className={'provider' + (p.enabled ? '' : ' off')}>
      <div className="row between">
        <div>
          <strong>
            {index + 1}. {p.name}
          </strong>
          <div className="small muted">{ready ? '✓ Ready' : p.enabled ? 'Needs a key' : 'Off'}</div>
        </div>
        <div className="row tight">
          <button className="icon-btn" aria-label={`Move ${p.name} up`} disabled={index === 0} onClick={() => onMove(-1)}>
            <UpIcon size={20} />
          </button>
          <button
            className="icon-btn"
            aria-label={`Move ${p.name} down`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <DownIcon size={20} />
          </button>
          <label className="switch" aria-label={`Use ${p.name}`}>
            <input type="checkbox" checked={p.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          </label>
        </div>
      </div>

      <details className="howto">
        <summary>How to get a free key</summary>
        <ol>
          {KEY_STEPS[p.id]?.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        {p.keyUrl && (
          <a className="btn btn-small" href={p.keyUrl} target="_blank" rel="noopener noreferrer">
            Open key page ↗
          </a>
        )}
      </details>

      <label className="field">
        <span>API key</span>
        <div className="row tight">
          <input
            className="input grow mono"
            type={showKey ? 'text' : 'password'}
            value={p.apiKey}
            placeholder="Paste your key"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
            onChange={(e) => set({ apiKey: e.target.value.trim() })}
          />
          <button
            type="button"
            className="icon-btn"
            aria-label={showKey ? 'Hide key' : 'Show key'}
            aria-pressed={showKey}
            onClick={() => setShowKey(!showKey)}
          >
            <EyeIcon size={20} />
          </button>
        </div>
      </label>

      <label className="field">
        <span>Model</span>
        <input
          className="input mono"
          list={listId}
          value={p.model}
          placeholder="model id"
          autoCapitalize="off"
          spellCheck="false"
          onChange={(e) => set({ model: e.target.value })}
        />
        <datalist id={listId}>
          {options.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </label>
      {models.length > 0 && (
        <label className="field">
          <span>Available models</span>
          <select className="input" value={models.includes(p.model) ? p.model : ''} onChange={(e) => set({ model: e.target.value })}>
            <option value="">Choose…</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      )}

      <details className="howto" open={p.id === 'custom'}>
        <summary>Advanced: base URL</summary>
        <input
          className="input mono"
          value={p.baseUrl}
          placeholder="https://…/v1"
          aria-label="Base URL"
          autoCapitalize="off"
          spellCheck="false"
          onChange={(e) => set({ baseUrl: e.target.value.trim() })}
        />
      </details>

      <div className="row">
        <button className="btn grow" disabled={!p.apiKey || !p.baseUrl || !!loading} onClick={loadModels}>
          {loading === 'models' ? 'Loading…' : 'Load models'}
        </button>
        <button className="btn grow" disabled={!ready || !!loading} onClick={test}>
          {loading === 'test' ? 'Testing…' : 'Test'}
        </button>
      </div>
      {status && (
        <p className={'small ' + (status.ok ? 'ok' : 'warn')} role="status">
          {status.text}
        </p>
      )}
    </div>
  );
}

export default function SettingsView({ settings, setSettings, onDataReplaced, installPrompt, onInstall }) {
  const fileRef = useRef(null);
  const [includeKeys, setIncludeKeys] = useState(false);
  const set = (patch) => setSettings({ ...settings, ...patch });
  const providers = settings.providers;

  const changeProvider = (i, p) => set({ providers: providers.map((x, j) => (j === i ? p : x)) });
  const move = (i, dir) => {
    const list = [...providers];
    const j = i + dir;
    [list[i], list[j]] = [list[j], list[i]];
    set({ providers: list });
  };

  const doExport = () => {
    const data = exportAll({ includeKeys });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cs-tutor-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const doImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > 20_000_000) throw new Error('File is too large.');
      const data = JSON.parse(await file.text());
      if (!confirm('Replace all data on this device with this backup?')) return;
      importAll(data);
      onDataReplaced();
      alert('Backup restored.');
    } catch (err) {
      alert('Import failed: ' + (err instanceof SyntaxError ? 'not a valid JSON file.' : err.message));
    }
  };

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  return (
    <div className="page">
      <section className="card warning-card" role="note">
        <strong>⚠️ Privacy</strong>
        <p>
          Free AI tiers may log and use your messages to improve their models. Don’t paste passwords, API keys, personal
          details or private code. Your keys and data are stored only on this device.
        </p>
      </section>

      {!standalone && (
        <section className="card">
          <h2>Install on your phone</h2>
          {installPrompt ? (
            <button className="btn btn-primary full" onClick={onInstall}>
              Install CS Tutor
            </button>
          ) : isIos ? (
            <p className="muted">In Safari, tap the Share button, then “Add to Home Screen”.</p>
          ) : (
            <p className="muted">In Chrome, open the ⋮ menu and choose “Install app” or “Add to Home screen”.</p>
          )}
        </section>
      )}

      <section className="card">
        <h2>AI providers</h2>
        <p className="muted">
          Set up at least one. If a provider hits its free limit, the tutor automatically tries the next one in this
          order. Gemini is a good first choice.
        </p>
        {providers.map((p, i) => (
          <ProviderCard
            key={p.id}
            p={p}
            index={i}
            count={providers.length}
            temperature={settings.temperature}
            onChange={(np) => changeProvider(i, np)}
            onMove={(dir) => move(i, dir)}
          />
        ))}
      </section>

      <section className="card">
        <h2>About you</h2>
        <label className="field">
          <span>Your level</span>
          <select className="input" value={settings.level} onChange={(e) => set({ level: e.target.value })}>
            <option value="complete beginner">Complete beginner</option>
            <option value="beginner-intermediate">Beginner → intermediate</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label className="field">
          <span>Your goals</span>
          <textarea
            className="input"
            rows={3}
            value={settings.goals}
            onChange={(e) => set({ goals: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Answer length</span>
          <select className="input" value={settings.answerLength} onChange={(e) => set({ answerLength: e.target.value })}>
            <option value="short">Short (recommended)</option>
            <option value="detailed">Detailed</option>
          </select>
        </label>
      </section>

      <section className="card">
        <h2>Appearance</h2>
        <label className="field">
          <span>Theme</span>
          <select className="input" value={settings.theme} onChange={(e) => set({ theme: e.target.value })}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">Same as phone</option>
          </select>
        </label>
        <label className="field">
          <span>Text size: {settings.fontSize}px</span>
          <input
            type="range"
            min="14"
            max="20"
            step="1"
            value={settings.fontSize}
            onChange={(e) => set({ fontSize: Number(e.target.value) })}
          />
        </label>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="muted">Save all lessons, notes, progress and settings to a JSON file, or restore one.</p>
        <label className="switch">
          <input type="checkbox" checked={includeKeys} onChange={(e) => setIncludeKeys(e.target.checked)} />
          <span>Include API keys in the export (keep that file private!)</span>
        </label>
        <div className="row">
          <button className="btn grow" onClick={doExport}>
            Export
          </button>
          <button className="btn grow" onClick={() => fileRef.current?.click()}>
            Import
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={doImport} />
        </div>
        <button
          className="btn btn-ghost danger full"
          onClick={() => {
            if (confirm('Delete ALL data on this device (lessons, notes, progress, keys)? This cannot be undone.')) {
              clearAll();
              onDataReplaced();
            }
          }}
        >
          Delete all data
        </button>
      </section>

      <p className="muted small center">CS Tutor · everything stays on this device.</p>
    </div>
  );
}
