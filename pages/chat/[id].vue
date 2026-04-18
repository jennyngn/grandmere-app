<template>
  <div class="chat-page" :class="`state-${state}`">
    <div class="ambient" :style="ambientStyle" />

    <Transition name="fade" mode="out-in">

      <!-- ══ STATE: VIEW ══ -->
      <div v-if="state === 'view'" key="view" class="screen screen-view">

        <!-- Back -->
        <button class="back-btn" @click="$router.push('/')">← Retour</button>

        <!-- Contact header -->
        <div class="contact-header">
          <div class="avatar" :style="{ background: contact?.color }">{{ contact?.initials }}</div>
          <h1 class="contact-name">{{ contact?.name }}</h1>
        </div>

        <!-- Last received message -->
        <div class="message-area">
          <template v-if="lastMessage">
            <p class="message-label">{{ lastMessage.direction === 'sent' ? 'Vous avez dit :' : 'Dernier message :' }}</p>
            <p class="message-text" :class="{ 'message-text--sent': lastMessage.direction === 'sent' }">{{ lastMessage.text }}</p>
            <p class="message-time">{{ formatTime(lastMessage.timestamp) }}</p>
          </template>
          <template v-else>
            <p class="message-empty">Pas encore de message de {{ contact?.name }}</p>
          </template>
        </div>

        <!-- Record CTA -->
        <div class="record-cta">
          <div class="record-cta-key">
            <span class="key-dot" />
          </div>
          <p class="record-cta-text">Maintenez n'importe quelle touche pour parler</p>
        </div>

        <!-- Contact navigation -->
        <nav class="contact-nav">
          <button class="nav-arrow" @click="shiftContact(-1)">←</button>
          <span class="nav-name">{{ contact?.name }}</span>
          <button class="nav-arrow" @click="shiftContact(1)">→</button>
        </nav>
      </div>

      <!-- ══ STATE: RECORDING ══ -->
      <div v-else-if="state === 'recording'" key="recording" class="screen screen-recording">
        <!-- Pulse rings -->
        <div class="pulse-ring pulse-ring--1" />
        <div class="pulse-ring pulse-ring--2" />
        <div class="pulse-ring pulse-ring--3" />

        <!-- Mic icon -->
        <div class="mic-wrap">
          <svg class="mic-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="18" y="4" width="12" height="22" rx="6" fill="currentColor"/>
            <path d="M10 22a14 14 0 0 0 28 0" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
            <line x1="24" y1="36" x2="24" y2="43" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
            <line x1="17" y1="43" x2="31" y2="43" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </div>

        <p class="recording-label">Je vous écoute…</p>

        <!-- Live transcript -->
        <p v-if="transcript || interimText" class="live-transcript">
          {{ transcript || interimText }}
        </p>
        <p v-else class="recording-hint">Relâchez pour envoyer</p>
      </div>

      <!-- ══ STATE: SENT ══ -->
      <div v-else-if="state === 'sent'" key="sent" class="screen screen-sent">
        <div class="sent-check">✓</div>
        <p class="sent-to">Envoyé à <strong>{{ contact?.name }}</strong></p>
        <p v-if="lastSentText" class="sent-preview">"{{ lastSentText }}"</p>
        <p class="sent-hint">Appuyez sur n'importe quelle touche pour continuer</p>
      </div>

      <!-- ══ STATE: INCOMING ══ -->
      <div v-else-if="state === 'incoming'" key="incoming" class="screen screen-incoming">
        <div class="incoming-from">
          <div class="avatar avatar--sm" :style="{ background: contact?.color }">{{ contact?.initials }}</div>
          <span>{{ contact?.name }} vous répond :</span>
        </div>
        <p class="incoming-text">{{ incomingMessage?.text }}</p>
        <p class="incoming-hint">Appuyez pour répondre</p>
      </div>

    </Transition>
  </div>
</template>

<script setup>
import { useContacts }      from '~/composables/useContacts'
import { useMessages }      from '~/composables/useMessages'
import { useAudioRecorder } from '~/composables/useAudioRecorder'

definePageMeta({ ssr: false, pageTransition: { name: 'page', mode: 'out-in' } })
useHead({ bodyAttrs: { class: 'grandma' } })

const route  = useRoute()
const router = useRouter()

