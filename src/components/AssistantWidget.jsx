import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowRight, IconLifeBuoy, IconSend, IconX } from './icons'

const DRAFT_KEY = 'resolvenow_voice_complaint_draft'
const roleHome = (role) => role === 'ADMIN' ? '/admin' : role === 'STAFF' ? '/staff' : '/user'
const PROFILE_FIELDS = [
  ['name', 'your name'],
  ['phone', 'phone number'],
  ['address', 'address'],
  ['age', 'age'],
  ['gender', 'gender'],
  ['bloodGroup', 'blood group'],
  ['maritalStatus', 'marital status'],
  ['languages', 'languages spoken'],
  ['bio', 'bio'],
]

const FAQS = [
  {
    keywords: ['sign up', 'signup', 'register', 'account', 'sign in', 'login', 'log in', 'password'],
    answer: 'Choose Get started, select your workspace (Customer, Service staff, or Administrator), then use that workspace sign-in page to create an account or sign in. Your role determines which dashboard and actions are available.',
  },
  {
    keywords: ['create', 'raise', 'submit', 'new complaint', 'report issue'],
    answer: 'Open New Complaint, add a title and description, choose a department and priority, attach the required photo, then review and submit. I can start a draft and fill in the details you tell me.',
    action: { label: 'Open New Complaint', path: '/user/complaints/new', roles: ['USER'] },
  },
  {
    keywords: ['track', 'status', 'progress', 'where is', 'my complaint'],
    answer: 'Your requests and their latest statuses are on My Complaints. Open a ticket card to see its activity and updates.',
    action: { label: 'View My Complaints', path: '/user/complaints', roles: ['USER'] },
  },
  {
    keywords: ['priority', 'urgent', 'critical', 'high'],
    answer: 'Critical is for urgent service disruption, High for significant impact, Medium for issues needing attention soon, and Low when the issue can wait. You can filter complaint and assignment lists by priority.',
  },
  {
    keywords: ['dashboard', 'graph', 'chart', 'analytics'],
    answer: 'Your dashboard shows service status, recent activity, summary counts, and interactive charts. Open your dashboard to review the information for your workspace.',
    action: { label: 'Open my dashboard', path: 'role-dashboard', roles: ['USER', 'STAFF', 'ADMIN'] },
  },
  {
    keywords: ['photo', 'picture', 'image', 'attach', 'screenshot'],
    answer: 'You can attach a JPG, PNG, WebP, or other image up to 2 MB to your complaint or this help chat. In this chat, include the error message in your question too; this app does not have an image-reading AI service connected, so a screenshot alone cannot be diagnosed automatically.',
    action: { label: 'Open New Complaint', path: '/user/complaints/new', roles: ['USER'] },
  },
  {
    keywords: ['filter', 'search', 'cards', 'list view', 'list'],
    answer: 'Complaint pages let you filter by status and priority; administrators can also filter by department. Search by ticket ID or title and switch between image cards and list view.',
  },
  {
    keywords: ['duplicate', 'same issue', 'reports', 'reporters'],
    answer: 'When multiple people report the same issue, the complaint card shows the report count and reporter initials. Shared reports are raised in priority so the team can assess the wider impact.',
  },
  {
    keywords: ['add staff', 'create staff', 'new staff member'],
    answer: 'Administrators can create staff accounts from Staff & Users. Open the page and choose Add Staff Member to enter the account details.',
    action: { label: 'Open Staff & Users', path: '/admin/staff', roles: ['ADMIN'] },
  },
  {
    keywords: ['staff', 'assignment', 'assigned'],
    answer: 'Service staff can open My Assignments, filter the work queue, and open an assignment to review its details and update progress.',
    action: { label: 'Open My Assignments', path: '/staff/assignments', roles: ['STAFF'] },
  },
  {
    keywords: ['profile', 'my name', 'personal details', 'phone number', 'address'],
    answer: 'You can change your display name, phone, address, and other profile details here. Say “change my name to …” or “edit my profile”; I’ll ask you to confirm before saving. Your sign-in email cannot be changed from the profile.',
  },
  {
    keywords: ['delete', 'remove', 'cancel complaint'],
    answer: 'You can remove an attached photo while creating a complaint, or cancel an unsent voice draft. Submitted complaints and user accounts do not currently have a delete action in this app. Staff can update complaint progress, and administrators can assign or update complaint status.',
  },
  {
    keywords: ['update complaint', 'resolve complaint', 'assign complaint', 'update status'],
    answer: 'Open a complaint by its ticket number (for example, “open C101”). Staff can start work or mark their assigned complaint completed; administrators can assign/reassign complaints and update status. I’ll open the right complaint page, where you can review and confirm the change.',
  },
  {
    keywords: ['admin', 'department', 'manage', 'team', 'user'],
    answer: 'Administrators can review All Complaints, filter by status, department, and priority, then open a complaint to manage it. Staff & Users is available from the admin navigation.',
    action: { label: 'Open All Complaints', path: '/admin/complaints', roles: ['ADMIN'] },
  },
  {
    keywords: ['dark', 'light', 'theme', 'color', 'colour'],
    answer: 'Use the theme switch in the top bar, or ask the voice resolver to switch to dark or light mode. Your dashboard preference is saved on this device.',
  },
]

function classifyCategory(text) {
  const value = text.toLowerCase()
  if (/wifi|wi-fi|internet|network|connect|outage|router/.test(value)) return 'NETWORK'
  if (/invoice|billing|bill|charge|payment/.test(value)) return 'BILLING'
  if (/vpn|software|application|app crash|login|password|computer|laptop|printer|scanner|hardware|technical/.test(value)) return 'TECHNICAL'
  if (/refund|subscription|cancelled|canceled|\baccount(?:s)? (?:change|access|update|verification|issue)|\bkyc\b/.test(value)) return 'ACCOUNTS'
  return 'GENERAL'
}

function detectCategory(text) {
  const value = text.toLowerCase()
  if (/\bnetwork\b|\bwi[\s-]?fi\b|\bwireless\b|\binternet\b|\bconnect(?:ion|ivity)?\b|\brouter\b|\bvpn\b/.test(value)) return 'NETWORK'
  if (/\bbilling\b|\binvoice\b|\bpayment\b|\bcharge\b|\brefund\b|\bsubscription fee\b/.test(value)) return 'BILLING'
  if (/\btechnical\b|\btech\b|\bit support\b|\bsoftware\b|\bhardware\b|\bcomputer\b|\bprinter\b|\bapplication\b|\blogin\b|\bpassword\b/.test(value)) return 'TECHNICAL'
  if (/\baccounts?\b|\baccount access\b|\bsubscription\b|\bkyc\b/.test(value)) return 'ACCOUNTS'
  if (/\bgeneral\b|\bother\b|\bnot listed\b/.test(value)) return 'GENERAL'
  return ''
}

