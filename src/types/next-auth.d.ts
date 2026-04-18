import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      githubLogin?: string
    } & DefaultSession['user']
  }

  interface User {
    githubLogin?: string | null
  }

  interface Profile {
    login?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
    githubLogin?: string
    hasGithubToken?: boolean
  }
}
