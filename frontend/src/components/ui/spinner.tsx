import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  size?: number
  className?: string
  text?: string
}

export function Spinner({ size = 24, className = '', text }: SpinnerProps) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 size={size} className="animate-spin text-primary" />
      {text && <span className="text-gray-500">{text}</span>}
    </div>
  )
}

export function LoadingOverlay({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner size={32} text={text} />
    </div>
  )
}
