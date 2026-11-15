import { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, Loader2, RotateCcw, ShieldCheck } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

const SUPABASE_URL = 'https://tcjsmkhmfjigutfhjtem.supabase.co'
const ANON_KEY = 'sb_publishable_zWDvjhEldcV8eutnlRypGA_LGpOUhkg'

const ROLE_SUGGESTIONS: Record<string, string[]> = {
  'School Admin': [
    'How do I set up the active session & term?',
    'How do I enter scores and publish results?',
    'How do I configure WAEC, ACE, or University mode?',
    'How do I generate student & teacher login credentials?',
  ],
  Teacher: [
    'How do I enter and save subject scores?',
    'How do I create and schedule a CBT exam?',
    'How do I mark daily class attendance?',
    'How do I publish results as a Form Master?',
  ],
  Student: [
    'How do I check my termly report card?',
    'How do I take an active CBT exam?',
    'How do I view my fee balance and payment history?',
    'How do I join a scheduled Live Class?',
  ],
}

const SMARTEDU_KNOWLEDGE_BASE = `
You are the official SmartEdu Enterprise AI Support & Operations Specialist.
Your job is to provide clear, accurate, step-by-step guidance to users navigating and troubleshooting the SmartEdu School Management System.

### CORE PLATFORM ARCHITECTURE & MODULES
1. **Authentication & Portals**:
   - **School Admin** (/dashboard/schooladmin): Full institutional control, academic setup, score entry, result publishing, CBT, fees, credentials, and settings.
   - **Teacher** (/dashboard/teacher): Role-adaptive portal. **Subject Teachers** manage assigned classes, enter scores, create assignments, and set CBT exams. **Form Masters** (Class Teachers) additionally manage class rosters, mark attendance, and publish class results.
   - **Student** (/dashboard/student): View report cards/results, take CBT exams, submit assignments, view attendance, track fees, join live classes, and submit complaints.
   - **Super Admin** (/dashboard/superadmin): Multi-school management, user auditing, and system-wide logs.

2. **Academic Setup & Curriculum Modes** (Admin -> Academic Setup & Settings):
   - **Sessions & Terms**: Admins must set one Session (e.g., 2024/2025) and one Term (First, Second, Third Term) as **Current/Active** so dashboards, scorebooks, and report cards auto-load the right period.
   - **Curriculum Modes**:
     - *Nigerian Standard (WAEC / NECO / BECE)*: Supports configurable continuous assessment weights (e.g., CA1, CA2, Assignment, Mid-Term, Exam = 100%) across tiers (Nursery, Primary, JSS, SSS).
     - *ACE (Accelerated Christian Education)*: Dedicated PACE Scores entry (/dashboard/schooladmin/pace-scores) and ACE Progress Reports (/dashboard/schooladmin/ace-reports).
     - *Higher Education / University*: Supports course units, semester GPAs, 5.0 CGPA scale, and departmental course registration.

3. **People & Credentials Management**:
   - **Students** (/dashboard/schooladmin/students): Add individual students or bulk import, assign classes/tiers, and manage promotions based on the configured promotion threshold.
   - **Teachers** (/dashboard/schooladmin/teachers): Register staff, generate Staff IDs, and assign them as Form Masters (in Classes) or Subject Teachers (in Classes/Subjects).
   - **Credentials** (/dashboard/schooladmin/credentials): View, print, or reset login PINs/passwords and school codes for students and teachers.

4. **Score Entry & Result Publishing**:
   - **Entering Scores**: Go to *Enter Scores* (Admin or Teacher), select Class and Subject, input CA and Exam scores (totals and grades auto-calculate), and click **Save**.
   - **Score Locks**: Admins can lock scores in *Publish Results* to prevent post-publication edits.
   - **Publishing Results**: Go to *Publish Results*, review class broadsheets/averages, add principal/teacher remarks if needed, and toggle **Publish** so students can view/download their report cards.

5. **CBT (Computer-Based Testing) & Live Classes**:
   - **CBT Exams**: Create exams with objective/theory questions, set duration, pass mark, and schedule window. Students take exams under timed auto-submit conditions, and objective scores sync automatically.
   - **Live Class**: Schedule and launch virtual classroom links directly inside the portal for students to join.

6. **Fees & Operations**:
   - **Fees Management**: Configure termly fee structures by class, record student payments, generate receipts, and track outstanding balances.
   - **Announcements & Complaints**: Broadcast school-wide or role-targeted notices; review and resolve student feedback tickets.

### RESPONSE GUIDELINES
- Always tailor instructions to the user's current role (**{{ROLE}}**) and institution (**{{SCHOOL}}**).
- Use concise numbered steps and **bold** exact menu names (e.g., **Academic Setup**, **Enter Scores**, **Publish Results**).
- If a user reports an issue (e.g., missing students in score entry, wrong term showing), diagnose the root cause immediately (e.g., checking that the current session/term is marked active, or ensuring students are assigned to that class).
- Keep responses structured, authoritative, polite, and under 3 short paragraphs or clean bullet points.
`

