// AI providers. All of them speak the OpenAI-compatible Chat Completions format,
// so switching provider only means a different base URL, key and model name.

export const DEFAULT_PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: '',
    // "-latest" aliases follow Google's current Flash model, so they survive model retirements.
    model: 'gemini-flash-latest',
    suggestions: ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    enabled: true,
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: '',
    model: 'openai/gpt-oss-120b',
    suggestions: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile'],
    enabled: true,
    keyUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (free models)',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    suggestions: ['meta-llama/llama-3.3-70b-instruct:free', 'deepseek/deepseek-chat-v3-0324:free', 'qwen/qwen3-coder:free'],
    enabled: true,
    keyUrl: 'https://openrouter.ai/settings/keys',
    freeOnly: true, // the model list only shows ":free" models
  },
  {
    id: 'custom',
    name: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    apiKey: '',
    model: '',
    suggestions: [],
    enabled: false,
    keyUrl: '',
  },
];

/** Providers that can actually be called, in the user's fallback order. */
export const usableProviders = (providers) =>
  providers.filter((p) => p.enabled && p.apiKey.trim() && p.baseUrl.trim() && p.model.trim());

export class ProviderError extends Error {
  constructor(message, { status = 0, kind = 'error', provider = '' } = {}) {
    super(message);
    this.status = status;
    this.kind = kind; // 'rate-limit' | 'auth' | 'model' | 'network' | 'server' | 'bad-request' | 'error'
    this.provider = provider;
  }
}

function headersFor(p) {
  const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${p.apiKey.trim()}` };
  if (p.id === 'openrouter') {
    h['X-Title'] = 'CS Tutor';
    h['HTTP-Referer'] = location.origin;
  }
  return h;
}

const endpoint = (p, path) => p.baseUrl.trim().replace(/\/+$/, '') + path;

/** Turns an HTTP error response into a short message a learner can act on. */
async function toProviderError(res, p) {
  let detail = '';
  try {
    const text = await res.text();
    try {
      const body = JSON.parse(text);
      const e = Array.isArray(body) ? body[0]?.error : body.error;
      detail = (typeof e === 'string' ? e : e?.message) || body.message || '';
    } catch {
      detail = text.slice(0, 200);
    }
  } catch {
    /* ignore */
  }
  const s = res.status;
  const low = detail.toLowerCase();
  let kind = 'error';
  let msg;
  if (s === 429 || low.includes('quota') || low.includes('rate limit') || low.includes('resource_exhausted')) {
    kind = 'rate-limit';
    msg = `${p.name}: free-tier rate limit or daily quota reached. Wait a minute, or add another provider as a fallback.`;
  } else if (s === 401 || s === 403) {
    kind = 'auth';
    msg = `${p.name}: the API key was rejected. Check it in Settings.`;
  } else if (s === 404 || low.includes('not found') || low.includes('does not exist')) {
    kind = 'model';
    msg = `${p.name}: model "${p.model}" was not found. In Settings, tap "Load models" and pick another.`;
  } else if (s === 402) {
    kind = 'rate-limit';
    msg = `${p.name}: this model needs credits. Choose a free model.`;
  } else if (s >= 500) {
    kind = 'server';
    msg = `${p.name} is having problems right now (HTTP ${s}).`;
  } else {
    kind = 'bad-request';
    msg = `${p.name}: request failed (HTTP ${s}).`;
  }
  if (detail) msg += ` Details: ${detail.slice(0, 240)}`;
  return new ProviderError(msg, { status: s, kind, provider: p.name });
}

/**
 * Streams one chat completion. Calls onDelta(textChunk) as text arrives.
 * Returns the full text.
 */
export async function streamChat(p, messages, { temperature = 0.6, signal, onDelta }) {
  let res;
  try {
    res = await fetch(endpoint(p, '/chat/completions'), {
      method: 'POST',
      headers: headersFor(p),
      body: JSON.stringify({ model: p.model.trim(), messages, temperature, stream: true }),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ProviderError(
      navigator.onLine === false
        ? 'You are offline. The tutor needs internet to answer.'
        : `${p.name}: could not connect (network error).`,
      { kind: 'network', provider: p.name }
    );
  }
  if (!res.ok) throw await toProviderError(res, p);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  // Server-Sent Events: lines like "data: {json}" and finally "data: [DONE]".
  const handleLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return false;
    const data = trimmed.slice(5).trim();
    if (data === '[DONE]') return true;
    let json;
    try {
      json = JSON.parse(data);
    } catch {
      return false;
    }
    if (json.error) {
      const m = json.error.message || 'Unknown error';
      const rate = /quota|rate|exhaust/i.test(m) || json.error.code === 429;
      throw new ProviderError(`${p.name}: ${m}`, { kind: rate ? 'rate-limit' : 'server', provider: p.name });
    }
    const piece = json.choices?.[0]?.delta?.content;
    if (piece) {
      full += piece;
      onDelta?.(piece);
    }
    return false;
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) if (handleLine(line)) return full;
  }
  if (buffer) handleLine(buffer);
  return full;
}

/**
 * Tries each usable provider in order. Moves on to the next one when a provider
 * fails (rate limit, quota, bad key, missing model, outage). onSwitch(message)
 * lets the UI tell the learner what happened.
 */
export async function chatWithFallback(providers, messages, opts) {
  const list = usableProviders(providers);
  if (list.length === 0) {
    throw new ProviderError('No AI provider is set up yet. Open Settings and paste a free API key.', {
      kind: 'auth',
    });
  }
  const errors = [];
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    let gotText = false;
    try {
      const text = await streamChat(p, messages, {
        ...opts,
        onDelta: (d) => {
          gotText = true;
          opts.onDelta?.(d);
        },
      });
      return { text, provider: p };
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      // If text was already shown, don't silently restart on another provider.
      if (gotText) throw err;
      errors.push(err);
      const next = list[i + 1];
      if (next) opts.onSwitch?.(`${err.message}\n→ Trying ${next.name} instead…`);
    }
  }
  const last = errors[errors.length - 1];
  const all = errors.map((e) => '• ' + e.message).join('\n');
  throw new ProviderError(errors.length > 1 ? `All providers failed:\n${all}` : last.message, {
    kind: last.kind,
    status: last.status,
  });
}

/** Fetches the model ids a provider offers (for the Settings picker). */
export async function listModels(p) {
  let res;
  try {
    res = await fetch(endpoint(p, '/models'), { headers: headersFor(p) });
  } catch {
    throw new ProviderError(`${p.name}: could not connect.`, { kind: 'network' });
  }
  if (!res.ok) throw await toProviderError(res, p);
  const body = await res.json();
  let ids = (body.data || body.models || [])
    .map((m) => String(m.id || m.name || '').replace(/^models\//, ''))
    .filter(Boolean);
  if (p.freeOnly) ids = ids.filter((id) => id.endsWith(':free'));
  if (p.id === 'gemini') ids = ids.filter((id) => id.startsWith('gemini') && !/image|tts|audio|embedding|live/.test(id));
  if (p.id === 'groq') ids = ids.filter((id) => !/whisper|tts|guard/.test(id));
  return [...new Set(ids)].sort();
}
