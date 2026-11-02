import { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, Loader2, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

const SUPABASE_URL = 'https://tcjsmkhmfjigutfhjtem.supabase.co'
const ANON_KEY = 'sb_publishable_zWDvjhEldcV8eutnlRypGA_LGpOUhkg'

const SUGGESTED_QUESTIONS = [
  'How do I add a new student?',
  'How do I publish results?',
  'How do I enter scores?',
  'How do I change curriculum mode?',
]

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
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hello! I am your school AI assistant. I can help you with using the SmartEdu platform. How can I help you today?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const resetChat = () => {
    setMessages([
      { role: 'assistant', text: 'Hello! I am your school AI assistant. I can help you with using the SmartEdu platform. How can I help you today?' }
    ])
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

    const systemPrompt = 'You are a helpful AI assistant for a school management system. Role: ' + role + '. School: ' + schoolContext + '. Be concise. Keep under 3 paragraphs.'
    const payload = {
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.text })),
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
        setMessages(prev => [...prev, { role: 'assistant', text: (data.reply || 'No reply').trim() }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Error (' + res.status + '): ' + (data.error || 'Unknown') }])
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error: ' + e.message }])
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-end sm:justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/20 pointer-events-auto sm:bg-transparent" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:w-[400px] sm:mr-6 sm:mb-6 h-[75vh] sm:h-[600px] flex flex-col shadow-2xl pointer-events-auto">
        {/* Header */}
        <div className="px-4 py-3 bg-[#1A237E] flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">School AI Assistant</div>
              <div className="text-white/70 text-[10px]">Role: {role}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={resetChat} className="text-white hover:bg-white/15 rounded-full p-1.5 transition" title="New Chat">
              <RotateCcw size={16} />
            </button>
            <button onClick={onClose} className="text-white hover:bg-white/15 rounded-full p-1.5 transition" title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user'
            return (
              <div key={i} className={'flex ' + (isUser ? 'justify-end' : 'justify-start')}>
                <div
                  className={'max-w-[80%] px-3.5 py-2.5 text-sm ' +
                    (isUser
                      ? 'bg-[#1A237E] text-white rounded-2xl rounded-br-md whitespace-pre-wrap'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-bl-md')}
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
              <div className="bg-white text-gray-500 text-sm px-3.5 py-2.5 rounded-2xl rounded-bl-md border border-gray-200 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                AI is typing...
              </div>
            </div>
          )}

          {/* Suggested questions (only show on first message) */}
          {messages.length === 1 && !loading && (
            <div className="pt-2">
              <p className="text-[11px] text-gray-500 mb-2 px-1">Suggested questions:</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="px-3 py-1.5 rounded-full bg-white border border-[#1A237E]/20 text-[12px] font-medium text-[#1A237E] hover:bg-blue-50 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-200 bg-white flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            placeholder="Ask me anything..."
            disabled={loading}
            className="flex-1 h-11 px-4 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#1A237E] focus:border-2 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-full bg-[#1A237E] text-white flex items-center justify-center hover:bg-[#283593] disabled:opacity-50 transition"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
