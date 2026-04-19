// T4.3 — localStorage persistence for the in-progress Ship-PR draft.
//
// Problem: the user opens ShipSheet, edits the title/body, then closes
// the tab or navigates away before shipping. On reopen we'd lose the
// edit and regenerate from the preview, which is annoying and hides
// their intent. Scope: one draft per party, keyed by partyId so
// distinct parties don't collide.
//
// We only persist the three editable fields (title, body, type).
// Everything else (preview files, costs, loading state) is either
// derivable from the server or ephemeral.
//
// Design notes:
//   - parseShipDraft is separated out so unit tests can exercise the
//     validation path without needing a DOM.
//   - Any localStorage failure (quota, privacy mode, disabled) silently
//     degrades to no-op — we never want a storage error to block the
//     user from shipping.

export type ShipDraftType = 'feat' | 'fix'

export interface ShipDraft {
  title: string
  body: string
  type: ShipDraftType
}

const KEY_PREFIX = 'patchparty:ship:'

export function shipDraftKey(partyId: string): string {
  return `${KEY_PREFIX}${partyId}`
}

/** Validate a raw localStorage string back into a ShipDraft, or null if
 *  the payload is missing / malformed / tampered. Pure function so it
 *  can be unit-tested without a window. */
export function parseShipDraft(raw: string | null): ShipDraft | null {
  if (raw === null) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const obj = parsed as Record<string, unknown>
  if (typeof obj.title !== 'string') return null
  if (typeof obj.body !== 'string') return null
  if (obj.type !== 'feat' && obj.type !== 'fix') return null
  return { title: obj.title, body: obj.body, type: obj.type }
}

function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function loadShipDraft(partyId: string): ShipDraft | null {
  const storage = safeStorage()
  if (!storage) return null
  try {
    return parseShipDraft(storage.getItem(shipDraftKey(partyId)))
  } catch {
    return null
  }
}

export function saveShipDraft(partyId: string, draft: ShipDraft): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.setItem(shipDraftKey(partyId), JSON.stringify(draft))
  } catch {
    // Quota exceeded or storage disabled — silently drop. Losing a
    // draft is better than blocking the user.
  }
}

export function clearShipDraft(partyId: string): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.removeItem(shipDraftKey(partyId))
  } catch {
    // ignore
  }
}
