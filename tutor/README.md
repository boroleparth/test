# CS Tutor

A personal AI tutor for computer science and building apps and websites. It is an installable web app (PWA): you add it to your phone's home screen and it opens like a normal app, even offline. Chatting with the tutor needs internet.

- **Chat** with streaming answers, Markdown and highlighted code blocks you can copy.
- **4 modes:** 💡 Explain · ❓ Quiz me · 🛠️ Build a project · 🐞 Debug my code.
- **Progress:** topics you covered, quiz scores (weak topics show in red; tap one to practise it), and a **Recap & continue** button.
- **Notes:** paste a syllabus or topic list and the tutor follows it.
- **Backup:** export and import everything as a JSON file.
- **Free AI only:** Google Gemini (default), Groq, OpenRouter `:free` models, or any OpenAI-compatible API. If one provider hits its limit, the app switches to the next one automatically.
- **Private by design:** no accounts, no server, no database. Everything stays in your browser's `localStorage`.

> ⚠️ Free AI tiers may log your prompts and use them for training. Don't paste passwords, keys or private information into the chat or your notes.

---

## 1. Get a free API key (about 2 minutes, no credit card)

You need **at least one** key. Two keys give you a fallback when one provider's free limit runs out.

| Provider | Where | Key looks like | Notes |
|---|---|---|---|
| **Google Gemini** (recommended) | https://aistudio.google.com/apikey → **Create API key** | `AIza…` | Sign in with Google. Free limits are per minute and per day. |
| **Groq** | https://console.groq.com/keys → **Create API Key** | `gsk_…` | Very fast. The key is shown only once, so copy it straight away. |
| **OpenRouter** | https://openrouter.ai/settings/keys → **Create Key** | `sk-or-…` | Use only models ending in `:free`. |

Then open the app → **Settings** → paste the key into a provider → tap **Test**.

**Models change often.** If you see "model not found", tap **Load models** and pick one from the list. Gemini's default `gemini-flash-latest` always points to Google's current Flash model.

**Fallback order:** use the ▲ ▼ arrows in Settings. The tutor tries providers from top to bottom.

**Key safety:** keys are stored only on your device (in `localStorage`) and sent only to the provider they belong to. They are never in this repo. **Export** leaves keys out unless you tick "Include API keys". If you tick it, keep that file private. `.gitignore` blocks backup files from being committed.

---

## 2. Run it on your computer

Needs [Node.js](https://nodejs.org) 20 or newer.

```bash
cd tutor
```

```bash
npm install
```

```bash
npm run dev
```

Open the address it prints (for example http://localhost:5173). To try it on your phone over home Wi-Fi, run `npm run dev -- --host` and open the "Network" address on the phone. The offline service worker is only active in the production build:

```bash
npm run build && npm run preview
```

---

## 3. Deploy for free

### Option A: Netlify (the repo is already configured)

1. Push this repo to GitHub.
2. Go to https://app.netlify.com → **Add new site → Import an existing project** → pick this repo.
3. Netlify reads `netlify.toml` from the repo root (base `tutor`, command `npm ci && npm run build`, publish `dist`), so just click **Deploy**.
4. You get a link like `https://your-name.netlify.app`. Under **Site configuration → Change site name** you can pick a nicer name.

### Option B: Cloudflare Pages

1. https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git** → pick this repo.
2. Settings:
   - Framework preset: **None** (or Vite)
   - Root directory: `tutor`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `22`
3. **Save and Deploy**. You get `https://your-project.pages.dev`.

Both hosts read `public/_headers`, which sets the security headers (Content-Security-Policy and others) and makes sure updates reach your phone.

**Updating:** push to GitHub and the site rebuilds by itself. The next time you open the app it shows **"A new version is ready → Update"**.

---

## 4. Install on your phone

You need the HTTPS link from step 3.

**Android (Chrome):** open the link → tap **Settings → Install CS Tutor**, or Chrome's ⋮ menu → **Install app** / **Add to Home screen**.

**iPhone/iPad (Safari):** open the link in **Safari** → tap the **Share** button → **Add to Home Screen** → **Add**.

The app then opens full-screen from your home screen. Your data lives in that installed app's storage on the phone. Use **Export** now and then as a backup.

---

## How to use it well

- Choose a **mode** with the chips at the top of the chat. You can switch modes in the middle of a lesson.
- Add your course outline in **Notes** so lessons follow your plan.
- In **Quiz me**, answer each question in the chat. Scores appear in **Progress**.
- Ask for more depth ("explain in more detail") or set **Answer length → Detailed** in Settings.
- On a phone, Enter adds a new line. Tap the ➤ button to send.

## Troubleshooting

| Problem | Fix |
|---|---|
| "rate limit or daily quota reached" | Free limit hit. Wait a minute or until tomorrow, or add a second provider. |
| "API key was rejected" | Re-copy the key with no spaces. Make sure it's in the right provider. |
| "model … was not found" | Settings → **Load models** → pick one. |
| "All providers failed" | Read each line: it tells you which provider failed and why. |
| App doesn't update | Close and reopen it, then tap **Update** on the banner. |

## Project layout

```
tutor/
  index.html              App page
  vite.config.js          Build config + service-worker generator + CSP
  public/
    manifest.webmanifest  PWA name, colours, icons
    _headers              Security headers for Netlify/Cloudflare
    icons/                App icons (npm run icons regenerates PNGs from icon.svg)
  src/
    main.jsx              Starts React, registers the service worker
    App.jsx               Screens, chat flow, learning log
    sw-template.js        Service worker (offline app shell)
    lib/providers.js      AI providers, streaming, fallback
    lib/prompts.js        Tutor system prompt and modes
    lib/markdown.js       Safe Markdown → HTML (escaped + DOMPurify)
    lib/storage.js        localStorage, export/import
    components/           Chat, Progress, Notes, Settings screens
```

## Security notes

- No API keys in the code or the repo. Keys live only in your browser's storage.
- AI output is treated as untrusted. Raw HTML in answers is escaped and shown as text, code is escaped by highlight.js, and the result is sanitised with DOMPurify. Only `http(s)` and `mailto` links are allowed.
- No `eval`, no inline scripts. A strict Content-Security-Policy blocks injected scripts.
- The service worker caches only this app's own files. API requests are never cached.
