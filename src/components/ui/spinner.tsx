interface SpinnerProps {
  className?: string
  /**
   * Stroke color. Defaults to `currentColor` so callers can tint via
   * `text-*` classes. Pass an explicit value (e.g. a persona accent hex)
   * when the spinner sits on a surface where `text-*` would be wrong.
   */
  color?: string
}

export function Spinner({ className, color = 'currentColor' }: SpinnerProps) {
  return (
    <svg
      aria-label="Loading"
      className={`animate-spin ${className ?? ''}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="2"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
