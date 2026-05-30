# Smart Notes — Local AI Assistant

A privacy-first note-taking app that runs AI entirely in your browser (or falls back to GitHub Models). No cloud, no subscriptions — your notes stay on your device.

---

## How it works

Smart Notes uses the browser's built-in language model API (`window.LanguageModel` on Chrome/Edge) to automatically categorize, improve, and summarize notes as you write them. If local AI isn't available, it transparently falls back to GitHub Models via a small local proxy server.

```
Browser (index.html + app.js)
    │
    ├─► Local AI  (window.LanguageModel / Gemini Nano / Phi Mini)
    │
    └─► GitHub Models proxy  (server.js → models.github.ai)
```

Notes are stored locally in IndexedDB via [Dexie.js](https://dexie.org/) — nothing leaves your machine unless you use the GitHub fallback.

---

## Requirements

- **Node.js** 18+ (only needed to run the GitHub Models proxy)
- **Chrome 131+** or **Edge** with the Prompt API flag enabled (for local AI)
- A **GitHub personal access token** (optional, for the cloud fallback)

---

## Getting started

### 1. Clone and install

```bash
git clone <repo-url>
cd local_ai_assistent
npm install
```

### 2. Start the proxy server

The proxy is only required if you want the GitHub Models fallback. Skip this step if you're using local AI only.

```bash
node server.js
# Smart Notes — http://localhost:3001
```

### 3. Open the app

Navigate to [http://localhost:3001](http://localhost:3001) in your browser.

If you're using local AI only (no proxy), you can open `index.html` directly in Chrome/Edge.

---

## Enabling local AI

The in-browser AI requires a one-time flag change:

| Browser | Flag URL |
|---------|----------|
| Chrome  | `chrome://flags/#prompt-api-for-gemini-nano` |
| Edge    | `edge://flags/#prompt-api-for-gemini-nano` |

1. Open the flag URL above
2. Set the option to **Enabled**
3. Click **Restart**
4. On first launch the model (~1–3 GB) will download in the background

> Open `test-ai.html` in your browser to run a full diagnostics check and verify everything is working.

---

## First-time setup

On first launch the settings drawer opens automatically. You need to configure at least:

- **Categories** — one per line (e.g. `Work`, `Personal`, `Studies`). Notes are automatically sorted into these.
- **GitHub Token** *(optional)* — generate one at `github.com → Settings → Developer settings → Personal access tokens`. Only needed if local AI is unavailable.

Click **Save Settings** to continue.

---

## Using the app

### Creating a note

1. Make sure you're in **New Note** mode (the toggle at the bottom)
2. Type your note in the text area
3. Press **Send** or `Ctrl+Enter`

The AI will automatically:
- Pick the best matching category
- Correct grammar and improve clarity
- Generate a short summary
- Save the note to the right folder

### Attaching an image

Click the 📎 button to attach an image. Tesseract.js will run OCR on it and merge the extracted text with anything you typed before processing.

### Voice input

Click the 🎤 button to dictate your note. Click again to stop. The transcript is inserted at the cursor position so you can mix typing and speech.

### Chatting with AI

Switch to **Chat with AI** mode using the toggle. The AI keeps a full conversation history for the session, so you can ask follow-up questions naturally.

Click **Analyze my Drive** to have the AI read all your notes and give you an executive summary, surface pending tasks, and highlight the most important information.

### Navigating notes

- Click any category folder on the home screen to see its notes
- Use the breadcrumb to go back home
- The folder grid shows a live note count per category

---

## Project structure

```
local_ai_assistent/
├── index.html      # Main app shell
├── test-ai.html    # Diagnostics page for the local AI API
├── app.js          # UI logic, event handling, navigation
├── ai.js           # AI backend abstraction (browser + GitHub)
├── db.js           # IndexedDB layer via Dexie.js
├── server.js       # Lightweight Node.js proxy for GitHub Models
└── styles.css      # Custom styles (Tailwind CSS via CDN)
```

---

## Configuration reference

| Setting | Description | Default |
|---------|-------------|---------|
| Categories | Comma or newline separated list | — |
| Temperature | Controls creativity (0 = precise, 1 = creative) | `0.8` |
| Top-K | Candidate token pool size | `40` |
| GitHub Token | PAT for the GitHub Models fallback | — |

---

## Roadmap

These features are planned for future releases:

### Note management
- [ ] **Delete notes** — trash icon on each note card with a confirmation step to avoid accidents
- [ ] **Move notes to a different folder** — drag-and-drop between categories or a "Move to…" context menu
- [ ] **Open note details** — full-screen view with the original text, AI-improved version, summary, image thumbnail, and creation date side by side
- [ ] **Edit notes** — inline editing of the improved text after a note is saved
- [ ] **Search** — full-text search across all notes with highlighted matches

### Chat improvements
- [ ] **Clear chat window** — one-click button to wipe the conversation history and start a fresh session
- [ ] **Export chat** — download the conversation as a `.txt` or `.md` file
- [ ] **Pin important AI responses** — star a reply to save it as a note automatically

### AI & processing
- [ ] **Batch re-categorize** — re-run the AI classifier on all notes after adding a new category
- [ ] **Custom system prompt** — let users tweak the AI personality and note-improvement style from settings
- [ ] **Offline indicator** — detect when the GitHub fallback is unreachable and show a clear warning

### UI & experience
- [ ] **Dark/light theme toggle** — system-preference aware with a manual override
- [ ] **Keyboard shortcuts panel** — `?` key opens a cheat sheet of all shortcuts
- [ ] **Onboarding tour** — step-by-step first-run walkthrough highlighting key features
- [ ] **Note count badges** — animated counter on folder cards when a new note lands
- [ ] **Confetti on first note** — 🎉 because milestones deserve celebration

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| UI framework | Vanilla JS + [Tailwind CSS](https://tailwindcss.com/) (CDN) |
| Local database | [Dexie.js](https://dexie.org/) (IndexedDB wrapper) |
| OCR | [Tesseract.js](https://tesseract.projectnaptha.com/) |
| Local AI | Chrome/Edge Prompt API (`window.LanguageModel`) |
| Cloud AI fallback | [GitHub Models](https://github.com/marketplace/models) — `microsoft/Phi-4-multimodal-instruct` |
| Proxy server | Node.js built-in `http` module (no dependencies) |

---

## License

MIT
