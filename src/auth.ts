import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './lib/prisma'

// Scopes:
//   read:user    — get the authenticated user's profile (login, avatar)
//   public_repo  — read public repos and open PRs against them
//   repo         — read/write access to private repos the user chooses to work with
// Kept in sync with the consent screen copy in src/app/login/page.tsx.
const GITHUB_SCOPES = 'read:user public_repo repo'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  trustHost: true,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: { params: { scope: GITHUB_SCOPES } },
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
          githubLogin: profile.login,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.userId = user.id
      }
      if (profile && typeof profile.login === 'string') {
        token.githubLogin = profile.login
      }
      if (account?.provider === 'github' && account.access_token) {
        // The access_token is also persisted on the Account row via the adapter.
        // We stash it on the JWT only as a transient hint — never read it from here
        // for API calls; always load the fresh token from Account in server code.
        token.hasGithubToken = true
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = token.userId as string
      }
      if (token.githubLogin && session.user) {
        session.user.githubLogin = token.githubLogin as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
