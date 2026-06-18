'use client'

import { useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type AppMode = 'choose' | 'single' | 'bulk'

interface SingleForm {
  business_name: string
  decision_maker_name: string
  email: string
  title: string
  address: string
  city: string
  state: string
  zip: string
  lead_status: string
  phone: string
  notes: string
}

const emptyForm: SingleForm = {
  business_name: '',
  decision_maker_name: '',
  email: '',
  title: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  lead_status: 'Cold',
  phone: '',
  notes: '',
}

interface BulkItem {
  id: string
  file: File
  preview: string
  analyzing: boolean
  lead_status: string
  business_name: string
  decision_maker_name: string
  email: string
  title: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  notes: string
  isEditing: boolean
  submitStatus: 'pending' | 'success' | 'error'
  errorMsg: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'Cold', label: '❄️ Cold' },
  { value: 'Warm', label: '🔥 Warm' },
  { value: 'Hot', label: '🚨 Hot' },
  { value: 'Networking', label: '🤝 Networking' },
]

function newBulkItem(file: File): BulkItem {
  return {
    id: Math.random().toString(36).slice(2),
    file,
    preview: URL.createObjectURL(file),
    analyzing: true,
    lead_status: 'Cold',
    business_name: '',
    decision_maker_name: '',
    email: '',
    title: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
    isEditing: false,
    submitStatus: 'pending',
    errorMsg: '',
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeadForm() {
  const [mode, setMode] = useState<AppMode>('choose')

  // Single mode
  const [form, setForm] = useState<SingleForm>(emptyForm)
  const [singlePhotos, setSinglePhotos] = useState<File[]>([])
  const [singlePreviews, setSinglePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Bulk mode
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([])
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkDone, setBulkDone] = useState(false)

  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const bulkUploadRef = useRef<HTMLInputElement>(null)

  // ── Styles ───────────────────────────────────────────────────────────────────

  const inputClass = 'w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent placeholder-gray-400'
  const labelClass = 'block text-sm font-medium text-gray-600 mb-1'
  const smallInputClass = 'w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent placeholder-gray-400'

  // ── Single photo handlers ────────────────────────────────────────────────────

  function handleSinglePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    e.target.value = ''
    setSinglePhotos(prev => [...prev, ...files])
    setSinglePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
  }

  function removeSinglePhoto(index: number) {
    setSinglePhotos(prev => prev.filter((_, i) => i !== index))
    setSinglePreviews(prev => prev.filter((_, i) => i !== index))
  }

  // ── Bulk photo handlers ──────────────────────────────────────────────────────

  async function handleBulkPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    e.target.value = ''
    const newItems = files.map(newBulkItem)
    setBulkItems(prev => [...prev, ...newItems])
    setBulkDone(false)
    newItems.forEach(item => analyzePhoto(item.id, item.file))
  }

  async function analyzePhoto(id: string, file: File) {
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const res = await fetch('/api/extract', { method: 'POST', body: fd })
      const data = await res.json()
      setBulkItems(prev => prev.map(it =>
        it.id !== id ? it : {
          ...it,
          analyzing: false,
          business_name: data.business_name || '',
          decision_maker_name: data.decision_maker_name || '',
          email: data.email || '',
          title: data.title || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip: data.zip || '',
          notes: data.notes || '',
        }
      ))
    } catch {
      setBulkItems(prev => prev.map(it =>
        it.id !== id ? it : { ...it, analyzing: false }
      ))
    }
  }

  function removeBulkItem(id: string) {
    setBulkItems(prev => prev.filter(it => it.id !== id))
  }

  function updateBulkItem(id: string, field: string, value: string) {
    setBulkItems(prev => prev.map(it => it.id !== id ? it : { ...it, [field]: value }))
  }

  function toggleEdit(id: string) {
    setBulkItems(prev => prev.map(it => it.id !== id ? it : { ...it, isEditing: !it.isEditing }))
  }

  function clearBulk() {
    setBulkItems([])
    setBulkDone(false)
  }

  // ── Single submit ────────────────────────────────────────────────────────────

  function handleSingleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setBanner(null)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    // Send multiple photos as photo_0, photo_1, etc.
    singlePhotos.forEach((photo, i) => fd.append(`photo_${i}`, photo))
    try {
      const res = await fetch('/api/submit', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        setBanner({ type: 'success', message: 'Lead saved and added to GHL! ✓' })
        setForm(emptyForm)
        setSinglePhotos([])
        setSinglePreviews([])
        setTimeout(() => setBanner(null), 5000)
      } else {
        setBanner({ type: 'error', message: data.error || 'Something went wrong.' })
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error. Check your connection and try again.' })
    } finally {
      setLoading(false)
    }
  }

  // ── Bulk submit ──────────────────────────────────────────────────────────────

  async function handleBulkSubmit() {
    setBulkSubmitting(true)
    for (const item of bulkItems) {
      if (item.submitStatus === 'success') continue
      const fd = new FormData()
      fd.append('photo_0', item.file)
      fd.append('lead_status', item.lead_status)
      fd.append('business_name', item.business_name)
      fd.append('decision_maker_name', item.decision_maker_name)
      fd.append('email', item.email)
      fd.append('title', item.title)
      fd.append('phone', item.phone)
      fd.append('address', item.address)
      fd.append('city', item.city)
      fd.append('state', item.state)
      fd.append('zip', item.zip)
      fd.append('notes', item.notes)
      try {
        const res = await fetch('/api/submit', { method: 'POST', body: fd })
        const data = await res.json()
        setBulkItems(prev => prev.map(it =>
          it.id !== item.id ? it : {
            ...it,
            submitStatus: data.success ? 'success' : 'error',
            errorMsg: data.success ? '' : (data.error || 'Failed'),
          }
        ))
      } catch {
        setBulkItems(prev => prev.map(it =>
          it.id !== item.id ? it : { ...it, submitStatus: 'error', errorMsg: 'Network error' }
        ))
      }
    }
    setBulkSubmitting(false)
    setBulkDone(true)
  }

  // ── Render: Mode chooser ─────────────────────────────────────────────────────

  if (mode === 'choose') {
    return (
      <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-200 p-6 space-y-4">
        <p className="text-gray-500 text-sm text-center">What would you like to do?</p>
        <button
          onClick={() => setMode('single')}
          className="w-full bg-blue-900 hover:bg-blue-800 text-white rounded-xl py-5 flex flex-col items-center gap-1 transition-colors"
        >
          <span className="text-2xl">👤</span>
          <span className="font-semibold text-lg">Single Lead</span>
          <span className="text-blue-200 text-sm">One contact — upload multiple photos (front/back, sticky note)</span>
        </button>
        <button
          onClick={() => setMode('bulk')}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded-xl py-5 flex flex-col items-center gap-1 transition-colors"
        >
          <span className="text-2xl">📋</span>
          <span className="font-semibold text-lg">Bulk Import</span>
          <span className="text-gray-300 text-sm">Multiple contacts — one photo per lead, review before submitting</span>
        </button>
      </div>
    )
  }

  // ── Render: Bulk mode ─────────────────────────────────────────────────────────

  if (mode === 'bulk') {
    return (
      <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-200 p-6 space-y-4">
        <input ref={bulkUploadRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBulkPhotoChange} />

        <div className="flex items-center justify-between">
          <button onClick={() => { setMode('choose'); clearBulk() }} className="text-gray-400 hover:text-gray-600 text-sm transition-colors">← Back</button>
          <h2 className="text-gray-900 font-semibold">Bulk Import</h2>
          <div className="w-10" />
        </div>

        {bulkItems.length === 0 ? (
          <button
            onClick={() => bulkUploadRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 hover:border-blue-700 rounded-xl py-10 flex flex-col items-center gap-2 text-gray-400 hover:text-blue-700 transition-colors"
          >
            <span className="text-3xl">📁</span>
            <span className="font-medium">Select photos</span>
            <span className="text-xs">Each photo = one separate lead</span>
          </button>
        ) : (
          <>
            {!bulkDone && (
              <button
                onClick={() => bulkUploadRef.current?.click()}
                className="w-full border border-dashed border-gray-300 hover:border-blue-700 text-gray-400 hover:text-blue-700 rounded-lg py-3 text-sm transition-colors"
              >
                + Add more photos
              </button>
            )}

            <div className="space-y-2">
              {bulkItems.map(item => (
                <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <img src={item.preview} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {item.analyzing ? (
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 8 4.673 8 12h4z" />
                          </svg>
                          Analyzing...
                        </div>
                      ) : (
                        <>
                          <p className="text-gray-900 text-sm font-medium truncate">{item.decision_maker_name || <span className="text-gray-400 italic">No name found</span>}</p>
                          <p className="text-gray-500 text-xs truncate">{item.business_name || <span className="italic">No company found</span>}</p>
                        </>
                      )}
                    </div>
                    {item.submitStatus === 'success' && <span className="text-green-500 text-lg flex-shrink-0">✓</span>}
                    {item.submitStatus !== 'success' && !bulkDone && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          value={item.lead_status}
                          onChange={e => updateBulkItem(item.id, 'lead_status', e.target.value)}
                          className="bg-white border border-gray-300 text-gray-900 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-800"
                        >
                          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <button
                          onClick={() => toggleEdit(item.id)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${item.isEditing ? 'bg-blue-900 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                        >
                          {item.isEditing ? 'Done' : 'Edit'}
                        </button>
                        <button onClick={() => removeBulkItem(item.id)} className="text-gray-400 hover:text-red-500 text-lg leading-none transition-colors">×</button>
                      </div>
                    )}
                  </div>

                  {item.isEditing && (
                    <div className="border-t border-gray-200 p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Name</label>
                          <input type="text" value={item.decision_maker_name} onChange={e => updateBulkItem(item.id, 'decision_maker_name', e.target.value)} placeholder="Decision maker" className={smallInputClass} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Company</label>
                          <input type="text" value={item.business_name} onChange={e => updateBulkItem(item.id, 'business_name', e.target.value)} placeholder="Business name" className={smallInputClass} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Title</label>
                          <input type="text" value={item.title} onChange={e => updateBulkItem(item.id, 'title', e.target.value)} placeholder="Title" className={smallInputClass} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Phone</label>
                          <input type="tel" value={item.phone} onChange={e => updateBulkItem(item.id, 'phone', e.target.value)} placeholder="Phone" className={smallInputClass} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Email</label>
                        <input type="email" value={item.email} onChange={e => updateBulkItem(item.id, 'email', e.target.value)} placeholder="Email" className={smallInputClass} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Notes</label>
                        <textarea value={item.notes} onChange={e => updateBulkItem(item.id, 'notes', e.target.value)} placeholder="Notes..." rows={2} className={smallInputClass + ' resize-none'} />
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        <div className="col-span-3">
                          <label className="block text-xs text-gray-500 mb-1">City</label>
                          <input type="text" value={item.city} onChange={e => updateBulkItem(item.id, 'city', e.target.value)} placeholder="City" className={smallInputClass} />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs text-gray-500 mb-1">State</label>
                          <input type="text" value={item.state} onChange={e => updateBulkItem(item.id, 'state', e.target.value)} placeholder="FL" className={smallInputClass} />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs text-gray-500 mb-1">Zip</label>
                          <input type="text" value={item.zip} onChange={e => updateBulkItem(item.id, 'zip', e.target.value)} placeholder="32801" className={smallInputClass} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!bulkDone ? (
              <button
                onClick={handleBulkSubmit}
                disabled={bulkSubmitting || bulkItems.every(i => i.analyzing)}
                className="w-full bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-lg py-4 rounded-xl transition-colors"
              >
                {bulkSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 8 4.673 8 12h4z" />
                    </svg>
                    Uploading to GHL...
                  </span>
                ) : `Upload ${bulkItems.length} Contact${bulkItems.length !== 1 ? 's' : ''} to GHL →`}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm font-medium text-center">
                  {bulkItems.filter(i => i.submitStatus === 'success').length} of {bulkItems.length} contacts added to GHL ✓
                </div>
                <button onClick={() => { clearBulk(); setMode('choose') }} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 rounded-xl transition-colors">
                  Done
                </button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // ── Render: Single mode ───────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-200 p-6 space-y-6">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleSinglePhotoChange} />
      <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden" onChange={handleSinglePhotoChange} />

      <div className="flex items-center justify-between">
        <button onClick={() => { setMode('choose'); setForm(emptyForm); setSinglePhotos([]); setSinglePreviews([]) }} className="text-gray-400 hover:text-gray-600 text-sm transition-colors">← Back</button>
        <h2 className="text-gray-900 font-semibold">Single Lead</h2>
        <div className="w-10" />
      </div>

      {banner && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${banner.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {banner.message}
        </div>
      )}

      {/* Photo section */}
      <div>
        <label className={labelClass}>Photos <span className="text-gray-400 font-normal">(front, back, sticky note — any combination)</span></label>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button type="button" onClick={() => cameraRef.current?.click()}
            className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg py-4 text-gray-700 font-medium transition-colors">
            <span className="text-xl">📷</span> Take Photo
          </button>
          <button type="button" onClick={() => uploadRef.current?.click()}
            className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg py-4 text-gray-700 font-medium transition-colors">
            <span className="text-xl">📁</span> Upload
          </button>
        </div>
        {singlePreviews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {singlePreviews.map((preview, i) => (
              <div key={i} className="relative">
                <img src={preview} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                <button
                  type="button"
                  onClick={() => removeSinglePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSingleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Lead Status</label>
          <select name="lead_status" value={form.lead_status} onChange={handleSingleChange} className={inputClass}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Business Name</label>
          <input type="text" name="business_name" value={form.business_name} onChange={handleSingleChange} placeholder="e.g. Polar Bear Dental" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Decision Maker Name</label>
          <input type="text" name="decision_maker_name" value={form.decision_maker_name} onChange={handleSingleChange} placeholder="Overrides business card name" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Title</label>
          <input type="text" name="title" value={form.title} onChange={handleSingleChange} placeholder="e.g. Office Manager" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" name="email" value={form.email} onChange={handleSingleChange} placeholder="Overrides business card email" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Phone Number</label>
          <input type="tel" name="phone" value={form.phone} onChange={handleSingleChange} placeholder="Overrides business card phone" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Street Address</label>
          <input type="text" name="address" value={form.address} onChange={handleSingleChange} placeholder="123 Main St" className={inputClass} />
        </div>
        <div className="grid grid-cols-5 gap-2">
          <div className="col-span-3">
            <label className={labelClass}>City</label>
            <input type="text" name="city" value={form.city} onChange={handleSingleChange} placeholder="City" className={inputClass} />
          </div>
          <div className="col-span-1">
            <label className={labelClass}>State</label>
            <input type="text" name="state" value={form.state} onChange={handleSingleChange} placeholder="FL" className={inputClass} />
          </div>
          <div className="col-span-1">
            <label className={labelClass}>Zip</label>
            <input type="text" name="zip" value={form.zip} onChange={handleSingleChange} placeholder="32801" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleSingleChange} placeholder="Call back Thursday, interested in weekly service..." rows={3} className={inputClass + ' resize-none'} />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-lg py-4 rounded-xl transition-colors">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 8 4.673 8 12h4z" />
              </svg>
              Analyzing &amp; Saving...
            </span>
          ) : 'Submit Lead →'}
        </button>
      </form>
    </div>
  )
}
