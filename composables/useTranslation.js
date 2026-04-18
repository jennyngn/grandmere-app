const cache = new Map()

export const useTranslation = () => {
  const translate = async (text, from = 'vi', to = 'fr') => {
    if (!text?.trim()) return ''
    const key = `${from}|${to}|${text}`
    if (cache.has(key)) return cache.get(key)

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}%7C${to}`
      const res  = await fetch(url)
      const data = await res.json()
      const result = data.responseData?.translatedText ?? text
      cache.set(key, result)
      return result
    } catch {
      return text
    }
  }

  return { translate }
}
