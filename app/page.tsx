import HomeScreen from '@/components/HomeScreen'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Connect Cleaning" width={240} height={80} priority />
          </div>
          <p className="text-gray-500 text-sm font-medium tracking-wide uppercase">Commercial Lead Capture</p>
        </div>
        <HomeScreen
          user={{ name: user.name, email: user.email, title: user.title, role: user.role }}
        />
      </div>
    </main>
  )
}
