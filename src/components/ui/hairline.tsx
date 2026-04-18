interface HairlineProps {
  color?: string
  className?: string
}

export function Hairline({ color = '#A78BFA', className }: HairlineProps) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        height: 1,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
      }}
    />
  )
}