export default function ChatBotWidget({
  open,
  onClose,
  role,
  schoolContext,
}: {
  open: boolean
  onClose: () => void
  role: string
  schoolContext: string
}) {
  const welcomeMessage = `Hello! I'm your **SmartEdu Support Specialist** for **${schoolContext || 'your institution'}**. Ask me anything about setting up sessions, recording scores, publishing results, CBT exams, or managing your ${role} portal.`

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: welcomeMessage }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const suggestedQuestions = ROLE_SUGGESTIONS[role] || ROLE_SUGGESTIONS['School Admin']

  const resetChat = () => {
    setMessages([{ role: 'assistant', text: welcomeMessage }])
    setInput('')
    setLoading(false)
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const sendMessage = async (text: string) => {
    text = text.trim()
    if (!text || loading) return

    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setLoading(true)

    const systemPrompt = SMARTEDU_KNOWLEDGE_BASE
      .replace('{{ROLE}}', role || 'User')
      .replace('{{SCHOOL}}', schoolContext || 'SmartEdu Institution')

    const payload = {
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-8).map(m => ({ role: m.role, content: m.text })),
        { role: 'user', content: text }
      ],
      schoolContext
    }

    try {
      const res = await fetch(SUPABASE_URL + '/functions/v1/chat-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANON_KEY,
        },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', text: (data.reply || 'I could not generate a response. Please try again.').trim() }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Service temporarily unavailable (' + res.status + '). Please try again shortly.' }])
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Connection error: ' + e.message }])
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-end pointer-events-none">
      <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-[1px] pointer-events-auto sm:bg-transparent sm:backdrop-blur-none" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:w-[410px] sm:mr-6 sm:mt-16 h-[78vh] sm:h-[580px] flex flex-col shadow-2xl border border-slate-200 pointer-events-auto overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
              <Bot size={17} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-semibold text-sm">SmartEdu Assistant</span>
                <ShieldCheck size={13} className="text-emerald-400" />
              </div>
              <div className="text-slate-400 text-[11px]">{role} • Platform Support</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={resetChat} className="text-slate-300 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition" title="Reset Conversation">
              <RotateCcw size={15} />
            </button>
            <button onClick={onClose} className="text-slate-300 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition" title="Close">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user'
            return (
              <div key={i} className={'flex ' + (isUser ? 'justify-end' : 'justify-start')}>
                <div
                  className={'max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed ' +
                    (isUser
                      ? 'bg-slate-900 text-white rounded-2xl rounded-br-sm whitespace-pre-wrap shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-2xl rounded-bl-sm shadow-sm')}
                >
                  {isUser ? (
                    msg.text
                  ) : (
                    <div className="prose-chat">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white text-slate-500 text-xs font-medium px-3.5 py-2.5 rounded-2xl rounded-bl-sm border border-slate-200 flex items-center gap-2 shadow-sm">
                <Loader2 size={14} className="animate-spin text-slate-700" />
                Analyzing SmartEdu docs...
              </div>
            </div>
          )}

          {/* Suggested questions */}
          {messages.length === 1 && !loading && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">Quick Help Topics</p>
              <div className="flex flex-col gap-1.5">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-left px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-100/70 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            placeholder="Ask about scores, CBT, fees, settings..."
            disabled={loading}
            className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 disabled:opacity-40 transition shrink-0"
            title="Send message"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>
    </div>
  )
}
