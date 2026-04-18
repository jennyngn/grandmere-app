<template>
  <div class="login-page">
    <header class="header">
      <div class="logo">Bà</div>
      <NuxtLink to="/" class="switch-link">Vue grand-mère →</NuxtLink>
    </header>

    <div class="content">
      <Transition name="fade" mode="out-in">

        <!-- ── Sélection de profil ── -->
        <div v-if="step === 'pick'" key="pick" class="step-pick">
          <h1 class="title">Qui êtes-vous ?</h1>
          <p class="subtitle">Choisissez votre profil pour accéder à votre conversation avec Bà</p>

          <div class="profiles-grid">
            <button
              v-for="contact in contacts"
              :key="contact.id"
              class="profile-card"
              @click="selectProfile(contact)"
            >
              <div class="profile-avatar" :style="{ background: contact.color }">
                {{ contact.initials }}
              </div>
              <div class="profile-name">{{ contact.name }}</div>
              <div v-if="unread[contact.id] > 0" class="profile-badge">
                {{ unread[contact.id] }}
              </div>
            </button>
          </div>

          <p class="demo-hint">Démo : chaque profil a un code à 4 chiffres répétés (1111, 2222…)</p>
        </div>

        <!-- ── Saisie du code PIN ── -->
        <div v-else-if="step === 'pin'" key="pin" class="step-pin">
          <button class="back-btn" @click="backToPick">← Changer de profil</button>

          <div class="pin-profile">
            <div class="pin-avatar" :style="{ background: selectedContact.color }">
              {{ selectedContact.initials }}
            </div>
            <div class="pin-name">{{ selectedContact.name }}</div>
          </div>

          <p class="pin-label">Entrez votre code</p>

          <!-- Dots progress -->
          <div class="pin-dots" :class="{ 'pin-dots--error': pinError }">
            <span
              v-for="i in 4"
              :key="i"
              :class="['dot', { 'dot--filled': pin.length >= i }]"
              :style="pin.length >= i ? { background: selectedContact.color } : {}"
            />
          </div>

          <p v-if="pinError" class="pin-error">Code incorrect, réessayez</p>

          <!-- Numpad -->
          <div class="numpad">
            <button
              v-for="n in [1, 2, 3, 4, 5, 6, 7, 8, 9]"
              :key="n"
              class="num-btn"
              @click="addDigit(n)"
            >{{ n }}</button>
            <button class="num-btn num-btn--action" @click="deleteDigit">
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                <line x1="18" y1="9" x2="12" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <line x1="12" y1="9" x2="18" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
            <button class="num-btn" @click="addDigit(0)">0</button>
            <button class="num-btn num-btn--action" @click="backToPick">✕</button>
          </div>
        </div>

      </Transition>
    </div>
  </div>
</template>

<script setup>
import { useContacts } from '~/composables/useContacts'
import { useMessages } from '~/composables/useMessages'
import { useAuth }     from '~/composables/useAuth'

definePageMeta({ ssr: false })

const router = useRouter()
const { contacts, getContact } = useContacts()
const { getUnreadCount }       = useMessages()
const { login, isAuthorized }  = useAuth()

const step            = ref('pick')
const selectedContact = ref(null)
const pin             = ref('')
const pinError        = ref(false)

const unread = computed(() =>
  Object.fromEntries(contacts.value.map(c => [c.id, getUnreadCount(c.id).value]))
)

// Si déjà connecté, rediriger directement
onMounted(() => {
  contacts.value.forEach(c => {
    if (isAuthorized(c.id)) router.replace(`/famille/${c.id}`)
  })
})

const selectProfile = (contact) => {
  selectedContact.value = contact
  pin.value = ''
  pinError.value = false
  step.value = 'pin'
}

const backToPick = () => {
  step.value = 'pick'
  selectedContact.value = null
  pin.value = ''
  pinError.value = false
}

const addDigit = (digit) => {
  if (pin.value.length >= 4) return
  pin.value += digit
  if (pin.value.length === 4) checkPin()
}

const deleteDigit = () => {
  pin.value = pin.value.slice(0, -1)
  pinError.value = false
}

const checkPin = () => {
  if (pin.value === selectedContact.value.pin) {
    login(selectedContact.value.id)
    router.push(`/famille/${selectedContact.value.id}`)
  } else {
    pinError.value = true
    setTimeout(() => {
      pin.value = ''
      pinError.value = false
    }, 800)
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  flex-direction: column;
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 48px;
  border-bottom: 1px solid var(--border);
}

.logo {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.switch-link {
  font-size: 0.85rem;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--text-dim);
  padding-bottom: 1px;
  transition: color 0.2s;
}
.switch-link:hover { color: var(--accent); }

/* ── Content ── */
.content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

/* ── Step: pick ── */
.step-pick {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 640px;
}

.title {
  font-family: var(--font-display);
  font-size: 2.6rem;
  font-weight: 300;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  text-align: center;
}

.subtitle {
  font-size: 0.95rem;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.5;
  margin-bottom: 16px;
}

.profiles-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  width: 100%;
}

.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 28px 20px;
  border-radius: var(--radius);
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  transition: all 0.25s var(--ease-spring);
  position: relative;
  cursor: pointer;
}

.profile-card:hover {
  border-color: var(--accent);
  background: var(--bg-card-hover);
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.15);
}

.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  color: rgba(255,255,255,0.92);
}

.profile-name {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--text-primary);
}

.profile-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--danger);
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 0.68rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.demo-hint {
  margin-top: 8px;
  font-size: 0.75rem;
  color: var(--text-dim);
  letter-spacing: 0.03em;
  font-style: italic;
}

/* ── Step: PIN ── */
.step-pin {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  max-width: 340px;
  position: relative;
}

.back-btn {
  align-self: flex-start;
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 0;
  transition: color 0.2s;
  letter-spacing: 0.03em;
}
.back-btn:hover { color: var(--accent); }

.pin-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.pin-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
  color: rgba(255,255,255,0.92);
}

.pin-name {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--text-primary);
}

.pin-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
}

/* Dots */
.pin-dots {
  display: flex;
  gap: 16px;
  margin: 4px 0;
}

.pin-dots--error {
  animation: shake 0.5s ease;
}

.dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--text-dim);
  background: transparent;
  transition: all 0.15s var(--ease-spring);
}

.dot--filled {
  border-color: transparent;
  transform: scale(1.1);
}

.pin-error {
  font-size: 0.82rem;
  color: var(--danger);
  letter-spacing: 0.03em;
  height: 18px;
}

/* Numpad */
.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
}

.num-btn {
  height: 64px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.num-btn:hover {
  background: var(--bg-card-hover);
  border-color: var(--accent);
}

.num-btn:active {
  transform: scale(0.94);
}

.num-btn--action {
  font-size: 1rem;
  color: var(--text-secondary);
}
</style>
