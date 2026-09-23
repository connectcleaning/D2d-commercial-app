import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listUsers } from '@/lib/users'
import AccountForm from '@/components/AccountForm'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const isAdmin = user.role === 'admin'
  const reps = isAdmin
    ? (await listUsers()).map(u => ({ email: u.email, name: u.name, role: u.role }))
    : []

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Connect Cleaning" width={200} height={67} priority />
          </div>
          <p className="text-gray-500 text-sm font-medium tracking-wide uppercase">Account</p>
        </div>
        <AccountForm
          user={{ name: user.name, email: user.email, title: user.title, role: user.role }}
          isAdmin={isAdmin}
          reps={reps}
        />
      </div>
    </main>
  )
}
