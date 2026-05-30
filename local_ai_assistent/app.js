import {
  getSettings, saveSettings, createNote,
  getNotesByCategory, getAllNotes, getCategorySummaries,
} from './db.js'

import {
  detectBackend, getActiveBackend, configure,
  processNote, sendChatMessage, analyzeAllNotes, destroyChatSession,
} from './ai.js'


// ── State ──────────────────────────────────────────────────────────────────
let currentMode = 'nova-nota'
let currentCategory = null
let currentSettings = null
let recognition = null
let pendingImageBase64 = null
let isRecording = false
let speechInsertionStart = 0

// ── Shortcuts ──────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id)

// ── Initialisation ─────────────────────────────────────────────────────────
async function init() {
  bindEvents()

  // Load settings first — needed to read stored github_token
  currentSettings = await getSettings()

  if (!currentSettings) {
    // First access: pre-fill form with defaults and force settings open
    populateSettingsForm({ temperature: 0.8, topK: 40, categories: [], github_token: null })
    openDrawer(true)
    setAIStatus('off')
  } else {
    configure(currentSettings)
    populateSettingsForm(currentSettings)

    const backend = await detectBackend(currentSettings.github_token ?? null)
    if (backend === 'browser') {
      setAIStatus('browser')
    } else if (backend === 'github') {
      setAIStatus('github')
    } else {
      setAIStatus('off')
      showAIBanner(
        'No AI available',
        'Configure a GitHub Token in settings (☰) or enable local AI at ' +
        '<code>chrome://flags/#prompt-api-for-gemini-nano</code>. ' +
        '<a href="test-ai.html" style="text-decoration:underline">Run diagnostics</a>',
      )
    }

    await refreshFolderGrid()
  }

  setupSpeechRecognition()
}

// ── AI Status indicator ────────────────────────────────────────────────────
function setAIStatus(state) {
  const dot = $('ai-status-dot')
  const label = $('ai-status-label')
  const map = {
    browser: { color: 'bg-green-500',  text: 'Local AI active' },
    github:  { color: 'bg-blue-500',   text: 'GitHub Models' },
    loading: { color: 'bg-yellow-500', text: 'model downloading' },
    off:     { color: 'bg-red-500',    text: 'AI unavailable' },
  }
  const s = map[state] ?? map.off
  dot.className = `w-2 h-2 rounded-full ${s.color}`
  label.textContent = s.text
}

function showAIBanner(title, msg) {
  $('ai-unavailable-banner').removeAttribute('hidden')
  $('banner-title').textContent = title
  $('banner-msg').innerHTML = msg
}

// ── Drawer ─────────────────────────────────────────────────────────────────
function openDrawer(firstAccess = false) {
  $('settings-drawer').classList.add('open')
  $('drawer-overlay').classList.add('visible')
  if (firstAccess) {
    $('drawer-overlay').classList.add('no-close')
    $('btn-drawer-close').disabled = true
    $('btn-drawer-close').classList.add('opacity-30', 'cursor-not-allowed')
    $('first-access-notice').classList.remove('hidden')
  }
}

function closeDrawer() {
  if ($('drawer-overlay').classList.contains('no-close')) return
  $('settings-drawer').classList.remove('open')
  $('drawer-overlay').classList.remove('visible')
}

// ── Settings ───────────────────────────────────────────────────────────────
function populateSettingsForm(settings) {
  $('input-categories').value = (settings.categories ?? []).join('\n')
  $('input-temperature').value = settings.temperature ?? 0.8
  $('label-temperature').textContent = (settings.temperature ?? 0.8).toFixed(2)
  $('input-topk').value = settings.topK ?? 40
  $('input-github-token').value = settings.github_token
}

