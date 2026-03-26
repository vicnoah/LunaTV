import { useCallback, useRef, useState } from 'react'

export interface UseVoiceChatReturn {
  isRecording: boolean
  startRecording: () => Promise<void>
  stopRecording: () => void
  audioLevel: number
  error: string | null
}

export function useVoiceChat(): UseVoiceChatReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setError(null)
      mediaRecorder.start()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording')
    }
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    setIsRecording(false)
    setAudioLevel(0)
  }, [])

  return { isRecording, startRecording, stopRecording, audioLevel, error }
}
