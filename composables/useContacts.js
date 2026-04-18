export const useContacts = () => {
  const contacts = ref([
    { id: 'nghi',  name: 'NGHI',  initials: 'NG', color: '#4a6e9a', pin: '1111' },
    { id: 'betty', name: 'BETTY', initials: 'BE', color: '#8a4e7a', pin: '2222' },
    { id: 'cun',   name: 'CUN',   initials: 'CU', color: '#4a8a5e', pin: '3333' },
    { id: 'anne',  name: 'ANNE',  initials: 'AN', color: '#9a7a4a', pin: '4444' },
  ])

  const getContact = (id) => contacts.value.find(c => c.id === id) || null

  return { contacts, getContact }
}
