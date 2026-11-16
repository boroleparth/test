// Everything the app remembers lives in localStorage on this device.
// Nothing is sent anywhere except the chat messages you send to your AI provider.

import { DEFAULT_PROVIDERS } from './providers.js';

const KEYS = {
  settings: 'tutor.settings.v1',
  conversations: 'tutor.conversations.v1',
  log: 'tutor.log.v1',
  notes: 'tutor.notes.v1',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('Could not save', key, err);
    return false;
  }
}

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

// ---------- Settings ----------
export const DEFAULT_SETTINGS = {
  providers: DEFAULT_PROVIDERS,
  theme: 'dark', // 'dark' | 'light' | 'system'
  level: 'beginner-intermediate',
  goals: 'Build real apps and websites, and understand the computer science behind them.',
  answerLength: 'short', // 'short' | 'detailed'
  customInstructions: '', // the learner's own rules for the tutor
  temperature: 0.6,
  fontSize: 16,
};

export function loadSettings() {
  const saved = read(KEYS.settings, null);
  if (!saved) return structuredClone(DEFAULT_SETTINGS);
  // Merge so new settings fields appear after an update; keep the user's provider list.
  const merged = { ...structuredClone(DEFAULT_SETTINGS), ...saved };
  // Add any built-in provider that is missing from an older saved list.
  for (const p of DEFAULT_PROVIDERS) {
    if (!merged.providers.some((x) => x.id === p.id)) merged.providers.push(structuredClone(p));
  }
  return merged;
}
export const saveSettings = (s) => write(KEYS.settings, s);

// ---------- Conversations ----------
// { id, title, mode, createdAt, updatedAt, messages: [{ id, role, content, ts, provider?, error? }] }
export const loadConversations = () => read(KEYS.conversations, []);
export const saveConversations = (list) => write(KEYS.conversations, list);

// ---------- Learning log ----------
// topics: { [name]: { name, firstSeen, lastSeen, count } }
// quizzes: [{ id, topic, correct, total, ts }]
export const DEFAULT_LOG = { topics: {}, quizzes: [], lastConversationId: null };
export const loadLog = () => ({ ...DEFAULT_LOG, ...read(KEYS.log, {}) });
export const saveLog = (log) => write(KEYS.log, log);

// ---------- Notes ----------
// [{ id, title, content, enabled, updatedAt }]
export const loadNotes = () => read(KEYS.notes, []);
export const saveNotes = (notes) => write(KEYS.notes, notes);

// ---------- Backup ----------
export function exportAll({ includeKeys }) {
  const settings = loadSettings();
  if (!includeKeys) {
    settings.providers = settings.providers.map((p) => ({ ...p, apiKey: '' }));
  }
  return {
    app: 'cs-tutor',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    conversations: loadConversations(),
    log: loadLog(),
    notes: loadNotes(),
  };
}

/** Throws a readable error if the object is not a valid backup. */
export function validateBackup(data) {
  if (!data || typeof data !== 'object' || data.app !== 'cs-tutor') {
    throw new Error('This file is not a CS Tutor backup.');
  }
  if (!Array.isArray(data.conversations) || !Array.isArray(data.notes) || typeof data.log !== 'object') {
    throw new Error('The backup file is missing data or is damaged.');
  }
}

/** Validates a backup object and writes it to storage. */
export function importAll(data) {
  validateBackup(data);
  const current = loadSettings();
  const incoming = data.settings && typeof data.settings === 'object' ? data.settings : {};
  // Keep keys already on this device if the backup was exported without them.
  const providers = Array.isArray(incoming.providers)
    ? incoming.providers.map((p) => {
        const existing = current.providers.find((x) => x.id === p.id);
        return { ...p, apiKey: p.apiKey || existing?.apiKey || '' };
      })
    : current.providers;
  saveSettings({ ...current, ...incoming, providers });
  saveConversations(data.conversations);
  saveLog({ ...DEFAULT_LOG, ...data.log });
  saveNotes(data.notes);
}

export function clearAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
