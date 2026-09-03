/**
 * 필터 칩 그룹
 * 활성 칩은 틴트가 아니라 브랜드 블루로 채운다 (PRD 9-2).
 *
 * @param {{ options:Array<{value:string,label:string}>, value:string, onChange:(v:string)=>void, label?:string }} props
 */

export default function FilterBar({ options = [], value, onChange, label }) {
  return (
    <div
      className="pl-form"
      style={{ gap: 8, flexWrap: 'wrap' }}
      role="group"
      aria-label={label}
    >
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className="pl-chip"
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
