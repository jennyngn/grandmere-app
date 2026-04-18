<template>
  <div class="conversation">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <div class="avatar" :style="{ background: contact?.color }">{{ contact?.initials }}</div>
        <div>
          <div class="header-name">{{ contact?.name }}</div>
          <div class="header-sub">Votre conversation avec Bà</div>
        </div>
      </div>
      <button class="translate-toggle" :class="{ 'translate-toggle--on': translateOn }" @click="toggleTranslation">
        <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
          <path d="M3 5h12M9 3v2m4.5 13.5L12 17m0 0-2.5-3.5M12 17c1-2 1.5-4 1.5-6M6 10c.5 2 1.5 3.5 3 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14 14h7m-3.5-3.5L21 14l-3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ translateOn ? 'Traduction ON' : 'Traduire en français' }}
      </button>
      <button class="logout-btn" @click="handleLogout">
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <polyline points="16 17 21 12 16 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        Se déconnecter
      </button>
    </header>

    <!-- Messages -->
    <div class="messages-scroll" ref="scrollEl">
      <div class="messages-inner">
        <div v-if="conversationMessages.length === 0" class="empty-state">
          <p>Aucun message pour l'instant</p>
          <p class="empty-sub">Bà vous enverra un message vocal d'ici peu</p>
        </div>

        <div
          v-for="msg in conversationMessages"
          :key="msg.id"
          :class="['msg-row', msg.direction === 'sent' ? 'msg-row--grandma' : 'msg-row--family']"
        >
          <!-- Sender label -->
          <p class="msg-sender">
            {{ msg.direction === 'sent' ? 'Bà' : 'Vous' }}
            <span class="msg-time">{{ formatTime(msg.timestamp) }}</span>
          </p>

          <!-- Bubble -->
          <div :class="['bubble', msg.direction === 'sent' ? 'bubble--grandma' : 'bubble--family']">
            <p class="bubble-text">{{ msg.text }}</p>

            <!-- Translation -->
            <div v-if="translateOn && msg.direction === 'sent'" class="translation-row">
              <span class="translation-flag">🇫🇷</span>
              <span v-if="translationCache[msg.id]" class="translation-text">{{ translationCache[msg.id] }}</span>
              <span v-else class="translation-loading">Traduction…</span>
            </div>

            <!-- Audio player -->
            <div v-if="msg.direction === 'sent' && msg.audio_url" class="audio-row">
              <button class="audio-btn" @click="playAudio(msg)">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Écouter le message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reply area -->
    <footer class="reply-area">
      <div class="reply-box">
        <textarea
          v-model="replyText"
          class="reply-input"
          placeholder="Tapez votre réponse…"
          rows="2"
          @keydown.enter.exact.prevent="sendReply"
        />
        <button
          class="send-btn"
          :class="{ 'send-btn--active': replyText.trim() }"
          :disabled="!replyText.trim()"
          @click="sendReply"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
      <p class="reply-hint">Entrée pour envoyer · Maj+Entrée pour saut de ligne</p>
    </footer>
  </div>
</template>

<script setup>
import { useContacts }    from '~/composables/useContacts'
import { useMessages }    from '~/composables/useMessages'
import { useAuth }        from '~/composables/useAuth'
import { useTranslation } from '~/composables/useTranslation'

definePageMeta({ ssr: false, pageTransition: { name: 'page', mode: 'out-in' } })

const route  = useRoute()
const router = useRouter()
const { getContact }                                    = useContacts()
const { getMessagesForContact, addMessage, markAsRead } = useMessages()
const { isAuthorized, logout }                          = useAuth()

const contactId           = computed(() => route.params.id)
const contact             = computed(() => getContact(contactId.value))
const conversationMessages = computed(() => getMessagesForContact(contactId.value).value)

const replyText       = ref('')
const scrollEl        = ref(null)
const translateOn     = ref(false)
const translationCache = reactive({})
const { translate }   = useTranslation()

const translateAll = async () => {
  const grandmaMsgs = conversationMessages.value.filter(m => m.direction === 'sent')
  for (const msg of grandmaMsgs) {
    if (!translationCache[msg.id] && msg.text && msg.text !== '[message vocal]') {
      translationCache[msg.id] = await translate(msg.text)
    }
  }
}

const toggleTranslation = async () => {
  translateOn.value = !translateOn.value
  if (translateOn.value) await translateAll()
}

// Translate new messages as they arrive when toggle is on
watch(conversationMessages, async (msgs) => {
  if (!translateOn.value) return
  const latest = msgs.filter(m => m.direction === 'sent' && !translationCache[m.id])
  for (const msg of latest) {
    if (msg.text && msg.text !== '[message vocal]') {
      translationCache[msg.id] = await translate(msg.text)
    }
  }
})

