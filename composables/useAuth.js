const SESSION_KEY = 'ba_famille_user'

export const useAuth = () => {
  const currentUser = ref(null)

  const load = () => {
    if (!process.client) return
    const stored = sessionStorage.getItem(SESSION_KEY)
    currentUser.value = stored ?? null
  }

  const login = (contactId) => {
    currentUser.value = contactId
    sessionStorage.setItem(SESSION_KEY, contactId)
  }

  const logout = () => {
    currentUser.value = null
    sessionStorage.removeItem(SESSION_KEY)
  }

  const isAuthorized = (contactId) => currentUser.value === contactId

  if (process.client) load()

  return { currentUser, login, logout, isAuthorized }
}
