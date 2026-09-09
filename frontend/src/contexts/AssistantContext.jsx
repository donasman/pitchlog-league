/**
 * AI 어시스턴트 전역 컨텍스트
 *
 * 원칙: AI는 숫자를 만들지 않는다.
 * 답변은 백엔드 `POST /api/assistant` (`services/api.js` → live/mock 전환) 를 통해 온다.
 * 응답 shape: { answer, evidence:[{tool,args,asOf}], data:[], truncated, model }.
 *
 * 상태:
 * - isOpen: 패널 열림 여부
 * - messages: 대화 기록 [{role:'user'|'ai', ...}]
 *   ai 메시지는 { role:'ai', id, result } 또는 { role:'ai', id, error } — 성공/오류를
 *   컴포넌트 필드 존재로 갈라 UI 가 두 흐름을 명시적으로 그린다 (빈 데이터로 오류 감춤 금지).
 * - isThinking: AI가 조회 중 (스피너 표시)
 */

import { createContext, useContext, useState, useCallback } from 'react'
import { askAssistant } from '@/services/api'
import { SUGGESTED_QUESTIONS } from '@/mocks/assistant'

const AssistantContext = createContext(null)

export function AssistantProvider({ children }) {
  const [isOpen,     setIsOpen]     = useState(false)
  const [messages,   setMessages]   = useState([])
  const [isThinking, setIsThinking] = useState(false)

  const openPanel  = useCallback(() => setIsOpen(true),  [])
  const closePanel = useCallback(() => setIsOpen(false), [])
  const togglePanel = useCallback(() => setIsOpen(o => !o), [])

  const clearConversation = useCallback(() => setMessages([]), [])

  /* 질문 전송 — 실 API 호출 (Mock 스위치는 services/api.js) */
  const sendMessage = useCallback(async (question) => {
    if (!question.trim()) return

    const userMsg = { role: 'user', text: question, id: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setIsThinking(true)

    try {
      const result = await askAssistant(question)
      setMessages(prev => [
        ...prev,
        { role: 'ai', id: Date.now() + 1, question, result },
      ])
    } catch (err) {
      // 오류를 빈 데이터로 감추지 않는다 — 메시지에 error 필드를 실어 컴포넌트가 명시적으로 그린다
      setMessages(prev => [
        ...prev,
        { role: 'ai', id: Date.now() + 1, question, error: err?.message ?? 'unknown' },
      ])
    } finally {
      setIsThinking(false)
    }
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
