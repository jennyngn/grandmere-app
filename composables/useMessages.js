export const useMessages = () => {
  const supabase = useSupabase()
  const messages = ref([])

  const load = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: true })
    if (data) messages.value = data
  }

  // Seed demo messages on first use
  const seedDemo = async () => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
    if (count > 0) return
    const now = Date.now()
    await supabase.from('messages').insert([
      { id: '1', contact_id: 'nghi',  direction: 'received', text: 'Bonjour mamie ! Comment tu vas aujourd\'hui ?', audio_url: null, timestamp: now - 3_600_000, read: false },
      { id: '2', contact_id: 'betty', direction: 'received', text: 'Je viendrai te voir dimanche, je t\'apporte des gâteaux !', audio_url: null, timestamp: now - 7_200_000, read: false },
      { id: '3', contact_id: 'cun',   direction: 'sent',     text: 'Merci pour les fleurs, elles sont très belles', audio_url: null, timestamp: now - 86_400_000, read: true },
    ])
    await load()
  }

  // Realtime subscription
  const subscribe = () => {
    supabase
      .channel('messages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async () => {
        await load()
      })
      .subscribe()
  }

  const getMessagesForContact = (contactId) =>
    computed(() => messages.value
      .filter(m => m.contact_id === contactId)
      .sort((a, b) => a.timestamp - b.timestamp))

  const getLastReceivedFrom = (contactId) =>
    computed(() => {
      const received = messages.value
        .filter(m => m.contact_id === contactId && m.direction === 'received')
        .sort((a, b) => b.timestamp - a.timestamp)
      return received[0] || null
    })

  const getLastMessage = (contactId) =>
    computed(() => {
      const all = messages.value
        .filter(m => m.contact_id === contactId)
        .sort((a, b) => b.timestamp - a.timestamp)
      return all[0] || null
    })

  const getUnreadCount = (contactId) =>
    computed(() => messages.value.filter(
      m => m.contact_id === contactId && m.direction === 'received' && !m.read
    ).length)

  const addMessage = async (contactId, direction, text, audioBlob = null) => {
    let audio_url = null
    if (audioBlob instanceof Blob) {
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.webm`
      const { data: uploadData } = await supabase.storage
        .from('audio')
        .upload(filename, audioBlob, { contentType: 'audio/webm' })
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('audio').getPublicUrl(filename)
        audio_url = urlData.publicUrl
      }
    }
    const msg = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      contact_id: contactId,
      direction,
      text,
      audio_url,
      timestamp: Date.now(),
      read: direction === 'sent'
    }
    await supabase.from('messages').insert([msg])
    return msg
  }

  const markAsRead = async (contactId) => {
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('contact_id', contactId)
      .eq('direction', 'received')
      .eq('read', false)
    messages.value = messages.value.map(m =>
      m.contact_id === contactId && m.direction === 'received' ? { ...m, read: true } : m
    )
  }

  if (process.client) {
    load().then(() => seedDemo())
    subscribe()
  }

  return { messages, load, getMessagesForContact, getLastReceivedFrom, getLastMessage, getUnreadCount, addMessage, markAsRead }
}