function classifyPriority(text) {
  const value = text.toLowerCase()
  if (/\blow priority\b|not urgent|can wait/.test(value)) return 'LOW'
  if (/\bcritical\b|urgent|emergency|complete outage|business stopped/.test(value)) return 'CRITICAL'
  if (/\bhigh priority\b|major impact|many people|whole (floor|office|team)|significant impact/.test(value)) return 'HIGH'
  if (/\bmedium\b/.test(value)) return 'MEDIUM'
  return ''
}

function detectPriority(text) {
  const value = text.toLowerCase()
  if (/\bcritical\b|\bemergency\b|\burgent\b|\bsevere\b|\bproduction is down\b/.test(value)) return 'CRITICAL'
  if (/\bhigh\b|\bmajor\b|\bimportant\b|\bhigh impact\b/.test(value)) return 'HIGH'
  if (/\bmedium\b|\bnormal\b|\bmoderate\b|\bstandard\b/.test(value)) return 'MEDIUM'
  if (/\blow\b|\bminor\b|\bnot urgent\b|\bcan wait\b|\blater\b/.test(value)) return 'LOW'
  return ''
}

function detectStatus(text) {
  const value = text.toLowerCase()
  if (/\bresolved\b|\bfixed\b|\bsolved\b|\bcompleted\b/.test(value)) return 'RESOLVED'
  if (/\bin progress\b|\bwork in progress\b|\bin process\b|\bbeing worked on\b|\bbeing processed\b|\bunderway\b|\bongoing\b|\bcurrently working\b|\bwork has started\b/.test(value)) return 'IN_PROGRESS'
  if (/\bassigned\b|\bwith (?:the )?team\b|\bbeing handled\b|\btaken by staff\b|\bpassed to (?:the )?team\b/.test(value)) return 'ASSIGNED'
  if (/\bclosed\b|\bfully finished\b|\bclosed out\b/.test(value)) return 'CLOSED'
  if (/\bopen\b|\bnew\b|\bpending\b|\bnot yet assigned\b|\bwaiting to be assigned\b|\bjust submitted\b|\bnot started\b/.test(value)) return 'OPEN'
  return ''
}

function extractLabeled(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const labels = '(?:title|description|priority|category|department)'
  const match = text.match(new RegExp(`\\b${escaped}\\s*(?:is|should be|:)?\\s+(.+?)(?=\\s+${labels}\\s*(?:is|should be|:)?\\s+|$)`, 'i'))
  return match?.[1]?.trim().replace(/[,.!?]+$/, '') || ''
}

function stripFieldPrefix(text, field) {
  const labels = {
    title: /^(?:the )?title\s+(?:is|should be)\s+/i,
    description: /^(?:the )?description\s+(?:is|should be)\s+/i,
    priority: /^(?:the )?priority\s+(?:is|should be)\s+/i,
    category: /^(?:the )?(?:category|department)\s+(?:is|should be)\s+/i,
  }
  return text.trim().replace(labels[field], '').replace(/[.!?]+$/, '').trim()
}

function parseComplaintDetails(text) {
  const title = extractLabeled(text, 'title')
  const description = extractLabeled(text, 'description')
  const explicitPriority = extractLabeled(text, 'priority')
  const explicitCategory = extractLabeled(text, 'category') || extractLabeled(text, 'department')
  const categoryCandidate = (explicitCategory || text).toUpperCase()
  const category = ['NETWORK', 'BILLING', 'TECHNICAL', 'ACCOUNTS', 'GENERAL'].find((value) => categoryCandidate.includes(value))
    || (explicitCategory ? classifyCategory(explicitCategory) : detectCategory(text))
  return {
    title: title || '',
    description: description || '',
    priority: explicitPriority ? detectPriority(explicitPriority) || classifyPriority(explicitPriority) : detectPriority(text),
    category,
    categoryExplicit: Boolean(explicitCategory),
  }
}

function faqFor(text) {
  const normalized = text.toLowerCase()
  return FAQS.find((faq) => faq.keywords.some((keyword) => normalized.includes(keyword)))
}

function MicIcon({ listening = false, size = 21 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8" />
      {listening && <circle cx="12" cy="9" r="1.2" fill="currentColor" stroke="none" />}
    </svg>
  )
}

function SpeakerIcon({ enabled = true, size = 17 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 10v4h4l5 4V6l-5 4H4Z" />
      {enabled ? <><path d="M16 9a5 5 0 0 1 0 6" /><path d="M18.5 6.5a9 9 0 0 1 0 11" /></> : <><path d="m17 9 5 6m0-6-5 6" /></>}
    </svg>
  )
}

