/**
 * AI 어시스턴트 패널
 *
 * 데스크톱: 우측 슬라이드 패널 (420px)
 * 모바일: 바텀시트 (위로 끌어올려 전체 화면)
 *
 * ★ 완료 조건:
 *  - 답변의 숫자가 조회된 것임이 화면에서 읽힌다 (근거 카드 + 타임스탬프)
 *  - 재검증 중 배지가 접힌 상태에서도 보인다
 *  - 지어낸 것처럼 보이지 않는다
 *
 * 말풍선만 있는 챗봇으로 그리면 실패한다 — 숫자는 데이터 카드로 렌더링한다.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAssistant } from "@/contexts/AssistantContext";
import { toKSTDateTime } from "@/utils/dateFormat";

/* ── P 마크 (AI 아바타) ── */
function PMark({ size = 28 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: "var(--pl-text)",
        color: "var(--pl-bg)",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        fontSize: size * 0.42,
        fontWeight: 700,
        fontFamily: "var(--font)",
      }}
      aria-hidden="true"
    >
      P
    </span>
  );
}

/* ── 사용자 메시지 ── */
function UserMessage({ text }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <span
        style={{
          maxWidth: "78%",
          background: "var(--pl-primary)",
          color: "var(--pl-on-primary)",
          padding: "10px 14px",
          borderRadius: "14px 14px 4px 14px",
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1.5,
        }}
      >
        {text}
      </span>
    </div>
  );
}

/* ── 실 응답 근거 항목 (evidence 배열의 한 원소) ── */
function EvidenceItem({ e, locale, t }) {
  const asOf = e.asOf ? toKSTDateTime(e.asOf, locale) : "—";
  // args 는 도구 인자 객체 — 원문을 그대로 보여준다 (임의 요약이 아니라 재현 가능한 값)
  const argsStr =
    e.args && typeof e.args === "object"
      ? JSON.stringify(e.args)
      : String(e.args ?? "");
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 8,
        fontSize: 12,
      }}
    >
      <span className="t-cap">{t("assistant.evidenceTool")}</span>
      <span
        className="t-sub"
        style={{ color: "var(--pl-text)", minWidth: 0, wordBreak: "break-all" }}
      >
        {e.tool}
        {argsStr ? ` (${argsStr})` : ""}
      </span>
      <span className="t-cap num" style={{ color: "var(--pl-sub)" }}>
        {asOf}
      </span>
    </div>
  );
}

