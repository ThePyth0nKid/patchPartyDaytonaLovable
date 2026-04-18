import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import LandingClient from './landing-client'

export default async function HomePage() {
  const session = await auth()
  if (session?.user?.id) {
    redirect('/app')
  }
  return <LandingClient />
}
