import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, Send, Loader2, CheckCircle2, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const feedbackMutation = useMutation({
    mutationFn: () => api.submitFeedback({ message }),
    onSuccess: () => {
      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        setMessage('')
        onClose()
      }, 1800)
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 mb-20 sm:mb-4 rounded-2xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
          <h2 className="font-bold text-lg">Feedback geben</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {submitted ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            </div>
            <p className="font-semibold text-lg">Danke!</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Dein Feedback hilft uns, Sculpt zu verbessern.
            </p>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-3">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Was können wir verbessern? Bugs, Ideen, Wünsche — alles hilft!
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Dein Feedback..."
                rows={5}
                autoFocus
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-soft))] p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/40 focus:border-[hsl(var(--primary))] transition-all placeholder:text-[hsl(var(--muted-foreground))]"
              />
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
                onClick={() => {
                  // Image upload placeholder — can be expanded later
                }}
              >
                <ImagePlus className="w-4 h-4" />
                Bild hinzufügen (bald verfügbar)
              </button>
            </div>

            <div className="p-4 border-t border-[hsl(var(--border))] flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Abbrechen
              </Button>
              <Button
                className="flex-1"
                disabled={!message.trim() || feedbackMutation.isPending}
                onClick={() => feedbackMutation.mutate()}
              >
                {feedbackMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Absenden
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
