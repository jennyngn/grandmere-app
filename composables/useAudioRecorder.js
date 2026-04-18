export const useAudioRecorder = () => {
  const isRecording    = ref(false)
  const audioBlob      = ref(null)
  const audioUrl       = ref(null)
  const transcript     = ref('')
  const interimText    = ref('')
  const permissionErr  = ref(false)

  let mediaRecorder = null
  let audioChunks   = []
  let stream        = null
  let recognition   = null

  const startRecording = async () => {
    permissionErr.value = false
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {
      permissionErr.value = true
      return
    }

    audioChunks = []
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    mediaRecorder = new MediaRecorder(stream, { mimeType })
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data) }
    mediaRecorder.start(100)

    // Web Speech API for live transcription
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SR) {
      recognition = new SR()
      recognition.lang = 'vi-VN'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.onresult = (e) => {
        let final = '', interim = ''
        for (const result of e.results) {
          if (result.isFinal) final += result[0].transcript + ' '
          else interim += result[0].transcript
        }
        transcript.value  = final.trim()
        interimText.value = interim.trim()
      }
      try { recognition.start() } catch {}
    }

    isRecording.value = true
  }

  // Returns a Promise<Blob|null> that resolves when the audio is ready
  const stopRecording = () =>
    new Promise((resolve) => {
      if (recognition) { try { recognition.stop() } catch {}; recognition = null }

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
        isRecording.value = false
        resolve(null)
        return
      }

      mediaRecorder.addEventListener('stop', () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' })
        audioBlob.value = blob
        audioUrl.value  = URL.createObjectURL(blob)
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
        isRecording.value = false
        resolve(blob)
      }, { once: true })

      mediaRecorder.stop()
    })

  const reset = () => {
    if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
    audioBlob.value  = null
    audioUrl.value   = null
    transcript.value = ''
    interimText.value = ''
  }

  return { isRecording, audioBlob, audioUrl, transcript, interimText, permissionErr, startRecording, stopRecording, reset }
}