/* ── 데이터 배열 표시 — 기본 접힘, 토글로 열면 max-height 240px 스크롤 ── */
function DataTable({ data, t }) {
  const [expanded, setExpanded] = useState(false);
  if (!Array.isArray(data) || data.length === 0) return null;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="t-cap"
        style={{
          justifySelf: "start",
          padding: "4px 8px",
          border: "1px solid var(--pl-line)",
          borderRadius: 6,
          background: "transparent",
          color: "var(--pl-sub)",
          cursor: "pointer",
        }}
      >
        {expanded ? t("assistant.hideData") : t("assistant.showData")}
      </button>
      {expanded && (
        <pre
          style={{
            margin: 0,
            padding: 10,
            background: "var(--pl-fill)",
            borderRadius: 8,
            fontSize: 11,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            overflow: "auto",
            maxHeight: 240,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "var(--pl-text)",
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

/**
 * 백엔드 오류 메시지 → i18n 키.
 * 백엔드 예외 메시지에 `assistant.error.<code>` 형태가 들어오면 그대로 쓴다.
 * 알 수 없는 값은 assistant.error.generic 으로 폴백.
 */
function errorKeyFor(message) {
  const s = String(message ?? "");
  if (s.includes("assistant.error.not_configured"))
    return "assistant.error.not_configured";
  if (s.includes("assistant.error.rate_limited"))
    return "assistant.error.rate_limited";
  if (s.includes("assistant.error.model_error"))
    return "assistant.error.model_error";
  if (s.includes("assistant.error.timeout"))
    return "assistant.error.timeout";
  return "assistant.error.generic";
}

/* ── AI 답변 메시지 — 실 API 응답 shape 소비 ── */
function AiMessage({ msg, locale, t, onRetry }) {
  // 오류 상태 — 빈 데이터로 감추지 않고 명시적으로 그린다
  if (msg.error) {
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <PMark />
        <div
          className="pl-card"
          style={{
            flex: 1,
            minWidth: 0,
            padding: 14,
            display: "grid",
            gap: 10,
            boxShadow: "inset 0 0 0 1px var(--st-neg, var(--pl-line))",
          }}
        >
          <span className="t-body" style={{ color: "var(--st-neg-text, var(--pl-text))" }}>
            {t(errorKeyFor(msg.error))}
          </span>
          {msg.question && (
            <button
              className="pl-btn pl-btn-ghost"
              style={{
                justifySelf: "start",
                height: 36,
                fontSize: 13,
                fontWeight: 500,
              }}
              onClick={() => onRetry(msg.question)}
            >
              {t("assistant.retry")}
            </button>
          )}
        </div>
      </div>
    );
  }

  const result = msg.result ?? {};
  const answer = result.answer ?? "";
  const evidence = Array.isArray(result.evidence) ? result.evidence : [];
  const data = Array.isArray(result.data) ? result.data : [];

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <PMark />
      <div
        className="pl-card"
        style={{ flex: 1, minWidth: 0, padding: 14, display: "grid", gap: 10 }}
      >
        {/* 본문 텍스트 */}
        <span className="t-body">{answer}</span>

        {/* 데이터 표 — 실 응답 data 배열 원문 */}
        <DataTable data={data} t={t} />

        {/* 근거 — 도구·인자·기준 시각 (기존 EvidenceSection 은 sample.evidence 단일 객체 전용이라 재사용 안 함) */}
        {evidence.length > 0 && (
          <div
            style={{
              borderTop: "1px solid var(--pl-line)",
              paddingTop: 10,
              display: "grid",
              gap: 6,
            }}
          >
            {evidence.map((e, i) => (
              <EvidenceItem key={i} e={e} locale={locale} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 생각 중 메시지 ── */
function ThinkingMessage({ thinkingText, t }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <PMark />
      <div
        className="pl-card"
        style={{ flex: 1, padding: 14, display: "grid", gap: 10 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* 스피너 */}
          <span
            className="pl-spin"
            aria-hidden="true"
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              borderTop: "2px solid var(--pl-sub)",
              border: "2px solid var(--pl-fill-2)",
              borderTopColor: "var(--pl-sub)",
              display: "inline-block",
            }}
          />
          <span className="t-body">
            {thinkingText ?? t("assistant.thinking")}…
          </span>
        </div>
        {/* 스켈레톤 */}
        <div style={{ display: "grid", gap: 6 }}>
          {[70, 52, 86].map((w, i) => (
            <span
              key={i}
              className="pl-sk"
              style={{ height: 12, width: `${w}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 빈 상태 ── */
function PanelEmpty({ suggestedQuestions, onAsk, t }) {
  return (
    <div
      style={{ display: "grid", gap: 14, padding: 16, alignContent: "start" }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <PMark size={36} />
        <span className="t-sec" style={{ fontSize: 19, margin: 0 }}>
          {t("assistant.emptyTitle")}
        </span>
        <span className="t-sub">{t("assistant.emptyDesc")}</span>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <span className="t-cap">{t("assistant.suggestLabel")}</span>
        {(suggestedQuestions ?? []).map((q) => (
          <button
            key={q}
            className="pl-btn pl-btn-ghost"
            style={{
              justifyContent: "flex-start",
              height: 44,
              fontWeight: 500,
              fontSize: 14,
            }}
            onClick={() => onAsk(q)}
          >
            {q}
          </button>
        ))}
      </div>
      <span className="t-cap">{t("assistant.disclaimer")}</span>
    </div>
  );
}

/* ── 입력창 ── */
function PanelInput({ onSend, t }) {
  const [value, setValue] = useState("");

  function handleSend() {
    const q = value.trim();
    if (!q) return;
    setValue("");
    onSend(q);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      style={{
        padding: 12,
        borderTop: "1px solid var(--pl-line)",
        background: "var(--pl-card)",
        display: "grid",
        gap: 8,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          minHeight: 48,
          padding: "0 6px 0 14px",
          borderRadius: 12,
          background: "var(--pl-fill)",
          boxShadow: "inset 0 0 0 1px var(--pl-control)",
        }}
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("assistant.placeholder")}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            fontSize: 14,
            color: "var(--pl-text)",
            fontFamily: "var(--font)",
          }}
          aria-label={t("assistant.placeholder")}
        />
        <button
          onClick={handleSend}
          aria-label={t("assistant.send")}
          className="pl-btn"
          style={{
            width: 40,
            height: 40,
            padding: 0,
            borderRadius: 10,
            flexShrink: 0,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            aria-hidden="true"
          >
            <path d="M10 16V4m0 0L5 9m5-5 5 5" />
          </svg>
        </button>
      </div>
      <span className="t-cap">{t("assistant.dataNote")}</span>
    </div>
  );
}

/* ── AssistantPanel (메인) ── */
export default function AssistantPanel() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const {
    isOpen,
    closePanel,
    messages,
    isThinking,
    sendMessage,
    suggestedQuestions,
    clearConversation,
  } = useAssistant();

  const scrollRef = useRef(null);

  /* 새 메시지 시 스크롤 */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleAsk = useCallback(
    (question) => sendMessage(question),
    [sendMessage],
  );

  const isEmpty = messages.length === 0 && !isThinking;

  return (
    <>
      {/* 모바일 오버레이 — 페이드 */}
      <div
        className="lg:hidden assistant-overlay"
        data-open={isOpen ? "true" : "false"}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.3)",
          zIndex: 7000,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity .22s ease",
        }}
        onClick={closePanel}
        aria-hidden="true"
      />

      {/* 패널 — 데스크톱: 우측 슬라이드 / 모바일: 바텀시트 슬라이드 */}
      <div
        style={{
          position: "fixed",
          zIndex: 7001,
          background: "var(--pl-card)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          pointerEvents: isOpen ? "auto" : "none",
        }}
        className="assistant-panel"
        data-open={isOpen ? "true" : "false"}
        aria-hidden={!isOpen}
      >
        <style>{`
          /* 데스크톱: 우측 슬라이드 */
          @media(min-width:1024px){
            .assistant-panel{
              top:60px; right:0; bottom:0;
              width:420px;
              border-left:1px solid var(--pl-line);
              box-shadow:var(--sh-modal);
              transform:translateX(100%);
              transition:transform 280ms cubic-bezier(.22,.61,.36,1);
              will-change:transform;
            }
            .assistant-panel[data-open="true"]{
              transform:translateX(0);
            }
          }
          /* 모바일: 바텀시트 슬라이드 */
          @media(max-width:1023px){
            .assistant-panel{
              left:0; right:0; bottom:0; top:34%;
              border-radius:16px 16px 0 0;
              box-shadow:var(--sh-modal);
              transform:translateY(100%);
              transition:transform 280ms cubic-bezier(.22,.61,.36,1);
              will-change:transform;
            }
            .assistant-panel[data-open="true"]{
              transform:translateY(0);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .assistant-panel, .assistant-overlay {
              transition: none !important;
            }
          }
        `}</style>

        {/* 모바일 핸들 */}
        <div
          className="lg:hidden"
          style={{
            padding: "8px 0",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: "var(--pl-line)",
              display: "block",
            }}
          />
        </div>

        {/* 헤더 */}
        <div
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 8px 0 16px",
            borderBottom: "1px solid var(--pl-line)",
            flexShrink: 0,
          }}
        >
          <PMark size={24} />
          <span className="t-card">{t("assistant.title")}</span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="t-cap"
                style={{
                  minHeight: 44,
                  minWidth: 44,
                  display: "grid",
                  placeItems: "center",
                  color: "var(--pl-sub)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font)",
                  fontSize: 11,
                }}
                aria-label={t("assistant.clearChat")}
              >
                ↺
              </button>
            )}
            <button
              onClick={closePanel}
              aria-label={t("assistant.close")}
              style={{
                width: 44,
                height: 44,
                display: "grid",
                placeItems: "center",
                color: "var(--pl-sub)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                borderRadius: 8,
              }}
            >
              ✕
            </button>
          </span>
        </div>

        {/* 메시지 영역 */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            background: "var(--pl-bg)",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {isEmpty ? (
            <PanelEmpty
              suggestedQuestions={suggestedQuestions}
              onAsk={handleAsk}
              t={t}
            />
          ) : (
            <div style={{ display: "grid", gap: 14, padding: 16 }}>
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <UserMessage key={msg.id} text={msg.text} />
                ) : (
                  <AiMessage
                    key={msg.id}
                    msg={msg}
                    locale={locale}
                    t={t}
                    onRetry={handleAsk}
                  />
                ),
              )}
              {isThinking && <ThinkingMessage t={t} />}
            </div>
          )}
        </div>

        {/* 입력창 */}
        <PanelInput onSend={handleAsk} t={t} />
      </div>
    </>
  );
}
