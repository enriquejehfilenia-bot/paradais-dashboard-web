'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuth } from '@/lib/auth'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    const auth = getAuth()
    if (!auth) { router.replace('/login'); return }
    router.replace(auth.role === 'admin' ? '/admin' : '/dashboard')
  }, [router])
  return (
    <div className="flex items-center justify-center h-screen bg-dark">
      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