async function handleSaveSettings(e) {
  e.preventDefault()

  const raw = $('input-categories').value
  const categories = raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean)

  if (!categories.length) {
    $('categories-error').classList.remove('hidden')
    return
  }
  $('categories-error').classList.add('hidden')

  const temperature   = parseFloat($('input-temperature').value)
  const topK          = parseInt($('input-topk').value, 10)
  const github_token  = $('input-github-token').value.trim() || null

  await saveSettings({ temperature, topK, categories, github_token })
  currentSettings = { temperature, topK, categories, github_token }
  configure({ temperature, topK, github_token })

  // Re-detect backend with potentially new token
  const backend = await detectBackend(github_token)
  setAIStatus(backend === 'none' ? 'off' : backend)

  // Allow closing now
  $('drawer-overlay').classList.remove('no-close')
  $('btn-drawer-close').disabled = false
  $('btn-drawer-close').classList.remove('opacity-30', 'cursor-not-allowed')
  $('first-access-notice').classList.add('hidden')

  closeDrawer()
  await refreshFolderGrid()
  showToast('Settings saved!')
}

// ── Folder Grid ────────────────────────────────────────────────────────────
async function refreshFolderGrid() {
  const summaries = await getCategorySummaries()
  const categories = currentSettings?.categories ?? []

  // Build a complete list: configured categories + any orphaned categories in notes
  const allCats = [...new Set([...categories, ...summaries.map(s => s.category)])]
  const countMap = new Map(summaries.map(s => [s.category, s.count]))

  const grid = $('folders-grid')
  const empty = $('folders-empty')
  grid.innerHTML = ''

  if (!allCats.length) {
    empty.classList.remove('hidden')
    return
  }
  empty.classList.add('hidden')

  for (const cat of allCats) {
    const count = countMap.get(cat) ?? 0
    const card = document.createElement('div')
    card.className = 'folder-card bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-2xl p-4 flex flex-col items-center gap-2 select-none'
    card.innerHTML = `
      <div class="text-4xl">📁</div>
      <p class="text-sm font-medium text-gray-200 text-center truncate w-full text-center">${escapeHtml(cat)}</p>
      <span class="text-xs text-gray-500">${count} ${count === 1 ? 'note' : 'notes'}</span>
    `
    card.addEventListener('click', () => navigateToCategory(cat))
    grid.appendChild(card)
  }
}

// ── Navigation ─────────────────────────────────────────────────────────────
async function navigateToCategory(category) {
  currentCategory = category
  $('breadcrumb-category').textContent = category
  $('breadcrumb').removeAttribute('hidden')
  $('view-folders').setAttribute('hidden', '')
  $('view-notes').removeAttribute('hidden')
  $('view-chat').setAttribute('hidden', '')
  await renderNotesList(category)
}

function goHome() {
  currentCategory = null
  $('breadcrumb').setAttribute('hidden', '')
  $('view-folders').removeAttribute('hidden')
  $('view-notes').setAttribute('hidden', '')
  $('view-chat').setAttribute('hidden', '')
  refreshFolderGrid()
}

