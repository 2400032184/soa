// USER: log a new complaint (Complaint Service intake).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import * as complaintService from '../../services/complaintService'
import { apiError } from '../../api/client'
import { emitDataChanged } from '../../utils/events'
import { CATEGORY_HINTS, DEPARTMENTS, PRIORITIES } from '../../constants'
import { IconArrowRight, IconCheck, IconFileText, IconPlus } from '../../components/icons'

const EMPTY = { title: '', category: 'NETWORK', priority: 'MEDIUM', description: '', imageUrl: '' }
const VOICE_DRAFT_KEY = 'resolvenow_voice_complaint_draft'
const VOICE_REMOVE_IMAGE_KEY = 'resolvenow_voice_remove_complaint_image'
const PRIORITY_META = {
  LOW: { label: 'Low', hint: 'Can wait a little', className: 'priority-low' },
  MEDIUM: { label: 'Medium', hint: 'Needs attention soon', className: 'priority-medium' },
  HIGH: { label: 'High', hint: 'Significant impact', className: 'priority-high' },
  CRITICAL: { label: 'Critical', hint: 'Urgent service disruption', className: 'priority-critical' },
}

export default function NewComplaint() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [createdComplaint, setCreatedComplaint] = useState(null)
  const [imageName, setImageName] = useState('')
  const imageInputRef = useRef(null)
  const [form, setForm] = useState(() => {
    try {
      const voiceDraft = sessionStorage.getItem(VOICE_DRAFT_KEY)
      if (!voiceDraft) return EMPTY
      const parsed = JSON.parse(voiceDraft)
      return {
        ...EMPTY,
        title: typeof parsed.title === 'string' ? parsed.title.slice(0, 120) : '',
        category: DEPARTMENTS.includes(parsed.category) ? parsed.category : EMPTY.category,
        priority: PRIORITIES.includes(parsed.priority) ? parsed.priority : EMPTY.priority,
        description: typeof parsed.description === 'string' ? parsed.description.slice(0, 1000) : '',
      }
    } catch (error) {
      console.error('Unable to load voice complaint draft', error)
      return EMPTY
    }
  })
  useEffect(() => {
    try {
      sessionStorage.removeItem(VOICE_DRAFT_KEY)
    } catch (error) {
      console.error('Unable to clear voice complaint draft', error)
    }
  }, [])

  useEffect(() => {
    const applyVoiceDraft = (event) => {
      const draft = event.detail
      if (!draft || typeof draft !== 'object') return
      setForm({
        ...EMPTY,
        title: typeof draft.title === 'string' ? draft.title.slice(0, 120) : '',
        category: DEPARTMENTS.includes(draft.category) ? draft.category : EMPTY.category,
        priority: PRIORITIES.includes(draft.priority) ? draft.priority : EMPTY.priority,
        description: typeof draft.description === 'string' ? draft.description.slice(0, 1000) : '',
      })
      setFieldErrors({})
      setError('')
      setImageName('')
      setCreatedComplaint(null)
    }
    const focusVoiceField = (event) => {
      const field = event.detail
      const selectors = {
        title: '#title',
        description: '#description',
        category: '#category-network',
      }
      const selector = selectors[field] || (field?.startsWith('category-') ? `#${field}` : '')
        || (field?.startsWith('priority-') ? `#${field}` : '')
      const targetSelector = field === 'priority' ? '.priority-options button' : selector
      if (!targetSelector) return
      requestAnimationFrame(() => {
        const target = document.querySelector(targetSelector)
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        target?.focus({ preventScroll: true })
      })
    }
    window.addEventListener('resolvenow-voice-draft', applyVoiceDraft)
    window.addEventListener('resolvenow-voice-focus', focusVoiceField)
    return () => {
      window.removeEventListener('resolvenow-voice-draft', applyVoiceDraft)
      window.removeEventListener('resolvenow-voice-focus', focusVoiceField)
    }
  }, [])

  const set = (key) => (e) => {
    setForm((current) => ({ ...current, [key]: e.target.value }))
    setFieldErrors((current) => ({ ...current, [key]: '' }))
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      const message = 'Choose an image file to attach.'
      setError(message)
      toast.push(message, 'error')
      event.target.value = ''
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      const message = 'Please choose an image smaller than 2 MB.'
      setError(message)
      toast.push(message, 'error')
      event.target.value = ''
      return
    }
    setError('')
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        const message = 'The selected image could not be read. Please try another file.'
        setError(message)
        toast.push(message, 'error')
        if (imageInputRef.current) imageInputRef.current.value = ''
        return
      }
      setForm((current) => ({ ...current, imageUrl: reader.result }))
      setImageName(file.name)
      setFieldErrors((current) => ({ ...current, image: '' }))
    }
    reader.onerror = () => {
      const message = 'The selected image could not be read. Please try another file.'
      setError(message)
      toast.push(message, 'error')
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  const removeImage = useCallback(() => {
    setForm((current) => ({ ...current, imageUrl: '' }))
    setImageName('')
    setFieldErrors((current) => ({ ...current, image: 'Please attach a photo of the issue.' }))
    if (imageInputRef.current) imageInputRef.current.value = ''
  }, [])

  useEffect(() => {
    const handleVoiceRemoveImage = () => removeImage()
    window.addEventListener('resolvenow-voice-remove-image', handleVoiceRemoveImage)
    try {
      if (sessionStorage.getItem(VOICE_REMOVE_IMAGE_KEY) === 'true') {
        sessionStorage.removeItem(VOICE_REMOVE_IMAGE_KEY)
        handleVoiceRemoveImage()
      }
    } catch (error) {
      console.error('Unable to apply voice photo removal', error)
    }
    return () => window.removeEventListener('resolvenow-voice-remove-image', handleVoiceRemoveImage)
  }, [removeImage])

  const validate = () => {
    const nextErrors = {}
    if (!form.title.trim()) nextErrors.title = 'Please add a short title.'
    else if (form.title.trim().length < 6) nextErrors.title = 'Use at least 6 characters.'
    if (!form.description.trim()) nextErrors.description = 'Please describe the issue.'
    else if (form.description.trim().length < 20) nextErrors.description = 'Use at least 20 characters so we can route it correctly.'
    if (!form.imageUrl) nextErrors.image = 'Please attach a photo of the issue.'
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validate()) {
      toast.push('Please complete every required field and attach a photo before submitting.', 'error')
      return
    }
    setBusy(true)
    try {
      const complaint = await complaintService.createComplaint(user, {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        priority: form.priority,
        imageUrl: form.imageUrl,
      })
      emitDataChanged()
      toast.push(complaint.reportCount > 1
        ? `Your report was added to shared complaint #${complaint.id}.`
        : 'Complaint logged successfully. Our team will pick it up shortly.', 'success')
      setCreatedComplaint(complaint)
      imageInputRef.current.value = ''
    } catch (err) {
      const message = apiError(err)
      setError(message)
      toast.push(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const previewTitle = form.title.trim() || 'Your complaint title will appear here'
  const previewDescription = form.description.trim() || 'Add a clear description to help the right team understand your issue.'
  const categoryLabel = form.category.charAt(0) + form.category.slice(1).toLowerCase()
  const completion = useMemo(() => Math.round(([form.title, form.description, form.imageUrl].filter((value) => value.trim()).length / 3) * 100), [form.title, form.description, form.imageUrl])

  if (createdComplaint) {
    return <div className="container-narrow complaint-success-page">    <div className="complaint-success-card"><div className="success-check"><IconCheck size={32} /></div><p className="dashboard-eyebrow">COMPLAINT SUBMITTED</p><h1>Your complaint is on its way</h1><p className="complaint-success-copy">We have sent your request to the service desk. You can follow every update from the tracking page.</p><div className="ticket-id-card"><span>Ticket ID</span><strong>#{createdComplaint.id}</strong></div><div className="success-actions"><button type="button" className="btn btn-primary" onClick={() => navigate(`/user/complaints/${createdComplaint.id}`)}>Track Complaint <IconArrowRight size={16} /></button><button type="button" className="btn btn-outline" onClick={() => { setForm(EMPTY); setImageName(''); setCreatedComplaint(null) }}><IconPlus size={16} /> Create Another</button></div></div></div>
  }

  return (
    <div className="container-narrow complaint-create-page">
      <div className="page-header">
        <div>
          <p className="dashboard-eyebrow">SERVICE REQUEST</p>
          <h1 className="page-title">Tell us what needs attention</h1>
          <p className="page-sub">Your ticket will be routed to the right department by an administrator.</p>
        </div>
        <div className="form-completion"><span>Form progress</span><strong>{completion}%</strong><div><i style={{ width: `${completion}%` }} /></div></div>
      </div>

      <div className="complaint-create-layout">
      <div className="card card-pad complaint-form-card">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label className="label" htmlFor="title">
              Title <span className="required">*</span>
            </label>
            <input
              id="title"
              className="input"
              placeholder="Short summary, e.g. 'Internet outage in Block B'"
              value={form.title}
              onChange={set('title')}
              maxLength={120}
              autoFocus
            />
            <div className="field-footer"><span className={fieldErrors.title ? 'field-error' : 'hint'}>{fieldErrors.title || 'Keep it specific and easy to scan.'}</span><span className="character-count">{form.title.length}/120</span></div>
          </div>

          <div className="form-row">
            <div className="field">
              <label className="label" htmlFor="category"> 
                Category / Department <span className="required">*</span>
              </label>
              <div className="category-grid">{DEPARTMENTS.map((department) => <button type="button" id={`category-${department.toLowerCase()}`} className={`category-option ${form.category === department ? 'selected' : ''}`} key={department} onClick={() => setForm((current) => ({ ...current, category: department }))}><IconFileText size={16} /><span>{department}</span></button>)}</div>
              <select id="category" className="select visually-hidden" value={form.category} onChange={set('category')}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <span className="hint">{CATEGORY_HINTS[form.category]}</span>
            </div>
            <div className="field">
              <span className="label">Priority <span className="required">*</span></span>
              <div className="priority-options">{PRIORITIES.slice().reverse().map((priority) => <button type="button" id={`priority-${priority.toLowerCase()}`} className={`priority-option ${form.priority === priority ? 'selected' : ''} ${PRIORITY_META[priority].className}`} key={priority} onClick={() => setForm((current) => ({ ...current, priority }))}><span className="priority-dot" /><span><strong>{PRIORITY_META[priority].label}</strong><small>{PRIORITY_META[priority].hint}</small></span></button>)}</div>
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="description">
              Description <span className="required">*</span>
            </label>
            <textarea
              id="description"
              className="textarea"
              placeholder="Describe what happened, when it started, who is affected, and any error messages…"
              value={form.description}
              onChange={set('description')}
              rows={7}
              maxLength={1000}
            />
            <div className="field-footer"><span className={fieldErrors.description ? 'field-error' : 'hint'}>{fieldErrors.description || 'Include when it started, who is affected, and any error messages.'}</span><span className="character-count">{form.description.length}/1000</span></div>
          </div>

          <div className="field complaint-photo-field">
            <span className="label">Photo of the issue <span className="required">*</span></span>
            <label className="complaint-photo-picker">
              <IconPlus size={17} />
              <span>{imageName || 'Add a photo to help us understand the issue'}</span>
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} aria-label="Add a required photo of the complaint" aria-invalid={Boolean(fieldErrors.image)} required />
            </label>
            <span className={fieldErrors.image ? 'field-error' : 'hint'}>{fieldErrors.image || 'Required · JPG, PNG, WebP or another image format, up to 2 MB.'}</span>
            {form.imageUrl && (
              <div className="complaint-photo-preview">
                <img src={form.imageUrl} alt="Selected complaint" />
                <button type="button" className="btn btn-outline btn-sm" onClick={removeImage}>Remove photo</button>
              </div>
            )}
          </div>

          <div className="complaint-form-actions">
            <button type="submit" className={`btn btn-primary submit-complaint-btn ${busy ? 'is-loading' : ''}`} disabled={busy}>
              {busy ? <><span className="button-spinner" /> Submitting complaint…</> : <>Submit Complaint <IconArrowRight size={16} /></>}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      </div>
      <aside className="complaint-preview-card">{form.imageUrl && <img className="complaint-preview-image" src={form.imageUrl} alt="Complaint preview" />}<div className="preview-heading"><span className="dashboard-eyebrow">LIVE PREVIEW</span><span className="preview-dot" /></div><div className="preview-ticket">DRAFT TICKET</div><h2>{previewTitle}</h2><p>{previewDescription}</p><div className="preview-divider" /><div className="preview-detail"><span>Category</span><strong>{categoryLabel}</strong></div><div className="preview-detail"><span>Priority</span><strong className={PRIORITY_META[form.priority].className}>{PRIORITY_META[form.priority].label}</strong></div><div className="preview-detail"><span>Status</span><strong className="preview-status">Open after submit</strong></div><div className="preview-tip"><IconCheck size={15} /> You can track this complaint after submitting.</div></aside>
      </div>
    </div>
  )
}