export default function AssistantWidget({
  role: roleValue = 'USER',
  onSetTheme,
  onOpenProfile,
  onFocusProfileField,
  onUpdateProfileField,
  onSaveProfile,
  onCancelProfile,
}) {
  const navigate = useNavigate()
  const [activeBot, setActiveBot] = useState('')
  const [helpMessages, setHelpMessages] = useState([])
  const [voiceMessages, setVoiceMessages] = useState([])
  const [helpInput, setHelpInput] = useState('')
  const [voiceInput, setVoiceInput] = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [listening, setListening] = useState(false)
  const [voiceMinimized, setVoiceMinimized] = useState(false)
  const [readAloud, setReadAloud] = useState(true)
  const readAloudRef = useRef(true)
  const [voiceError, setVoiceError] = useState('')
  const [profileStage, setProfileStage] = useState('')
  const [profileField, setProfileField] = useState('')
  const [complaintDraft, setComplaintDraft] = useState(null)
  const [complaintStage, setComplaintStage] = useState('')
  const recognitionRef = useRef(null)
  const recognitionRestartRef = useRef(null)
  const recognitionRunningRef = useRef(false)
  const recognitionStartingRef = useRef(false)
  const recognitionStableRef = useRef(null)
  const restartAttemptRef = useRef(0)
  const keepListeningRef = useRef(false)
  const speakingRef = useRef(false)
  const speechQueueRef = useRef([])
  const currentSpeechTextRef = useRef('')
  const recentSpeechRef = useRef({ text: '', expiresAt: 0 })
  const commandHandlerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const uploadRef = useRef(null)
  const roleUpper = String(roleValue || 'USER').toUpperCase()
  const role = ['USER', 'STAFF', 'ADMIN'].includes(roleUpper) ? roleUpper : 'USER'
  const base = roleHome(role)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [helpMessages, voiceMessages, activeBot])

  useEffect(() => () => {
    keepListeningRef.current = false
    clearTimeout(recognitionRestartRef.current)
    clearTimeout(recognitionStableRef.current)
    recognitionRunningRef.current = false
    recognitionStartingRef.current = false
    recognitionRef.current?.stop()
    speechQueueRef.current = []
    speakingRef.current = false
    currentSpeechTextRef.current = ''
    window.speechSynthesis?.cancel()
  }, [])

  const playNextSpeech = () => {
    if (!readAloudRef.current || !speechQueueRef.current.length) {
      speakingRef.current = false
      currentSpeechTextRef.current = ''
      scheduleVoiceRestart(350)
      return
    }

    const text = speechQueueRef.current.shift()
    currentSpeechTextRef.current = text
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = navigator.language || 'en-US'
    utterance.onstart = () => {
      recentSpeechRef.current = { text, expiresAt: Date.now() + 2500 }
    }
    utterance.onend = () => {
      recentSpeechRef.current = { text, expiresAt: Date.now() + 2500 }
      playNextSpeech()
    }
    utterance.onerror = (event) => {
      if (event.error === 'canceled' || event.error === 'interrupted') return
      speakingRef.current = false
      currentSpeechTextRef.current = ''
      setVoiceError(`Spoken reply failed (${event.error || 'speech error'}). You can still read the reply on screen.`)
      scheduleVoiceRestart(350)
    }
    window.speechSynthesis.speak(utterance)
  }

  const getSpokenReply = (text) => {
    const firstSentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || text.trim()
    if (firstSentence.length <= 140) return firstSentence
    return `${firstSentence.split(/\s+/).slice(0, 22).join(' ')}…`
  }

  const isRecentSpeechEcho = (transcript) => {
    const recentSpeech = recentSpeechRef.current
    const speechText = currentSpeechTextRef.current
      || (Date.now() <= recentSpeech.expiresAt ? recentSpeech.text : '')
    if (!speechText) return false
    const normalize = (value) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    const spoken = normalize(speechText)
    const heard = normalize(transcript)
    const heardWords = heard.split(/\s+/).filter(Boolean)
    const spokenWords = new Set(spoken.split(/\s+/).filter(Boolean))
    if (heardWords.length < 2) return false
    const overlap = heardWords.filter((word) => spokenWords.has(word)).length / heardWords.length
    return spoken === heard
      || (heard.length >= 8 && spoken.includes(heard))
      || (spoken.length >= 18 && (heard.includes(spoken) || overlap >= 0.8))
  }

  const stopSpokenReply = () => {
    speechQueueRef.current = []
    speakingRef.current = false
    currentSpeechTextRef.current = ''
    window.speechSynthesis?.cancel()
  }

  const speakResponse = (text) => {
    if (!text || !readAloudRef.current) return
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setVoiceError('Spoken replies are not supported in this browser. You can still read the chat on screen.')
      return
    }
    speechQueueRef.current.push(getSpokenReply(text))
    if (speakingRef.current) return
    speakingRef.current = true
    clearTimeout(recognitionRestartRef.current)
    playNextSpeech()
  }

  const toggleReadAloud = () => {
    const enabled = !readAloud
    readAloudRef.current = enabled
    setReadAloud(enabled)
    if (enabled) {
      const latestReply = activeBot === 'help' ? helpMessages : voiceMessages
      const lastAssistantMessage = [...latestReply].reverse().find((message) => message.from === 'assistant')
      speakResponse(lastAssistantMessage?.text || 'Read aloud is on. I will speak my replies.')
      return
    }
    speechQueueRef.current = []
    speakingRef.current = false
    currentSpeechTextRef.current = ''
    window.speechSynthesis?.cancel()
    if (keepListeningRef.current) {
      scheduleVoiceRestart(150)
    }
  }

  const push = (setter, from, text, extra = {}) => {
    setter((messages) => [
      ...messages,
      { id: `${Date.now()}-${Math.random()}`, from, text, ...extra },
    ])
    if (from === 'assistant') speakResponse(text)
  }

  const closeBot = () => {
    keepListeningRef.current = false
    clearTimeout(recognitionRestartRef.current)
    recognitionRef.current?.stop()
    clearTimeout(recognitionStableRef.current)
    recognitionRunningRef.current = false
    recognitionStartingRef.current = false
    speechQueueRef.current = []
    speakingRef.current = false
    window.speechSynthesis?.cancel()
    setListening(false)
    setActiveBot('')
    setVoiceMinimized(false)
  }

  const navigateTo = (path, close = true) => {
    navigate(path)
    if (close) closeBot()
  }

  const saveComplaintDraft = (draft) => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch (error) {
      console.error('Unable to save voice complaint draft', error)
      push(setVoiceMessages, 'assistant', 'I could not save the draft in this browser. Please open New Complaint and enter it there.')
      return false
    }
    window.dispatchEvent(new CustomEvent('resolvenow-voice-draft', { detail: draft }))
    return true
  }

  const focusFormField = (field) => {
    window.dispatchEvent(new CustomEvent('resolvenow-voice-focus', { detail: field }))
  }

  const finishComplaintDraft = (draft) => {
    if (!draft.title?.trim() || draft.title.trim().length < 6) {
      setComplaintStage('title')
      focusFormField('title')
      push(setVoiceMessages, 'assistant', draft.title?.trim()
        ? 'Please give me a little more detail in the title (at least 6 characters).'
        : 'What title should I use for the complaint?')
      return
    }
    if (!draft.description?.trim() || draft.description.trim().length < 20) {
      setComplaintStage('description')
      focusFormField('description')
      push(setVoiceMessages, 'assistant', draft.description?.trim()
        ? 'Please add more detail to the description (at least 20 characters), such as when it started and who is affected.'
        : `What should I put in the description for “${draft.title}”? Include when it started and who is affected.`)
      return
    }
    if (!draft.categoryConfirmed) {
      setComplaintStage('category')
      focusFormField(draft.category ? `category-${draft.category.toLowerCase()}` : 'category')
      push(setVoiceMessages, 'assistant', draft.category
        ? `I think ${draft.category.toLowerCase()} is the best department. Is that right? You can also say Network, Billing, Technical, Accounts, or General.`
        : 'Which department fits best: Network, Billing, Technical, Accounts, or General?')
      return
    }
    if (!draft.priority) {
      setComplaintStage('priority')
      focusFormField('priority')
      push(setVoiceMessages, 'assistant', 'What priority should I set: Low, Medium, High, or Critical?')
      return
    }
    const completeDraft = {
      title: draft.title.trim().slice(0, 120),
      description: draft.description.trim().slice(0, 1000),
      category: draft.category || 'GENERAL',
      priority: draft.priority,
      imageUrl: '',
    }
    if (!saveComplaintDraft(completeDraft)) return
    setComplaintDraft(completeDraft)
    setComplaintStage('')
    focusFormField(`priority-${completeDraft.priority.toLowerCase()}`)
    push(setVoiceMessages, 'assistant', `Draft ready: “${completeDraft.title}”, ${completeDraft.category.toLowerCase()}, ${completeDraft.priority.toLowerCase()} priority. I’ve opened the form. Add the required photo, review the details, and submit when you are ready.`)
  }

  const beginComplaint = (text) => {
    if (role !== 'USER') {
      push(setVoiceMessages, 'assistant', 'Complaint creation is available in the customer workspace. I can open or filter the complaint queue for your role instead.')
      return
    }
    const parsed = parseComplaintDetails(text)
    const draft = {
      title: parsed.title,
      description: parsed.description,
      category: parsed.category,
      categoryConfirmed: parsed.categoryExplicit,
      priority: parsed.priority,
    }
    setComplaintDraft(draft)
    if (!saveComplaintDraft(draft)) return
    navigateTo('/user/complaints/new', false)
    push(setVoiceMessages, 'assistant', 'Opening a new complaint. I’ll fill each field as you answer, then leave the final submission for you to review.')
    finishComplaintDraft(draft)
  }

  const continueComplaint = (transcript) => {
    const parsed = parseComplaintDetails(transcript)
    const draft = { ...complaintDraft }
    if (parsed.title) draft.title = parsed.title
    if (parsed.description) draft.description = parsed.description
    if (parsed.priority) draft.priority = parsed.priority
    if (parsed.category && parsed.categoryExplicit) {
      draft.category = parsed.category
      draft.categoryConfirmed = true
    }

    if (complaintStage === 'title' && !parsed.title) draft.title = stripFieldPrefix(transcript, 'title')
    if (complaintStage === 'description' && !parsed.description) draft.description = stripFieldPrefix(transcript, 'description')
    if (complaintStage === 'category') {
      const spokenCategory = detectCategory(transcript)
      if (/\b(yes|correct|right|that is right|sounds good)\b/i.test(transcript) && draft.category) {
        draft.categoryConfirmed = true
      } else if (/\b(no|wrong|change it)\b/i.test(transcript)) {
        focusFormField('category')
        push(setVoiceMessages, 'assistant', 'Okay. Which department should I use: Network, Billing, Technical, Accounts, or General?')
        return
      } else {
        if (!spokenCategory) {
          focusFormField('category')
          push(setVoiceMessages, 'assistant', 'I did not match that to a department. Please choose Network, Billing, Technical, Accounts, or General.')
          return
        }
        draft.category = spokenCategory
        draft.categoryConfirmed = true
      }
    }
    if (complaintStage === 'priority' && !parsed.priority) {
      draft.priority = detectPriority(transcript) || classifyPriority(transcript)
      if (!draft.priority) {
        focusFormField('priority')
        push(setVoiceMessages, 'assistant', 'Please choose Low, Medium, High, or Critical priority.')
        return
      }
    }

    setComplaintDraft(draft)
    if (!saveComplaintDraft(draft)) return
    finishComplaintDraft(draft)
  }

  const profileKeyFromSpeech = (text) => {
    const value = text.toLowerCase()
    if (/\bname\b/.test(value)) return 'name'
    if (/\bphone\b|\bmobile\b/.test(value)) return 'phone'
    if (/\baddress\b/.test(value)) return 'address'
    if (/\bage\b/.test(value)) return 'age'
    if (/\bgender\b/.test(value)) return 'gender'
    if (/\bblood\b/.test(value)) return 'bloodGroup'
    if (/\bmarital\b|\bmarried\b|\bsingle\b/.test(value)) return 'maritalStatus'
    if (/\blanguage\b/.test(value)) return 'languages'
    if (/\bbio\b|\babout me\b/.test(value)) return 'bio'
    return ''
  }

  const beginProfileFlow = () => {
    onOpenProfile?.(true)
    setProfileStage('field')
    setProfileField('')
    push(setVoiceMessages, 'assistant', `Let’s update your profile one detail at a time. Say which detail to change: ${PROFILE_FIELDS.map(([, label]) => label).join(', ')}.`)
  }

  const handleProfileSpeech = (text) => {
    const normalized = text.trim().toLowerCase()
    if (/\b(cancel|stop editing)\b/.test(normalized)) {
      onCancelProfile?.()
      setProfileStage('')
      setProfileField('')
      push(setVoiceMessages, 'assistant', 'Profile editing cancelled. Your saved details were not changed.')
      return
    }
    if (profileStage === 'confirm') {
      if (/\b(save|confirm|yes|finish|done)\b/.test(normalized)) {
        onSaveProfile?.()
        setProfileStage('')
        setProfileField('')
        push(setVoiceMessages, 'assistant', 'Your profile changes have been saved.')
      } else {
        push(setVoiceMessages, 'assistant', 'Say “save” to apply the profile updates, or “cancel” to discard them.')
      }
      return
    }
    if (profileStage === 'field') {
      if (/\b(done|finish|save)\b/.test(normalized)) {
        setProfileStage('confirm')
        push(setVoiceMessages, 'assistant', 'Say “save” to apply the profile updates, or “cancel” to discard them.')
        return
      }
      const field = profileKeyFromSpeech(text)
      if (!field) {
        if (/\bemail\b/.test(normalized)) {
          push(setVoiceMessages, 'assistant', 'Your sign-in email cannot be changed from the profile. You can update your name, phone, address, age, gender, blood group, marital status, languages, or bio.')
          return
        }
        push(setVoiceMessages, 'assistant', 'I did not recognize that profile detail. Please say name, phone, address, age, gender, blood group, marital status, languages, or bio.')
        return
      }
      setProfileField(field)
      setProfileStage('value')
      onFocusProfileField?.(field)
      push(setVoiceMessages, 'assistant', `What should your ${PROFILE_FIELDS.find(([key]) => key === field)?.[1] || field} be?`)
      return
    }
    if (profileStage === 'value') {
      const explicitField = profileKeyFromSpeech(text)
      const field = explicitField || profileField
      const value = explicitField
        ? text.replace(/^(?:my\s+)?(?:name|phone(?: number)?|mobile(?: number)?|address|age|gender|blood group|marital status|languages?|bio)\s*(?:is|should be|to)?\s*/i, '').trim()
        : text.trim()
      if (!value) {
        push(setVoiceMessages, 'assistant', 'I did not hear a value. Please say the value, or say “skip”.')
        return
      }
      if (!/\bskip\b/i.test(value)) onUpdateProfileField?.(field, value.replace(/[.!?]+$/, ''))
      setProfileField('')
      setProfileStage('field')
      push(setVoiceMessages, 'assistant', 'What other profile detail would you like to change? Say a field name, or say “done” to review and save.')
    }
  }

  const handleHelpSend = (text = helpInput, image = screenshot) => {
    if (!text.trim() && !image) return
    const faq = faqFor(text)
    const answer = image
      ? `${faq?.answer || 'I received your screenshot.'} I cannot inspect image contents automatically yet because a vision service is not connected. Please tell me the exact error text and what you were doing when it appeared, and I’ll guide you using the app help available here.`
      : faq?.answer || 'I can answer questions about signing in, complaints, photos, priorities, status, assignments, duplicate reports, notifications, and themes. If you are seeing an error, paste its exact wording or attach a screenshot and tell me what you were doing.'
    push(setHelpMessages, 'user', text.trim() || 'I need help with this screenshot.', {
      image: image?.dataUrl || '',
      imageName: image?.name || '',
    })
    push(setHelpMessages, 'assistant', answer, {
      action: faq?.action && (!faq.action.roles || faq.action.roles.includes(role)) ? faq.action : undefined,
    })
    setHelpInput('')
    setScreenshot(null)
    if (uploadRef.current) uploadRef.current.value = ''
  }

  const handleHelpImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setVoiceError('Choose an image file to attach.')
      event.target.value = ''
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setVoiceError('Choose an image smaller than 2 MB.')
      event.target.value = ''
      return
    }
    setVoiceError('')
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setVoiceError('The screenshot could not be read. Please try another image.')
        return
      }
      setScreenshot({ dataUrl: reader.result, name: file.name })
    }
    reader.onerror = () => setVoiceError('The screenshot could not be read. Please try another image.')
    reader.readAsDataURL(file)
  }

  const showNotifications = () => {
    push(setVoiceMessages, 'assistant', 'Opening your notifications. Each item shows its sender and ticket when that information is provided.')
    navigateTo('/notifications', false)
  }

  const handleVoiceCommand = (rawText) => {
    const text = rawText.trim()
    if (!text) return
    push(setVoiceMessages, 'user', text)
    setVoiceInput('')
    setVoiceError('')
    const lower = text.toLowerCase()

    const asksToLeaveTopic = /\b(leave|stop|skip|forget|cancel|exit|quit|move on|let us move on|let's move on)\b/.test(lower)
      && /\b(this|that|current|previous|topic|question|flow|complaint|profile|editing|it)\b/.test(lower)
    const requestedNewAction = /\b(dark|night|black|light|day|bright|white)\b/.test(lower)
      || (/\b(notification|notifications|alerts)\b/.test(lower) && /\b(show|open|view|check|all|my|read|see|get|tell|list)\b/.test(lower))
      || (/\b(edit|update|change|manage|fix)\b.*\b(profile|my details|personal details|contact details)\b|\b(profile|my details|personal details|contact details)\b.*\b(edit|update|change|manage|fix)\b/.test(lower))
      || /\bchange my (name|email|phone|mobile|address|age|gender|bio)\b/.test(lower)
      || (/\b(new|create|raise|file|submit|log|report|make)\b/.test(lower) && /\b(complaint|ticket|issue|problem|service request)\b/.test(lower))
      || /\b(my complaints|my tickets|my requests|complaint list|all complaints|assignments|my work|tasks|dashboard|home page|overview|in progress|resolved|assigned|open complaints|closed complaints)\b/.test(lower)
      || /\bC\d+\b/i.test(text)

    const interruptedFlow = Boolean((profileStage || complaintStage) && (asksToLeaveTopic || requestedNewAction))
    if (interruptedFlow) {
      if (profileStage) onCancelProfile?.()
      if (complaintStage) {
        try {
          sessionStorage.removeItem(DRAFT_KEY)
        } catch (error) {
          console.error('Unable to discard interrupted voice complaint draft', error)
        }
      }
      setProfileStage('')
      setProfileField('')
      setComplaintStage('')
      setComplaintDraft(null)
      if (asksToLeaveTopic && !requestedNewAction) {
        push(setVoiceMessages, 'assistant', 'Okay, leaving that topic. What would you like to do next?')
        return
      }
    }

    if (/\b(dark|night|black)\b/.test(lower) && /\b(mode|theme|screen|display|color|colour|make|switch|turn|change|set|put|use|want|prefer|keep)\b/.test(lower)) {
      onSetTheme?.('dark')
      push(setVoiceMessages, 'assistant', 'Dark theme is on.')
      return
    }
    if (/\b(light|day|bright|white)\b/.test(lower) && /\b(mode|theme|screen|display|color|colour|make|switch|turn|change|set|put|use|want|prefer|keep)\b/.test(lower)) {
      onSetTheme?.('light')
      push(setVoiceMessages, 'assistant', 'Light theme is on.')
      return
    }
    const wantsNotifications = /\b(notification|notifications|alerts)\b/.test(lower)
      && /\b(show|open|view|check|all|my|read|see|get|tell|list)\b/.test(lower)
    if (wantsNotifications) {
      if (profileStage) onCancelProfile?.()
      setProfileStage('')
      setComplaintStage('')
      showNotifications()
      return
    }
    const wantsProfile = /\b(edit|update|change|manage|fix)\b.*\b(profile|my details|personal details|contact details)\b|\b(profile|my details|personal details|contact details)\b.*\b(edit|update|change|manage|fix)\b/.test(lower)
      || /\bchange my (name|email|phone|mobile|address|age|gender|bio)\b/.test(lower)
    if (/\b(?:change|update|set)\s+my\s+email\b/i.test(text)) {
      push(setVoiceMessages, 'assistant', 'Your sign-in email cannot be changed from the profile. I can still help update your display name and other profile details.')
      return
    }
    const directProfileChange = text.match(/\b(?:change|update|set)\s+my\s+(name|phone(?: number)?|mobile(?: number)?|address|age|gender|blood group|marital status|languages?|bio)\s+(?:to|as|is)\s+(.+)/i)
    if (directProfileChange && profileKeyFromSpeech(directProfileChange[1])) {
      const field = profileKeyFromSpeech(directProfileChange[1])
      const value = directProfileChange[2].replace(/[.!?]+$/, '').trim()
      beginProfileFlow()
      setProfileStage('confirm')
      setProfileField(field)
      onUpdateProfileField?.(field, value)
      push(setVoiceMessages, 'assistant', `I drafted your ${PROFILE_FIELDS.find(([key]) => key === field)?.[1] || field} as “${value}”. Say “save” to apply it or “cancel” to discard.`)
      return
    }
    if (wantsProfile && !profileStage) {
      beginProfileFlow()
      return
    }
    if (profileStage && !interruptedFlow) {
      handleProfileSpeech(text)
      return
    }
    if (complaintStage && !interruptedFlow) {
      if (/\b(cancel|never mind|nevermind|discard)\b/i.test(text)) {
        setComplaintStage('')
        setComplaintDraft(null)
        push(setVoiceMessages, 'assistant', 'Complaint draft cancelled. Nothing was submitted.')
      } else {
        continueComplaint(text)
      }
      return
    }

    const id = text.match(/\bC\d+\b/i)?.[0]
    if (id) {
      navigateTo(`${base}/complaints/${id.toUpperCase()}`, false)
      push(setVoiceMessages, 'assistant', `Opening complaint ${id.toUpperCase()}.`)
      return
    }
    if (/\b(dashboard|home page|overview)\b/.test(lower)) {
      navigateTo(`${base}/dashboard`, false)
      push(setVoiceMessages, 'assistant', 'Opening your dashboard.')
      return
    }
    if (role === 'ADMIN' && /\bstaff|users|team members\b/.test(lower)) {
      navigateTo('/admin/staff', false)
      push(setVoiceMessages, 'assistant', 'Opening Staff & Users.')
      return
    }

    const hasRequestAction = /\b(new|create|raise|file|submit|log|report|make)\b/.test(lower)
    const hasRequestTopic = /\b(complaint|ticket|issue|problem|service request)\b/.test(lower)
    const wantsNewComplaint = role === 'USER' && ((hasRequestAction && hasRequestTopic)
      || /\b(i have an issue|i have a problem|i need to report|i want to report|report something)\b/.test(lower))
    if (wantsNewComplaint) {
      beginComplaint(text)
      return
    }
    if (role === 'USER' && /\b(remove|delete)\s+(?:the\s+)?(?:photo|image|picture)\b/.test(lower)) {
      if (!window.location.pathname.startsWith('/user/complaints/new')) {
        try {
          sessionStorage.setItem('resolvenow_voice_remove_complaint_image', 'true')
        } catch (error) {
          console.error('Unable to prepare voice photo removal', error)
          push(setVoiceMessages, 'assistant', 'I could not prepare the photo removal in this browser. Open the complaint draft and use Remove photo.')
          return
        }
        navigateTo('/user/complaints/new', false)
        push(setVoiceMessages, 'assistant', 'Opening your complaint draft and removing its photo. A photo is required before you can submit; choose a replacement if needed.')
      } else {
        window.dispatchEvent(new CustomEvent('resolvenow-voice-remove-image'))
        push(setVoiceMessages, 'assistant', 'I removed the attached photo. A photo is required before you can submit; choose a replacement if needed.')
      }
      return
    }

    const wantsAssignments = role === 'STAFF' && /\b(assignment|my work|tasks)\b/.test(lower)
    const wantsComplaints = role === 'USER' && /\b(my complaints|my tickets|my requests|complaint list)\b/.test(lower)
    const wantsAllComplaints = role === 'ADMIN' && /\b(all complaints|complaint list|complaints)\b/.test(lower)
    const listAction = /\b(show|open|view|list|find|search|filter|get|see|which|what|tell me|give me|display|all)\b/.test(lower)
    const hasListEntity = /\b(complaints?|tickets?|requests?|assignments?|tasks?|work)\b/.test(lower)
    const wantsList = wantsAssignments || wantsComplaints || wantsAllComplaints
      || (listAction && hasListEntity)
      || (detectStatus(lower) && (hasListEntity || listAction))
      || ((detectPriority(lower) || /\b(priority|filter)\b/.test(lower)) && hasListEntity)
      || /\b(high priority|priority|filter|show me|search|find|look for|important)\b/.test(lower)
    if (wantsList) {
      const params = new URLSearchParams()
      const priority = detectPriority(lower)
      const status = detectStatus(lower)
      if (priority) params.set('priority', priority)
      if (status) params.set('status', status)
      if (role === 'ADMIN') {
        const department = ['NETWORK', 'BILLING', 'TECHNICAL', 'ACCOUNTS', 'GENERAL'].find((item) => lower.includes(item.toLowerCase()))
        if (department) params.set('department', department)
      }
      const search = lower.match(/(?:search for|find (?:the )?(?:complaint|ticket) (?:called|titled|about)?|look for)\s+(.+)/)?.[1]
      if (search && !/^(?:high|critical|medium|low|open|assigned|resolved|closed|in progress)(?: priority)? complaints?$/.test(search.trim())) {
        params.set('search', search.replace(/[?.!]+$/, '').trim())
      }
      const path = role === 'STAFF' ? `${base}/assignments` : `${base}/complaints`
      if (profileStage) onCancelProfile?.()
      setProfileStage('')
      setComplaintStage('')
      navigateTo(`${path}${params.size ? `?${params.toString()}` : ''}`, false)
      const filterSummary = [
        status && `status ${status.replace('_', ' ').toLowerCase()}`,
        priority && `${priority.toLowerCase()} priority`,
      ].filter(Boolean).join(' and ')
      push(setVoiceMessages, 'assistant', `Opening ${role === 'STAFF' ? 'your assignments' : role === 'ADMIN' ? 'all complaints' : 'your complaints'}${filterSummary ? ` filtered to ${filterSummary}` : params.size ? ' with those filters applied' : ''}.`)
      return
    }

    if (role === 'USER' && /\bcomplaint\b/.test(lower)) {
      beginComplaint(text)
      return
    }
    push(setVoiceMessages, 'assistant', 'Tell me what you need in your own words. I can open a complaint or dashboard, filter requests, open notifications, update your profile, change the theme, and help staff/admins find assignment or complaint controls. I can create a complaint draft, but you must add the required photo and submit it yourself.')
  }

  useEffect(() => {
    commandHandlerRef.current = activeBot === 'help'
      ? (text) => handleHelpSend(text, null)
      : handleVoiceCommand
  })

  const stopVoice = () => {
    keepListeningRef.current = false
    clearTimeout(recognitionRestartRef.current)
    clearTimeout(recognitionStableRef.current)
    recognitionStartingRef.current = false
    recognitionRef.current?.stop()
    setListening(false)
  }

  const scheduleVoiceRestart = (delay) => {
    clearTimeout(recognitionRestartRef.current)
    if (!keepListeningRef.current || speakingRef.current) return
    recognitionRestartRef.current = setTimeout(() => {
      recognitionRestartRef.current = null
      startVoice(true)
    }, delay)
  }

  const startVoice = (restarting = false) => {
    if (!restarting) keepListeningRef.current = true
    if (speakingRef.current) return
    if (recognitionRunningRef.current || recognitionStartingRef.current) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      keepListeningRef.current = false
      setVoiceError('Voice recognition is not supported in this browser. Type the request below instead.')
      return
    }
    setVoiceError('')
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognitionStartingRef.current = true
    recognition.lang = navigator.language || 'en-US'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.onstart = () => {
      recognitionStartingRef.current = false
      recognitionRunningRef.current = true
      clearTimeout(recognitionStableRef.current)
      recognitionStableRef.current = setTimeout(() => {
        restartAttemptRef.current = 0
      }, 5000)
      setVoiceError('')
      setListening(true)
    }
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const transcript = result?.[0]?.transcript?.trim()
        if (!transcript) continue
        const isEcho = isRecentSpeechEcho(transcript)
        if (speakingRef.current && !isEcho && transcript.split(/\s+/).length >= 2) stopSpokenReply()
        if (!result?.isFinal || isEcho) continue
        if (speakingRef.current) stopSpokenReply()
        restartAttemptRef.current = 0
        setVoiceError('')
        commandHandlerRef.current?.(transcript)
        break
      }
    }
    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      clearTimeout(recognitionStableRef.current)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        keepListeningRef.current = false
        setVoiceError('Microphone access was denied by the browser. Check this site’s microphone permission and start voice again.')
        return
      }
      if (event.error === 'audio-capture') {
        keepListeningRef.current = false
        setVoiceError('No microphone input is available. Check that your microphone is connected and not in use by another app.')
        return
      }
      if (event.error === 'language-not-supported') {
        keepListeningRef.current = false
        setVoiceError(`Voice recognition does not support ${recognition.lang}. Change your browser language or use typed input.`)
        return
      }
      if (event.error === 'network') {
        setVoiceError('Speech recognition lost its network connection. Reconnecting automatically…')
        return
      }
      setVoiceError(`Speech recognition reported “${event.error || 'unknown error'}”. Retrying automatically…`)
    }
    recognition.onend = () => {
      clearTimeout(recognitionStableRef.current)
      recognitionStartingRef.current = false
      recognitionRunningRef.current = false
      setListening(false)
      if (!keepListeningRef.current || speakingRef.current) return
      restartAttemptRef.current += 1
      const delay = Math.min(350 * (2 ** Math.min(restartAttemptRef.current - 1, 4)), 5600)
      scheduleVoiceRestart(delay)
    }
    try {
      recognition.start()
    } catch (error) {
      console.error('Unable to start voice recognition', error)
      clearTimeout(recognitionStableRef.current)
      recognitionStartingRef.current = false
      recognitionRunningRef.current = false
      setListening(false)
      setVoiceError(`Voice recognition could not start${error?.message ? `: ${error.message}` : '.'} Tap the microphone to retry or type your request.`)
      if (keepListeningRef.current) {
        restartAttemptRef.current += 1
        scheduleVoiceRestart(Math.min(350 * (2 ** Math.min(restartAttemptRef.current - 1, 4)), 5600))
      }
    }
  }

  const setActive = (bot) => {
    setVoiceError('')
    setVoiceMinimized(false)
    setActiveBot(bot)
    if (bot === 'help' && !helpMessages.length) {
      push(setHelpMessages, 'assistant', 'How can I help? Ask a question by voice or type it below.')
    }
    if (bot === 'voice' && !voiceMessages.length) {
      push(setVoiceMessages, 'assistant', 'I’m ready. Tell me what you want to do, and I’ll keep listening until you stop the microphone.')
    }
  }

  const beginProfileSave = () => {
    onSaveProfile?.()
    setProfileStage('')
    setProfileField('')
    push(setVoiceMessages, 'assistant', 'Your profile changes have been saved.')
  }

  return (
    <>
      {!activeBot && (
        <div className="assistant-launchers" aria-label="ResolveNow assistants">
          <button className="assistant-launcher assistant-launcher-help" type="button" onClick={() => setActive('help')} aria-label="Open help chat">
            <IconLifeBuoy size={20} />
            <span>Help chat</span>
          </button>
          <button className="assistant-launcher assistant-launcher-voice" type="button" onClick={() => { setActive('voice'); startVoice() }} aria-label="Open voice resolver">
            <MicIcon size={20} />
            <span>Voice resolver</span>
          </button>
        </div>
      )}

      {activeBot === 'help' && (
        <section className="assistant-widget" aria-label="ResolveNow help chat">
          <header className="assistant-header assistant-header-help">
            <span className="assistant-brand-icon"><IconLifeBuoy size={20} /></span>
            <div className="assistant-header-copy">
              <strong>ResolveNow help</strong>
              <span>App questions and error help</span>
            </div>
            <button className={`assistant-read-toggle${readAloud ? ' is-on' : ''}`} type="button" onClick={toggleReadAloud} aria-pressed={readAloud} aria-label={readAloud ? 'Turn read aloud off' : 'Turn read aloud on'} title={readAloud ? 'Read assistant replies aloud' : 'Enable spoken replies'}>
              <SpeakerIcon enabled={readAloud} />
              <span>Read {readAloud ? 'on' : 'off'}</span>
            </button>
            <button className="assistant-icon-button" type="button" onClick={closeBot} aria-label="Close help chat"><IconX size={18} /></button>
          </header>
          <div className="assistant-messages" aria-live="polite">
            {helpMessages.map((message) => (
              <div className={`assistant-message ${message.from}`} key={message.id}>
                {message.image && <img className="assistant-attachment-preview" src={message.image} alt={message.imageName || 'Attached error screenshot'} />}
                <p>{message.text}</p>
                {message.action && <button type="button" className="assistant-inline-action" onClick={() => navigateTo(message.action.path === 'role-dashboard' ? roleHome(role) : message.action.path)}>{message.action.label} <IconArrowRight size={14} /></button>}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {screenshot && (
            <div className="assistant-attachment-strip">
              <img src={screenshot.dataUrl} alt="Screenshot to attach" />
              <span>{screenshot.name}</span>
              <button type="button" onClick={() => { setScreenshot(null); if (uploadRef.current) uploadRef.current.value = '' }} aria-label="Remove screenshot"><IconX size={15} /></button>
            </div>
          )}
          {voiceError && <p className="assistant-voice-error" role="status">{voiceError}</p>}
          <p className="assistant-help-note">Images are attached to the chat, but visual AI analysis is not connected yet.</p>
          <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); handleHelpSend() }}>
            <input ref={uploadRef} className="assistant-file-input" type="file" accept="image/*" onChange={handleHelpImage} aria-label="Attach an error screenshot" />
            <button className="assistant-attach-button" type="button" onClick={() => uploadRef.current?.click()} aria-label="Attach screenshot">＋</button>
            <button className={`assistant-mic-button${listening ? ' is-listening' : ''}`} type="button" onClick={listening ? stopVoice : startVoice} aria-label={listening ? 'Stop help voice input' : 'Ask a question by voice'}><MicIcon listening={listening} /></button>
            <input value={helpInput} onChange={(event) => setHelpInput(event.target.value)} placeholder="Ask a question or describe an error…" aria-label="Ask a help question" maxLength={500} />
            <button className="assistant-send-button" type="submit" disabled={!helpInput.trim() && !screenshot} aria-label="Send question"><IconSend size={17} /></button>
          </form>
        </section>
      )}

      {activeBot === 'voice' && (
        voiceMinimized ? (
          <section className="assistant-voice-minimized" aria-label="Voice resolver minimized">
            <button type="button" className="assistant-mini-expand" onClick={() => setVoiceMinimized(false)} aria-label="Expand voice resolver">
              <MicIcon listening={listening} />
              <span>Voice {listening ? 'listening' : 'paused'}</span>
              <span className="assistant-mini-expand-icon">↑</span>
            </button>
            <button className={`assistant-mic-button assistant-mini-read-toggle${readAloud ? ' is-listening' : ''}`} type="button" onClick={toggleReadAloud} aria-pressed={readAloud} aria-label={readAloud ? 'Turn read aloud off' : 'Turn read aloud on'}><SpeakerIcon enabled={readAloud} /></button>
            <button className={`assistant-mic-button${listening ? ' is-listening' : ''}`} type="button" onClick={listening ? stopVoice : startVoice} aria-label={listening ? 'Stop voice resolver' : 'Resume voice resolver'}><MicIcon listening={listening} /></button>
            <button className="assistant-icon-button" type="button" onClick={closeBot} aria-label="Close voice resolver"><IconX size={17} /></button>
          </section>
        ) : (
        <section className={`assistant-widget assistant-voice-widget${profileStage ? ' assistant-profile-flow-active' : ''}`} aria-label="Voice app resolver">
          <header className="assistant-header">
            <span className="assistant-brand-icon"><MicIcon listening={listening} /></span>
            <div className="assistant-header-copy">
              <strong>Voice app resolver</strong>
              <span>{listening ? 'Listening…' : 'Tell me what you want to do'}</span>
            </div>
            <button className={`assistant-read-toggle${readAloud ? ' is-on' : ''}`} type="button" onClick={toggleReadAloud} aria-pressed={readAloud} aria-label={readAloud ? 'Turn read aloud off' : 'Turn read aloud on'} title={readAloud ? 'Read assistant replies aloud' : 'Enable spoken replies'}>
              <SpeakerIcon enabled={readAloud} />
              <span>Read {readAloud ? 'on' : 'off'}</span>
            </button>
            <button className="assistant-icon-button" type="button" onClick={() => setVoiceMinimized(true)} aria-label="Minimize voice resolver">−</button>
            <button className="assistant-icon-button" type="button" onClick={closeBot} aria-label="Close voice resolver"><IconX size={18} /></button>
          </header>
          <div className="assistant-messages" aria-live="polite">
            {voiceMessages.map((message) => <div className={`assistant-message ${message.from}`} key={message.id}><p>{message.text}</p></div>)}
            <div ref={messagesEndRef} />
          </div>
          {profileStage === 'confirm' && (
            <div className="assistant-profile-actions">
              <button type="button" className="assistant-inline-action" onClick={beginProfileSave}>Save profile changes <IconArrowRight size={14} /></button>
              <button type="button" className="assistant-back-button" onClick={() => { onCancelProfile?.(); setProfileStage(''); push(setVoiceMessages, 'assistant', 'Profile editing cancelled.') }}>Cancel</button>
            </div>
          )}
          {voiceError && <p className="assistant-voice-error" role="status">{voiceError}</p>}
          <p className="assistant-privacy-note assistant-action-note">Voice stays on until you stop it. Answers fill the focused field; review the complaint before submitting.</p>
          <form className="assistant-composer assistant-voice-composer" onSubmit={(event) => { event.preventDefault(); handleVoiceCommand(voiceInput) }}>
            <button className={`assistant-mic-button${listening ? ' is-listening' : ''}`} type="button" onClick={listening ? stopVoice : startVoice} aria-label={listening ? 'Listening continuously, tap to stop' : 'Start continuous voice input'}>
              <MicIcon listening={listening} />
            </button>
            <input value={voiceInput} onChange={(event) => setVoiceInput(event.target.value)} placeholder="Or type a command…" aria-label="Type a voice resolver command" maxLength={500} />
            <button className="assistant-send-button" type="submit" disabled={!voiceInput.trim()} aria-label="Send command"><IconSend size={17} /></button>
          </form>
        </section>
        )
      )}
    </>
  )
}
