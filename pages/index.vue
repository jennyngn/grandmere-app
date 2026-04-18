<template>
  <div class="home">
    <!-- Ambient color shifts with selected contact -->
    <div class="ambient" :style="ambientStyle" />

    <!-- Top bar -->
    <header class="topbar">
      <span class="time">{{ currentTime }}</span>
      <span class="greeting">Bonjour, <em>Bà</em></span>
    </header>

    <!-- Question -->
    <p class="question">À qui veux-tu parler ?</p>

    <!-- Contact cards -->
    <div class="contacts-row">
      <div
        v-for="(contact, i) in contacts"
        :key="contact.id"
        :class="['card', {
          'card--active': selectedIndex === i,
          'card--near':   Math.abs(i - selectedIndex) === 1,
          'card--far':    Math.abs(i - selectedIndex) > 1,
        }]"
      >
        <div class="card-stripe" :style="{ background: contact.color }" />
        <div class="card-name">{{ contact.name }}</div>
        <div v-if="unreadCounts[contact.id] > 0" class="badge">{{ unreadCounts[contact.id] }}</div>
      </div>
    </div>

    <!-- Large selected name -->
    <div class="selected-name" :key="selectedIndex">
      {{ contacts[selectedIndex]?.name }}
    </div>

    <!-- Keyboard hints -->
    <footer class="hints">
      <div class="hint">
        <kbd>←</kbd> <kbd>→</kbd> <span>Naviguer</span>
      </div>
      <div class="hint-dot">·</div>
      <div class="hint">
        <kbd>Entrée</kbd> <span>Choisir</span>
      </div>
      <div class="hint-dot">·</div>
      <NuxtLink to="/famille" class="famille-link">Vue famille →</NuxtLink>
    </footer>
  </div>
</template>

<script setup>
import { useContacts }  from '~/composables/useContacts'
import { useMessages }  from '~/composables/useMessages'

definePageMeta({ ssr: false, pageTransition: { name: 'page', mode: 'out-in' } })
useHead({ bodyAttrs: { class: 'grandma' } })

const router = useRouter()
const { contacts }       = useContacts()
const { getUnreadCount } = useMessages()

const selectedIndex = ref(0)
const currentTime   = ref('--:--')

const unreadCounts = computed(() =>
  Object.fromEntries(contacts.value.map(c => [c.id, getUnreadCount(c.id).value]))
)

const AMBIENT_COLORS = ['#4a6e9a', '#8a4e7a', '#4a8a5e', '#9a7a4a']
const ambientStyle = computed(() => ({
  background: `radial-gradient(ellipse 70% 55% at 50% 65%, ${AMBIENT_COLORS[selectedIndex.value]}1a 0%, transparent 70%)`
}))

const updateTime = () => {
  currentTime.value = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
updateTime()

const onKey = (e) => {
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value - 1 + contacts.value.length) % contacts.value.length
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % contacts.value.length
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    const c = contacts.value[selectedIndex.value]
    if (c) router.push(`/chat/${c.id}`)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  const t = setInterval(updateTime, 30_000)
  onUnmounted(() => { window.removeEventListener('keydown', onKey); clearInterval(t) })
})
</script>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 60px;
  position: relative;
  overflow: hidden;
  cursor: none;
}

.ambient {
  position: fixed;
  inset: 0;
  transition: background 1s ease;
  pointer-events: none;
}

/* ── Top bar ── */
.topbar {
  position: fixed;
  top: 36px;
  left: 60px;
  right: 60px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.time {
  font-family: var(--font-display);
  font-size: 1.1rem;
  color: var(--text-secondary);
  letter-spacing: 0.12em;
}

.greeting {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 300;
  color: var(--text-secondary);
}

.greeting em {
  font-style: italic;
  color: var(--accent);
  font-weight: 400;
}

/* ── Question ── */
.question {
  font-family: var(--font-display);
  font-size: 4.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 56px;
  letter-spacing: -0.01em;
}

/* ── Contact cards ── */
.contacts-row {
  display: flex;
  gap: 18px;
  align-items: center;
  margin-bottom: 52px;
}

.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 0;
  border-radius: var(--radius);
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  transition: all 0.35s var(--ease-spring);
  position: relative;
  cursor: none;
  overflow: hidden;
  min-width: 120px;
}

.card--active {
  border-color: var(--accent);
  background: var(--bg-card-hover);
  transform: scale(1.14) translateY(-4px);
  box-shadow: 0 0 0 1px var(--border-accent),
              0 0 48px var(--accent-glow),
              0 24px 48px rgba(0,0,0,0.4);
  animation: glow-pulse 2.5s ease-in-out infinite;
}

.card--near { opacity: 0.55; transform: scale(0.93); }
.card--far  { opacity: 0.28; transform: scale(0.85); }

.card-stripe {
  width: 100%;
  height: 5px;
  flex-shrink: 0;
}

.card-name {
  font-family: var(--font-display);
  font-size: 1.45rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--text-primary);
  padding: 18px 28px;
}

.badge {
  position: absolute;
  top: 14px;
  right: 14px;
  background: var(--danger);
  color: white;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Selected name ── */
.selected-name {
  font-family: var(--font-display);
  font-size: clamp(3.5rem, 6vw, 6rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  color: var(--text-primary);
  line-height: 1;
  margin-bottom: 48px;
  animation: slide-up 0.3s ease;
}

/* ── Hints ── */
.hints {
  position: fixed;
  bottom: 40px;
  display: flex;
  align-items: center;
  gap: 20px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.hint { display: flex; align-items: center; gap: 8px; }

.hint-dot { color: var(--text-dim); }

kbd {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 6px;
  padding: 3px 10px;
  font-family: var(--font-ui);
  font-size: 0.78rem;
  color: var(--text-primary);
  letter-spacing: 0.04em;
}

.famille-link {
  color: var(--text-secondary);
  font-size: 0.82rem;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--text-dim);
  padding-bottom: 1px;
  transition: color 0.2s;
  cursor: pointer;
}
.famille-link:hover { color: var(--accent); }
</style>
