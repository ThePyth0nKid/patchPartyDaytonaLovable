import { NextResponse } from 'next/server'
import { auth } from '@/auth'

const PROTECTED_PREFIXES = ['/app', '/api/party', '/api/github', '/api/usage']
const AUTH_OPEN_PREFIXES = ['/api/auth', '/login']
// SSE + preview proxy are already keyed by server-side state, not by user
// (party IDs are nanoid-random). Keep them public so iframes and EventSource
// work without tripping over auth redirects.
const PUBLIC_ROUTE_PREFIXES = ['/api/preview', '/api/party/']

export default auth((req) => {
  const { pathname } = req.nextUrl

  if (AUTH_OPEN_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isPublicStream = PUBLIC_ROUTE_PREFIXES.some((p) => pathname.startsWith(p))

  if (!needsAuth || isPublicStream) {
    return NextResponse.next()
  }

  if (!req.auth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.svg|.*\\.(?:png|jpg|svg)).*)'],
}
