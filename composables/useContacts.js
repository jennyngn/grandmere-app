const COLORS = ['#4a6e9a','#8a4e7a','#4a8a5e','#9a7a4a','#7a4a8a','#4a7a8a','#8a6a4a','#6a4a9a']

let initialized = false

export const useContacts = () => {
  const supabase = useSupabase()
  const contacts = useState('ba_contacts', () => [])

  const load = async () => {
    const { data } = await supabase.from('contacts').select('*').order('created_at')
    if (data) contacts.value = data
  }

  const getContact = (id) => contacts.value.find(c => c.id === id) || null

  const addContact = async (name, pin) => {
    const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now()
    const words = name.trim().split(/\s+/)
    const initials = words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase()
    const color = COLORS[contacts.value.length % COLORS.length]

    const contact = { id, name: name.trim().toUpperCase(), initials, color, pin }
    await supabase.from('contacts').insert([contact])
    contacts.value = [...contacts.value, contact]
    return contact
  }

  if (process.client && !initialized) {
    initialized = true
    load()
  }

  return { contacts, getContact, addContact, load }
}
