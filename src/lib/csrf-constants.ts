// Shared CSRF header constants used by both server and client code.
//
// Kept free of server-only imports (`next/server`) so the client bundle
// doesn't transitively pull Next.js server internals. The server guard
// lives in `./csrf.ts`, which re-exports these for convenience.

export const CSRF_HEADER = 'x-patchparty-request'
export const CSRF_HEADER_VALUE = '1'
