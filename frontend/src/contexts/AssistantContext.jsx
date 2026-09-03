/**
 * AI 어시스턴트 전역 컨텍스트
 *
 * 원칙: AI는 숫자를 만들지 않는다.
 * 모든 답변은 ASSISTANT_SAMPLES에서 가져온다 (Mock).
 * 실 서비스에서는 LLM 오케스트레이터 API 호출로 교체.
 *
 * 상태:
 * - isOpen: 패널 열림 여부
 * - messages: 대화 기록 [{role:'user'|'ai', ...data}]
 * - isThinking: AI가 조회 중 (스피너 표시)
 */

import { createContext, useContext, useState, useCallback } from 'react'
import { ASSISTANT_SAMPLES, SUGGESTED_QUESTIONS } from '@/mocks/assistant'

const AssistantContext = createContext(null)

export function AssistantProvider({ children }) {
  const [isOpen,     setIsOpen]     = useState(false)
  const [messages,   setMessages]   = useState([])
  const [isThinking, setIsThinking] = useState(false)

  const openPanel  = useCallback(() => setIsOpen(true),  [])
  const closePanel = useCallback(() => setIsOpen(false), [])
  const togglePanel = useCallback(() => setIsOpen(o => !o), [])

  const clearConversation = useCallback(() => setMessages([]), [])

  /* 질문 전송 — Mock 응답 시뮬레이션 */
  const sendMessage = useCallback(async (question) => {
    if (!question.trim()) return

    /* 1. 사용자 메시지 추가 */
    const userMsg = { role: 'user', text: question, id: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setIsThinking(true)

    /* 2. Mock 응답 찾기 */
    const sample = ASSISTANT_SAMPLES.find(s => s.question === question)
      ?? ASSISTANT_SAMPLES[3]  // fallback: unanswerable

    const thinkingMs = sample.thinking ? 1200 : 0

    /* 3. "생각 중" 상태 표시 */
    await new Promise(r => setTimeout(r, Math.max(600, thinkingMs)))
    setIsThinking(false)

    /* 4. AI 답변 추가 */
    const aiMsg = {
      role: 'ai',
      id: Date.now() + 1,
      sample,
    }
    setMessages(prev => [...prev, aiMsg])
  }, [])

  const value = {
    isOpen,
    openPanel,
    closePanel,
    togglePanel,
    messages,
    isThinking,
    sendMessage,
    clearConversation,
    suggestedQuestions: SUGGESTED_QUESTIONS,
  }

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  )
}

export function useAssistant() {
  const ctx = useContext(AssistantContext)
  if (!ctx) throw new Error('useAssistant must be inside AssistantProvider')
  return ctx
}
