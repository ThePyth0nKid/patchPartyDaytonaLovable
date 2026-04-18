export function BrandMark() {
  return (
    <span
      aria-hidden
      className="relative flex items-center justify-center h-7 w-7 rounded-[7px] overflow-hidden"
      style={{
        background:
          'conic-gradient(from 0deg, #E879F9, #A78BFA, #60A5FA, #14B8A6, #E879F9)',
      }}
    >
      <span className="absolute inset-[2px] rounded-[5px] bg-slate-950 flex items-center justify-center font-mono text-[10px] font-semibold tracking-[0.08em] text-slate-50">
        PP
      </span>
    </span>
  )
}