const { contacts, getContact }                                        = useContacts()
const { getLastMessage, getMessagesForContact, addMessage,
        markAsRead, load }                                            = useMessages()
const { isRecording, audioBlob, transcript, interimText,
        startRecording, stopRecording, reset }                        = useAudioRecorder()

// ── Derived contact data ────────────────────────────────────────────
const contactId   = computed(() => route.params.id)
const contact     = computed(() => getContact(contactId.value))
const lastMessage = computed(() => getLastMessage(contactId.value).value)

const contactIndex = computed(() => contacts.value.findIndex(c => c.id === contactId.value))

const ambientStyle = computed(() => {
  const color = contact.value?.color ?? '#888'
  return { background: `radial-gradient(ellipse 80% 60% at 50% 75%, ${color}18 0%, transparent 65%)` }
})

// ── State machine ───────────────────────────────────────────────────
const state           = ref('view')
const lastSentText    = ref('')
const incomingMessage = ref(null)
let   keyDown         = false

// ── Navigation ──────────────────────────────────────────────────────
const shiftContact = (dir) => {
  const idx = (contactIndex.value + dir + contacts.value.length) % contacts.value.length
  router.replace(`/chat/${contacts.value[idx].id}`)
}

// ── Helpers ─────────────────────────────────────────────────────────
const formatTime = (ts) => {
  const d = new Date(ts)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return `Aujourd'hui à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  }
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long',
                                          hour: '2-digit', minute: '2-digit' })
}

// ── Keyboard handlers ───────────────────────────────────────────────
const IGNORED_KEYS = new Set(['ArrowUp', 'ArrowDown', 'Tab', 'CapsLock', 'Shift', 'Control',
                               'Alt', 'Meta', 'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'])

const onKeyDown = async (e) => {
  if (e.repeat) return

  if (state.value === 'view') {
    if (e.key === 'Escape')      { router.push('/'); return }
    if (e.key === 'ArrowLeft')   { e.preventDefault(); shiftContact(-1); return }
    if (e.key === 'ArrowRight')  { e.preventDefault(); shiftContact(1);  return }
    if (IGNORED_KEYS.has(e.key)) return

    // Any other key → start recording
    e.preventDefault()
    keyDown = true
    state.value = 'recording'
    reset()
    await startRecording()

  } else if (state.value === 'sent' || state.value === 'incoming') {
    if (IGNORED_KEYS.has(e.key)) return
    state.value = 'view'
    markAsRead(contactId.value)
  }
}

const onKeyUp = async (e) => {
  if (!keyDown || state.value !== 'recording') return
  keyDown = false

  const blob = await stopRecording()

  // Small grace period for speech recognition to finalize
  await new Promise(r => setTimeout(r, 350))

  const text = transcript.value || interimText.value || '[message vocal]'
  lastSentText.value = text
  await addMessage(contactId.value, 'sent', text, blob)
  state.value = 'sent'
  reset()
}

// ── Poll for incoming messages ───────────────────────────────────────
let pollId = null
let lastSeenCount = 0

const checkIncoming = () => {
  load()
  const msgs = getMessagesForContact(contactId.value)
  const unread = msgs.value.filter(m => m.direction === 'received' && !m.read)
  if (unread.length > lastSeenCount && state.value === 'view') {
    incomingMessage.value = unread[unread.length - 1]
    state.value = 'incoming'
    lastSeenCount = unread.length
  } else {
    lastSeenCount = unread.length
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup',   onKeyUp)
  markAsRead(contactId.value)
  pollId = setInterval(checkIncoming, 1500)
  window.addEventListener('ba-messages-updated', checkIncoming)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup',   onKeyUp)
  clearInterval(pollId)
  window.removeEventListener('ba-messages-updated', checkIncoming)
})
</script>

<style scoped>
.chat-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  cursor: none;
}

.ambient {
  position: fixed;
  inset: 0;
  transition: background 0.8s ease;
  pointer-events: none;
}

.screen {
  width: 100%;
  max-width: 900px;
  padding: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  position: relative;
  z-index: 1;
}

/* ── Back button ── */
.back-btn {
  position: fixed;
  top: 36px;
  left: 50px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  background: none;
  border: none;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  transition: color 0.2s;
  cursor: none;
}

/* ── VIEW screen ── */
.contact-header {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  flex-shrink: 0;
}

.avatar--sm {
  width: 44px;
  height: 44px;
  font-size: 1rem;
}

.contact-name {
  font-family: var(--font-display);
  font-size: 2.8rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: var(--text-primary);
}

.message-area {
  width: 100%;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 40px 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 180px;
}

.message-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.message-text {
  font-family: var(--font-display);
  font-size: 4.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-primary);
}

.message-text--sent {
  color: var(--text-secondary);
  font-style: italic;
}

.message-empty {
  font-family: var(--font-display);
  font-size: 1.8rem;
  font-weight: 300;
  font-style: italic;
  color: var(--text-secondary);
}

.message-time {
  font-size: 1rem;
  color: var(--text-secondary);
  letter-spacing: 0.03em;
}

.record-cta {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--text-secondary);
}

.record-cta-key {
  width: 40px;
  height: 40px;
  border: 1.5px solid var(--text-dim);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.key-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-dim);
}

.record-cta-text {
  font-size: 1rem;
  letter-spacing: 0.02em;
}

.contact-nav {
  display: flex;
  align-items: center;
  gap: 32px;
  margin-top: 8px;
}

.nav-arrow {
  font-size: 1.4rem;
  color: var(--text-secondary);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  border: 1px solid var(--border);
  transition: all 0.2s;
  cursor: none;
}

.nav-name {
  font-family: var(--font-display);
  font-size: 1.4rem;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  min-width: 100px;
  text-align: center;
}

/* ── RECORDING screen ── */
.screen-recording {
  position: fixed;
  inset: 0;
  max-width: 100%;
  background: var(--bg);
  padding: 0;
  justify-content: center;
  gap: 24px;
  z-index: 10;
}

.pulse-ring {
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid var(--danger);
  animation: pulse-ring 2.4s ease-out infinite;
  pointer-events: none;
}

.pulse-ring--1 { width: 160px; height: 160px; animation-delay: 0s; }
.pulse-ring--2 { width: 160px; height: 160px; animation-delay: 0.8s; }
.pulse-ring--3 { width: 160px; height: 160px; animation-delay: 1.6s; }

.mic-wrap {
  position: relative;
  z-index: 2;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--danger);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 60px var(--danger-glow), 0 0 120px var(--danger-glow);
  animation: mic-breathe 1.2s ease-in-out infinite;
}

.mic-svg {
  width: 52px;
  height: 52px;
  color: white;
}

.recording-label {
  font-family: var(--font-display);
  font-size: 2.2rem;
  font-weight: 300;
  color: var(--text-primary);
  z-index: 2;
  margin-top: 12px;
}

.live-transcript {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 2.5vw, 2.2rem);
  font-style: italic;
  color: var(--text-secondary);
  text-align: center;
  max-width: 700px;
  line-height: 1.4;
  z-index: 2;
  animation: slide-up 0.2s ease;
}

.recording-hint {
  font-size: 0.95rem;
  color: var(--text-dim);
  letter-spacing: 0.05em;
  z-index: 2;
}

/* ── SENT screen ── */
.screen-sent {
  gap: 24px;
}

.sent-check {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--success);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.6rem;
  color: white;
  animation: checkmark-pop 0.5s var(--ease-spring) forwards;
  box-shadow: 0 0 48px rgba(78, 171, 122, 0.3);
}

.sent-to {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 300;
  color: var(--text-secondary);
}

.sent-to strong { color: var(--text-primary); font-weight: 600; }

.sent-preview {
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 2vw, 1.8rem);
  font-style: italic;
  color: var(--text-secondary);
  text-align: center;
  max-width: 600px;
  line-height: 1.4;
}

.sent-hint {
  font-size: 0.85rem;
  color: var(--text-dim);
  letter-spacing: 0.04em;
  margin-top: 16px;
}

/* ── INCOMING screen ── */
.screen-incoming {
  gap: 32px;
}

.incoming-from {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 1.1rem;
  color: var(--text-secondary);
  font-family: var(--font-display);
}

.incoming-text {
  font-family: var(--font-display);
  font-size: 4.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-primary);
  text-align: center;
  max-width: 800px;
  letter-spacing: -0.02em;
  animation: slide-up 0.35s ease;
}

.incoming-hint {
  font-size: 0.9rem;
  color: var(--text-dim);
  letter-spacing: 0.04em;
}
</style>
