import LeadForm from '@/components/LeadForm'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Connect Cleaning" width={240} height={80} priority />
          </div>
          <p className="text-gray-500 text-sm font-medium tracking-wide uppercase">Commercial Lead Capture</p>
        </div>
        <LeadForm />
      </div>
    </main>
  )
}
