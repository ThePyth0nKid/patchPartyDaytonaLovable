// Simple in-memory party store. For hackathon MVP — no DB needed.
// Replace with Redis/Postgres post-hackathon.

import { Party, PartyEvent } from './types'

class PartyStore {
  private parties = new Map<string, Party>()
  private listeners = new Map<string, Set<(event: PartyEvent) => void>>()

  create(party: Party): void {
    this.parties.set(party.id, party)
    this.listeners.set(party.id, new Set())
  }

  get(id: string): Party | undefined {
    return this.parties.get(id)
  }

  update(id: string, updater: (p: Party) => Party): void {
    const existing = this.parties.get(id)
    if (!existing) return
    const updated = updater(existing)
    this.parties.set(id, updated)
  }

  subscribe(id: string, listener: (event: PartyEvent) => void): () => void {
    const set = this.listeners.get(id)
    if (!set) return () => {}
    set.add(listener)
    return () => set.delete(listener)
  }

  emit(id: string, event: PartyEvent): void {
    const set = this.listeners.get(id)
    if (!set) return
    set.forEach((listener) => {
      try {
        listener(event)
      } catch (e) {
        console.error('Listener error:', e)
      }
    })
  }
}

// Global singleton — survives hot reloads in dev
const globalForStore = globalThis as unknown as { partyStore?: PartyStore }
export const partyStore = globalForStore.partyStore ?? new PartyStore()
if (process.env.NODE_ENV !== 'production') globalForStore.partyStore = partyStore
