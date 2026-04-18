// Thin structured-logging wrapper. Output is one JSON line per event so
// Railway's log explorer can filter by level/tag.
//
// Replace with pino / Sentry later — the call sites won't change.

type Level = 'info' | 'warn' | 'error'

interface LogFields {
  [key: string]: unknown
}

function emit(level: Level, msg: string, fields?: LogFields): void {
  const record = {
    level,
    msg,
    ts: new Date().toISOString(),
    ...(fields ?? {}),
  }
  const line = JSON.stringify(record)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const log = {
  info: (msg: string, fields?: LogFields) => emit('info', msg, fields),
  warn: (msg: string, fields?: LogFields) => emit('warn', msg, fields),
  error: (msg: string, fields?: LogFields) => emit('error', msg, fields),
}