async function renderNotesList(category) {
  const notes = await getNotesByCategory(category)
  const list = $('notes-list')
  const empty = $('notes-empty')
  list.innerHTML = ''

  if (!notes.length) {
    empty.classList.remove('hidden')
    return
  }
  empty.classList.add('hidden')

  for (const note of notes) {
    const card = document.createElement('div')
    card.className = 'note-card bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-3'
    const preview = (note.improved_text || note.original_text || '').slice(0, 150)
    const date = new Date(note.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    const thumb = note.image_base64
      ? `<img src="${note.image_base64}" alt="Image" class="note-thumbnail">`
      : ''

    card.innerHTML = `
      ${thumb}
      <div class="flex-1 min-w-0">
        <p class="text-sm text-gray-300 leading-relaxed line-clamp-3">${escapeHtml(preview)}${preview.length === 150 ? '…' : ''}</p>
        ${note.summary ? `<p class="text-xs text-gray-500 mt-1 italic">${escapeHtml(note.summary)}</p>` : ''}
        <p class="text-xs text-gray-600 mt-2">${date}</p>
      </div>
    `
    list.appendChild(card)
  }
}

// ── Mode switching ──────────────────────────────────────────────────────────
function handleModeSwitch(mode) {
  currentMode = mode
  $('btn-mode-nova-nota').classList.toggle('active', mode === 'nova-nota')
  $('btn-mode-chat').classList.toggle('active', mode === 'chat')
  $('main-textarea').placeholder = mode === 'nova-nota' ? 'Write your note...' : 'Message for AI...'

  if (mode === 'chat') {
    $('breadcrumb').setAttribute('hidden', '')
    $('view-folders').setAttribute('hidden', '')
    $('view-notes').setAttribute('hidden', '')
    $('view-chat').removeAttribute('hidden')
  } else {
    destroyChatSession()
    $('view-chat').setAttribute('hidden', '')
    if (currentCategory) {
      $('breadcrumb').removeAttribute('hidden')
      $('view-notes').removeAttribute('hidden')
    } else {
      $('view-folders').removeAttribute('hidden')
      refreshFolderGrid()
    }
  }
}

// ── Send handler ───────────────────────────────────────────────────────────
async function handleSend() {
  const text = $('main-textarea').value.trim()
  if (!text && !pendingImageBase64) return

  if (currentMode === 'nova-nota') {
    await handleNewNote(text)
  } else {
    await handleChatSend(text)
  }
}

// ── New Note ───────────────────────────────────────────────────────────────
async function handleNewNote(text) {
  if (!currentSettings?.categories?.length) {
    openDrawer(false)
    showToast('Configure categories before saving notes.')
    return
  }

  if (!getActiveBackend()) {
    showToast('AI unavailable. Configure a GitHub token in settings (☰).')
    return
  }

  const btn = $('btn-send')
  setSendLoading(true)

  let combinedText = text
  let imageBase64 = pendingImageBase64

  try {
    // OCR if image attached
    if (imageBase64) {
      $('ocr-progress').classList.remove('hidden')
      try {
        const { data } = await Tesseract.recognize(imageBase64, 'eng', {
          logger: m => {
            if (m.status === 'recognizing text') {
              $('ocr-percent').textContent = Math.round(m.progress * 100) + '%'
            }
          },
        })
        if (data.text?.trim()) {
          combinedText = [text, data.text.trim()].filter(Boolean).join('\n\n')
        }
      } finally {
        $('ocr-progress').classList.add('hidden')
      }
    }

    if (!combinedText) {
      showToast('No text to process.')
      return
    }

    const result = await processNote({
      text: combinedText,
      categories: currentSettings.categories,
    })

    await createNote({
      original_text: combinedText,
      improved_text: result.improved_text,
      category: result.category,
      image_base64: imageBase64,
    })

    // Clear state
    $('main-textarea').value = ''
    clearImagePreview()

    await refreshFolderGrid()

    if (currentCategory === result.category) {
      await renderNotesList(currentCategory)
    }

    showToast(`Note saved to "${result.category}"`)
  } catch (err) {
    showToast('Error processing note: ' + err.message)
    console.error(err)
  } finally {
    setSendLoading(false)
  }
}

// ── Chat Send ──────────────────────────────────────────────────────────────
async function handleChatSend(text) {
  if (!text) return
  if (!getActiveBackend()) {
    showToast('AI unavailable.')
    return
  }

  $('main-textarea').value = ''
  renderChatBubble('user', text)
  const typingEl = renderTypingIndicator()
  setSendLoading(true)

  try {
    const response = await sendChatMessage(text)
    typingEl.remove()
    renderChatBubble('ai', response)
  } catch (err) {
    typingEl.remove()
    renderChatBubble('ai', `Error: ${err.message}`)
  } finally {
    setSendLoading(false)
  }
}

async function handleAnalyzeDrive() {
  if (!getActiveBackend()) {
    showToast('AI unavailable.')
    return
  }

  const notes = await getAllNotes()
  if (!notes.length) {
    renderChatBubble('ai', 'No notes found in your Drive yet.')
    return
  }

  renderChatBubble('user', '🔍 Analyze my Drive')
  const typingEl = renderTypingIndicator()
  $('btn-analyze-drive').disabled = true

  try {
    const summary = await analyzeAllNotes(notes)
    typingEl.remove()
    renderChatBubble('ai', summary)
  } catch (err) {
    typingEl.remove()
    renderChatBubble('ai', `Analysis error: ${err.message}`)
  } finally {
    $('btn-analyze-drive').disabled = false
  }
}

// ── Chat UI helpers ────────────────────────────────────────────────────────
function renderChatBubble(role, text) {
  const el = document.createElement('div')
  el.className = role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'
  el.textContent = text
  $('chat-history').appendChild(el)
  el.scrollIntoView({ behavior: 'smooth', block: 'end' })
  return el
}

function renderTypingIndicator() {
  const el = document.createElement('div')
  el.className = 'chat-bubble-typing flex gap-1 items-center'
  el.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`
  $('chat-history').appendChild(el)
  el.scrollIntoView({ behavior: 'smooth', block: 'end' })
  return el
}

// ── Image attachment ───────────────────────────────────────────────────────
function handleImageAttach(e) {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async ev => {
    const dataUrl = ev.target.result
    pendingImageBase64 = await resizeImage(dataUrl)
    $('image-preview').src = pendingImageBase64
    $('image-preview-name').textContent = file.name
    $('image-preview-container').classList.remove('hidden')
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

function clearImagePreview() {
  pendingImageBase64 = null
  $('image-preview').src = ''
  $('image-preview-name').textContent = ''
  $('image-preview-container').classList.add('hidden')
}

function resizeImage(dataUrl, maxWidth = 800) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.src = dataUrl
  })
}

// ── Speech Recognition ─────────────────────────────────────────────────────
function setupSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) {
    const btn = $('btn-mic')
    btn.disabled = true
    btn.title = 'SpeechRecognition not supported in this browser'
    btn.classList.add('opacity-40', 'cursor-not-allowed')
    return
  }

  recognition = new SR()
  recognition.lang = 'en-US'
  recognition.interimResults = true
  recognition.continuous = false

  recognition.onresult = e => {
    const transcript = Array.from(e.results)
      .map(r => r[0].transcript)
      .join('')
    const textarea = $('main-textarea')
    textarea.value = textarea.value.slice(0, speechInsertionStart) + transcript
  }

  recognition.onend = () => {
    isRecording = false
    $('btn-mic').classList.remove('recording')
    $('btn-mic').title = 'Record audio'
  }

  recognition.onerror = e => {
    isRecording = false
    $('btn-mic').classList.remove('recording')
    if (e.error !== 'aborted') showToast('Microphone error: ' + e.error)
  }
}

function handleMicToggle() {
  if (!recognition) return

  if (isRecording) {
    recognition.stop()
    return
  }

  speechInsertionStart = $('main-textarea').value.length
  isRecording = true
  $('btn-mic').classList.add('recording')
  $('btn-mic').title = 'Click to stop'
  recognition.start()
}

// ── Send button loading state ──────────────────────────────────────────────
function setSendLoading(loading) {
  const btn = $('btn-send')
  const label = $('btn-send-text')
  btn.disabled = loading
  label.textContent = loading ? '...' : 'Send'
}

// ── Toast ──────────────────────────────────────────────────────────────────
let toastTimer = null
function showToast(msg) {
  const el = $('toast')
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000)
}

// ── Utility ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Event bindings ─────────────────────────────────────────────────────────
function bindEvents() {
  $('btn-hamburger').addEventListener('click', () => openDrawer())
  $('btn-drawer-close').addEventListener('click', closeDrawer)
  $('drawer-overlay').addEventListener('click', closeDrawer)

  $('settings-form').addEventListener('submit', handleSaveSettings)
  $('input-temperature').addEventListener('input', () => {
    $('label-temperature').textContent = parseFloat($('input-temperature').value).toFixed(2)
  })

  $('btn-home').addEventListener('click', goHome)

  $('btn-mode-nova-nota').addEventListener('click', () => handleModeSwitch('nova-nota'))
  $('btn-mode-chat').addEventListener('click', () => handleModeSwitch('chat'))

  $('btn-send').addEventListener('click', handleSend)
  $('main-textarea').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  })

  $('file-input').addEventListener('change', handleImageAttach)
  $('btn-remove-image').addEventListener('click', clearImagePreview)

  $('btn-mic').addEventListener('click', handleMicToggle)
  $('btn-analyze-drive').addEventListener('click', handleAnalyzeDrive)
}

// ── Bootstrap ──────────────────────────────────────────────────────────────
init().catch(err => {
  console.error('Initialization error:', err)
})
