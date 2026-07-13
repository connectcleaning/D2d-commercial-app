'use client'

import { useRef, useState } from 'react'
import { RepContext } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type AppMode = 'single' | 'bulk'

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

interface LeadFormProps {
  repContext: RepContext
  lat: number | null
  lng: number | null
  initialMode?: AppMode
  onBack: () => void
}

export default function LeadForm({ repContext, lat, lng, initialMode = 'single', onBack }: LeadFormProps) {
  const [mode, setMode] = useState<AppMode>(initialMode)

  // Email
  const [sendEmail, setSendEmail] = useState(false)
  const [emailType, setEmailType] = useState<'met_dm' | 'met_other' | 'custom'>('met_dm')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')

  const EMAIL_TEMPLATES = {
    met_dm: {
      subject: 'ATTN: {{contact.first_name}}',
      body: `Hi {{contact.first_name}},

It was great meeting you! Our team is here to help with your commercial cleaning, janitorial, windows, pressure washing, and more.

We'd love to put together a free quote for you, no pressure at all.

Looking forward to connecting,
Darius Pyle (Owner)
Connect Cleaning

P.S. We're rated 5 stars on Google with over 130 reviews!`,
    },
    met_other: {
      subject: 'ATTN: {{contact.first_name}}',
      body: `Hi {{contact.first_name}},

My name is Darius, Owner of Connect Cleaning. I stopped by recently and met your team, and they gave me your contact.

I'd love to introduce myself and put together a free quote for your commercial cleaning needs, janitorial, windows, pressure washing, and more.

Would you be open to a quick conversation?

Looking forward to connecting,
Darius Pyle (Owner)
Connect Cleaning

P.S. We're rated 5 stars on Google with over 130 reviews!`,
    },
  }

  function handleEmailTypeChange(type: 'met_dm' | 'met_other' | 'custom') {
    setEmailType(type)
    if (type !== 'custom') {
      setEmailSubject(EMAIL_TEMPLATES[type].subject)
      setEmailBody(EMAIL_TEMPLATES[type].body)
    } else {
      setEmailSubject('ATTN: {{contact.first_name}}')
      setEmailBody(`Hi {{contact.first_name}},



Looking forward to connecting,
Darius Pyle (Owner)
Connect Cleaning

P.S. We're rated 5 stars on Google with over 130 reviews!`)
    }
  }

  function handleSendEmailToggle(on: boolean) {
    setSendEmail(on)
    if (on && emailType !== 'custom') {
      setEmailSubject(EMAIL_TEMPLATES[emailType].subject)
      setEmailBody(EMAIL_TEMPLATES[emailType].body)
    }
  }

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
    singlePhotos.forEach((photo, i) => fd.append(`photo_${i}`, photo))
    fd.append('rep_name', repContext.rep_name)
    fd.append('script', String(repContext.script))
    if (lat !== null) fd.append('lat', String(lat))
    if (lng !== null) fd.append('lng', String(lng))
    fd.append('send_email', sendEmail ? 'true' : 'false')
    if (sendEmail) {
      fd.append('email_subject', emailSubject)
      fd.append('email_body', emailBody)
    }
    try {
      const res = await fetch('/api/submit', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        setBanner({ type: 'success', message: 'Lead saved and added to GHL! ✓' })
        setForm(emptyForm)
        setSinglePhotos([])
        setSinglePreviews([])
        setSendEmail(false)
        setEmailType('met_dm')
        setEmailSubject('')
        setEmailBody('')
        setTimeout(() => { setBanner(null); onBack() }, 2000)
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
    const pending = bulkItems.filter(i => i.submitStatus !== 'success')

    await Promise.all(pending.map(async (item) => {
      // No photo sent — data already extracted and reviewed by user
      const fd = new FormData()
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
      fd.append('rep_name', repContext.rep_name)
      fd.append('script', String(repContext.script))
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
    }))

    setBulkSubmitting(false)
    setBulkDone(true)
  }

  // ── Render: Bulk mode ─────────────────────────────────────────────────────────

  if (mode === 'bulk') {
    return (
      <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-200 p-6 space-y-4">
        <input ref={bulkUploadRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBulkPhotoChange} />

        <div className="flex items-center justify-between">
          <button onClick={() => { clearBulk(); onBack() }} className="text-gray-400 hover:text-gray-600 text-sm transition-colors">← Back</button>
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
                  {/* Top row: photo + name/company + delete */}
                  <div className="flex items-center gap-3 p-3 pb-2">
                    <img src={item.preview} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
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
                          <p className="text-gray-900 text-base font-semibold leading-tight">{item.decision_maker_name || <span className="text-gray-400 italic font-normal text-sm">No name found</span>}</p>
                          <p className="text-gray-500 text-sm leading-tight mt-0.5">{item.business_name || <span className="italic text-gray-400">No company found</span>}</p>
                        </>
                      )}
                    </div>
                    {item.submitStatus === 'success' && <span className="text-green-500 text-xl flex-shrink-0">✓</span>}
                    {item.submitStatus !== 'success' && !bulkDone && (
                      <button onClick={() => removeBulkItem(item.id)} className="text-gray-300 hover:text-red-500 text-2xl leading-none transition-colors flex-shrink-0">×</button>
                    )}
                  </div>

                  {/* Bottom row: status + edit */}
                  {item.submitStatus !== 'success' && !bulkDone && !item.analyzing && (
                    <div className="flex items-center gap-2 px-3 pb-3">
                      <select
                        value={item.lead_status}
                        onChange={e => updateBulkItem(item.id, 'lead_status', e.target.value)}
                        className="flex-1 bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-800"
                      >
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <button
                        onClick={() => toggleEdit(item.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${item.isEditing ? 'bg-blue-900 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                      >
                        {item.isEditing ? 'Done' : 'Edit'}
                      </button>
                    </div>
                  )}

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
                {/* Summary */}
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm font-medium text-center">
                  {bulkItems.filter(i => i.submitStatus === 'success').length} of {bulkItems.length} contacts added to GHL ✓
                </div>

                {/* Failed items */}
                {bulkItems.filter(i => i.submitStatus === 'error').length > 0 && (
                  <div className="space-y-2">
                    <p className="text-red-600 text-sm font-medium">Failed — tap Edit to fix and retry:</p>
                    {bulkItems.filter(i => i.submitStatus === 'error').map(item => (
                      <div key={item.id} className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
                        <img src={item.preview} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 text-sm font-medium">{item.decision_maker_name || item.business_name || 'Unknown'}</p>
                          <p className="text-red-500 text-xs mt-0.5">{item.errorMsg || 'Upload failed'}</p>
                        </div>
                        <button
                          onClick={() => { setBulkDone(false); toggleEdit(item.id) }}
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0"
                        >
                          Retry
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => { setBulkDone(false); handleBulkSubmit() }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-xl transition-colors text-sm"
                    >
                      Retry All Failed →
                    </button>
                  </div>
                )}

                <button onClick={() => { clearBulk(); onBack() }} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 rounded-xl transition-colors">
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
        {/* Email toggle */}
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Send Email</p>
              <p className="text-xs text-gray-400">Sends via GHL after contact is saved</p>
            </div>
            <button
              type="button"
              onClick={() => handleSendEmailToggle(!sendEmail)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sendEmail ? 'bg-blue-900' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${sendEmail ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {sendEmail && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                {(['met_dm', 'met_other', 'custom'] as const).map(type => (
                  <label key={type} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="email_type"
                      value={type}
                      checked={emailType === type}
                      onChange={() => handleEmailTypeChange(type)}
                      className="accent-blue-900"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      {type === 'met_dm' && '👋 Met the decision maker'}
                      {type === 'met_other' && '🤝 Met someone else, got DM card'}
                      {type === 'custom' && '✏️ Custom email'}
                    </span>
                  </label>
                ))}
              </div>

              {emailType !== 'custom' || true ? (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      placeholder="Email subject"
                      className={smallInputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Body</label>
                    <textarea
                      value={emailBody}
                      onChange={e => setEmailBody(e.target.value)}
                      placeholder={emailType === 'custom' ? 'Write your email...' : ''}
                      rows={8}
                      className={smallInputClass + ' resize-none'}
                    />
                  </div>
                  {!form.email && (
                    <p className="text-amber-600 text-xs">⚠️ Enter an email address above to send this email</p>
                  )}
                </div>
              ) : null}
            </div>
          )}
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

        <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 py-2 text-sm transition-colors"
          >
            <span>📁</span> Bulk Import
          </button>
        </div>
      </form>
    </div>
  )
}