const formatTime = (ts) => {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return `${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  }
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short',
                                          hour: '2-digit', minute: '2-digit' })
}

const scrollToBottom = async () => {
  await nextTick()
  if (scrollEl.value) {
    scrollEl.value.scrollTop = scrollEl.value.scrollHeight
  }
}

const sendReply = async () => {
  const text = replyText.value.trim()
  if (!text) return
  replyText.value = ''
  // 'received' = from family's perspective, grandma will see it as incoming
  await addMessage(contactId.value, 'received', text, null)
  await scrollToBottom()
}

const playAudio = (msg) => {
  if (!msg.audio_url) return
  const audio = new Audio(msg.audio_url)
  audio.play().catch(() => {})
}

const handleLogout = () => {
  logout()
  router.replace('/famille')
}

onMounted(() => {
  if (!isAuthorized(contactId.value)) {
    router.replace('/famille')
    return
  }
  markAsRead(contactId.value)
  scrollToBottom()
})

// Auto-scroll on new messages
watch(conversationMessages, () => scrollToBottom())
</script>

<style scoped>
.conversation {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg);
  cursor: default;
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 36px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  flex-shrink: 0;
}

.header-name {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: 0.04em;
}

.header-sub {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 1px;
}

.translate-toggle {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 7px 14px;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.03em;
}
.translate-toggle:hover { border-color: var(--accent); color: var(--accent); }
.translate-toggle--on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg);
}
.translate-toggle--on:hover { background: var(--accent-hover); border-color: var(--accent-hover); color: var(--bg); }

.translation-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}
.translation-flag { font-size: 0.85rem; flex-shrink: 0; margin-top: 1px; }
.translation-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
  font-style: italic;
}
.translation-loading {
  font-size: 0.82rem;
  color: var(--text-dim);
  font-style: italic;
  animation: pulse-opacity 1.2s ease-in-out infinite;
}
@keyframes pulse-opacity {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 7px 14px;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.03em;
}
.logout-btn:hover { border-color: var(--danger); color: var(--danger); }

/* ── Messages ── */
.messages-scroll {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.messages-scroll::-webkit-scrollbar { width: 4px; }
.messages-scroll::-webkit-scrollbar-track { background: transparent; }
.messages-scroll::-webkit-scrollbar-thumb { background: var(--bg-card); border-radius: 2px; }

.messages-inner {
  max-width: 680px;
  margin: 0 auto;
  padding: 36px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.empty-state {
  text-align: center;
  padding: 60px 0;
  color: var(--text-secondary);
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 300;
}
.empty-sub { margin-top: 8px; font-size: 0.88rem; color: var(--text-dim); }

.msg-row { display: flex; flex-direction: column; gap: 6px; }
.msg-row--grandma { align-items: flex-start; }
.msg-row--family  { align-items: flex-end; }

.msg-sender {
  font-size: 0.75rem;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
  padding: 0 4px;
}

.msg-time {
  color: var(--text-dim);
  margin-left: 8px;
}

.bubble {
  max-width: 75%;
  border-radius: 18px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bubble--grandma {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-bottom-left-radius: 4px;
}

.bubble--family {
  background: var(--accent);
  border-bottom-right-radius: 4px;
}

.bubble-text {
  font-family: var(--font-display);
  font-size: 1.15rem;
  line-height: 1.5;
  color: var(--text-primary);
}

.bubble--family .bubble-text {
  color: var(--bg);
}

.audio-row { display: flex; }

.audio-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  transition: all 0.2s;
  cursor: pointer;
}
.audio-btn:hover { border-color: var(--accent); color: var(--accent); }

/* ── Reply area ── */
.reply-area {
  border-top: 1px solid var(--border);
  padding: 20px 36px 24px;
  flex-shrink: 0;
  background: var(--bg-surface);
}

.reply-box {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.reply-input {
  flex: 1;
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  padding: 14px 20px;
  font-family: var(--font-ui);
  font-size: 0.95rem;
  color: var(--text-primary);
  resize: none;
  line-height: 1.5;
  transition: border-color 0.2s;
  outline: none;
}

.reply-input::placeholder { color: var(--text-dim); }
.reply-input:focus { border-color: var(--accent); }

.send-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--text-dim);
  color: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s var(--ease-spring);
  flex-shrink: 0;
  cursor: pointer;
  border: none;
}

.send-btn--active {
  background: var(--accent);
  box-shadow: 0 4px 20px var(--accent-glow);
  transform: scale(1.08);
}

.send-btn:disabled { cursor: default; }

.reply-hint {
  max-width: 680px;
  margin: 8px auto 0;
  font-size: 0.72rem;
  color: var(--text-dim);
  letter-spacing: 0.03em;
}
</style>
