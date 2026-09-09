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
 *
 * 요청 경합 방어 (2026-09-09):
 *   사용자가 연속으로 질문하거나 패널을 닫아 버리면, 이전 요청이 나중에 도착해
 *   대화에 이질적인 답이 끼거나 이미 언마운트된 상태에 setState 가 걸린다.
 *   두 겹으로 막는다:
 *     1) AbortController — 새 요청 시 이전 요청을 취소한다 (네트워크 자원 절약).
 *     2) 단조 증가 seq — abort 를 못 잡은 늦은 응답이 도착해도 자기 seq 가 최신이 아니면 버린다.
 *   AbortError 는 조용히 무시한다 (오류로 그리지 않는다).
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { askAssistant } from '@/services/api'
import { SUGGESTED_QUESTIONS } from '@/mocks/assistant'

const AssistantContext = createContext(null)

export function AssistantProvider({ children }) {
  const [isOpen,     setIsOpen]     = useState(false)
  const [messages,   setMessages]   = useState([])
  const [isThinking, setIsThinking] = useState(false)

  /**
   * seq: 요청마다 1 증가. sendMessage 진입 시 mySeq 를 굳혀 두고,
   * 응답이 왔을 때 mySeq !== seqRef.current 면 그 사이 새 요청이 들어왔다는 뜻이라 버린다.
   * abortRef: 진행 중인 요청의 AbortController — 새 요청 시 abort 한다.
   * isMountedRef: 언마운트된 뒤 도착한 응답의 setState 를 막는다.
   */
  const seqRef       = useRef(0)
  const abortRef     = useRef(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  const openPanel  = useCallback(() => setIsOpen(true),  [])

  /** 패널을 닫으면 진행 중 요청도 취소한다 — 사용자가 그만보겠다는 뜻 */
  const closePanel = useCallback(() => {
    abortRef.current?.abort()
    setIsOpen(false)
  }, [])

  const togglePanel = useCallback(() => setIsOpen(o => !o), [])

  const clearConversation = useCallback(() => setMessages([]), [])

  /* 질문 전송 — 실 API 호출 (Mock 스위치는 services/api.js) */
  const sendMessage = useCallback(async (question) => {
    if (!question.trim()) return

    // 이 호출의 순번을 굳힌다. 응답을 채택하려면 이 값이 최신이어야 한다.
    const mySeq = ++seqRef.current

    // 진행 중이던 요청 취소 → 새 controller 로 교체
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const userMsg = { role: 'user', text: question, id: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setIsThinking(true)

    try {
      const result = await askAssistant(question, controller.signal)
      // 늦은 응답 방어: 그 사이 새 요청이 들어왔거나 언마운트됐으면 채택하지 않는다
      if (mySeq !== seqRef.current || !isMountedRef.current) return
      setMessages(prev => [
        ...prev,
        { role: 'ai', id: Date.now() + 1, question, result },
      ])
    } catch (err) {
      // abort 는 사용자 의도(새 질문·패널 닫기) — 오류로 그리지 않는다
      if (controller.signal.aborted) return
      if (mySeq !== seqRef.current || !isMountedRef.current) return
      // 오류를 빈 데이터로 감추지 않는다 — 메시지에 error 필드를 실어 컴포넌트가 명시적으로 그린다
      setMessages(prev => [
        ...prev,
        { role: 'ai', id: Date.now() + 1, question, error: err?.message ?? 'unknown' },
      ])
    } finally {
      // 최신 요청이고 아직 마운트되어 있을 때만 스피너 끈다 — 늦은 응답의 finally 가 스피너를 꺼서
      // 아직 진행 중인 요청의 표시를 지우는 것을 막는다
      if (mySeq === seqRef.current && isMountedRef.current) {
        setIsThinking(false)
      }
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
