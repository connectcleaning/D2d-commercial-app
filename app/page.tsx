import LeadForm from '@/components/LeadForm'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">D2D Commercial Leads</h1>
          <p className="text-slate-400">Capture leads fast, in the field.</p>
        </div>
        <LeadForm />
      </div>
    </main>
  )
}
