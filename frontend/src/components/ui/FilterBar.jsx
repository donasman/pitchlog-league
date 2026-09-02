/**
 * 필터 버튼 그룹
 * @param {{ options:Array<{value:string,label:string}>, value:string, onChange:(v:string)=>void, label?:string }} props
 */

export default function FilterBar({ options = [], value, onChange, label }) {
  return (
    <div className="flex items-center gap-2 flex-wrap" role="group" aria-label={label}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`px-3 py-1.5 rounded text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
            value === opt.value
              ? 'bg-green-700 text-white font-medium'
              : 'bg-navy-700 text-slate-300 hover:bg-navy-500 hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
