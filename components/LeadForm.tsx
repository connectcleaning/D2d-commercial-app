'use client'

import { useRef, useState } from 'react'

interface FormState {
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

const emptyForm: FormState = {
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

export default function LeadForm() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  function removePhoto() {
    setPhoto(null)
    setPreview(null)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setBanner(null)

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    if (photo) fd.append('photo', photo)

    try {
      const res = await fetch('/api/submit', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        setBanner({ type: 'success', message: 'Lead saved and added to GHL! ✓' })
        setForm(emptyForm)
        setPhoto(null)
        setPreview(null)
        setTimeout(() => setBanner(null), 5000)
      } else {
        setBanner({ type: 'error', message: data.error || 'Something went wrong. Please try again.' })
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error. Check your connection and try again.' })
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400'
  const labelClass = 'block text-sm font-medium text-slate-400 mb-1'

  return (
    <div className="bg-slate-800 rounded-2xl ring-1 ring-slate-700 p-6 space-y-6">
      {banner && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${banner.type === 'success' ? 'bg-green-900/50 border border-green-700 text-green-300' : 'bg-red-900/50 border border-red-700 text-red-300'}`}>
          {banner.message}
        </div>
      )}

      {/* Photo Section */}
      <div>
        <label className={labelClass}>Business Card / Photo</label>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
        <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

        {preview ? (
          <div className="flex items-center gap-4">
            <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded-xl border border-slate-600" />
            <button type="button" onClick={removePhoto} className="text-slate-400 hover:text-red-400 text-sm transition-colors">
              × Remove photo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => cameraRef.current?.click()}
              className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg py-4 text-slate-200 font-medium transition-colors">
              <span className="text-xl">📷</span> Take Photo
            </button>
            <button type="button" onClick={() => uploadRef.current?.click()}
              className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg py-4 text-slate-200 font-medium transition-colors">
              <span className="text-xl">📁</span> Upload
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lead Status */}
        <div>
          <label className={labelClass}>Lead Status</label>
          <select name="lead_status" value={form.lead_status} onChange={handleChange} className={inputClass}>
            <option value="Cold">❄️ Cold</option>
            <option value="Warm">🔥 Warm</option>
            <option value="Hot">🚨 Hot</option>
            <option value="Networking">🤝 Networking</option>
          </select>
        </div>

        {/* Business Name */}
        <div>
          <label className={labelClass}>Business Name</label>
          <input type="text" name="business_name" value={form.business_name} onChange={handleChange} placeholder="e.g. Polar Bear Dental" className={inputClass} />
        </div>

        {/* Decision Maker Name */}
        <div>
          <label className={labelClass}>Decision Maker Name</label>
          <input type="text" name="decision_maker_name" value={form.decision_maker_name} onChange={handleChange} placeholder="Overrides business card name" className={inputClass} />
        </div>

        {/* Title */}
        <div>
          <label className={labelClass}>Title</label>
          <input type="text" name="title" value={form.title} onChange={handleChange} placeholder="e.g. Office Manager" className={inputClass} />
        </div>

        {/* Email */}
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Overrides business card email" className={inputClass} />
        </div>

        {/* Phone */}
        <div>
          <label className={labelClass}>Phone Number</label>
          <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="Overrides business card phone" className={inputClass} />
        </div>

        {/* Address */}
        <div>
          <label className={labelClass}>Street Address</label>
          <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="123 Main St" className={inputClass} />
        </div>

        {/* City / State / Zip */}
        <div className="grid grid-cols-5 gap-2">
          <div className="col-span-3">
            <label className={labelClass}>City</label>
            <input type="text" name="city" value={form.city} onChange={handleChange} placeholder="City" className={inputClass} />
          </div>
          <div className="col-span-1">
            <label className={labelClass}>State</label>
            <input type="text" name="state" value={form.state} onChange={handleChange} placeholder="FL" className={inputClass} />
          </div>
          <div className="col-span-1">
            <label className={labelClass}>Zip</label>
            <input type="text" name="zip" value={form.zip} onChange={handleChange} placeholder="32801" className={inputClass} />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={labelClass}>Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Call back Thursday, interested in weekly service..." rows={3} className={inputClass + ' resize-none'} />
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-60 text-white font-semibold text-lg py-4 rounded-xl transition-colors mt-2">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 8 4.673 8 12h4z" />
              </svg>
              Analyzing & Saving...
            </span>
          ) : 'Submit Lead →'}
        </button>
      </form>
    </div>
  )
}
