/**
 * 컨트롤 패널.
 * module.params 배열을 읽어 슬라이더/셀렉트를 자동 생성한다.
 * - 기본: { key, label, min, max, step, value, unit } → 슬라이더
 * - 확장: { type: 'select', options: [{ value, label }] } → 드롭다운
 * - 확장: visible(params) => boolean  → 조건부 표시 (예: 보일/샤를 모드별 변수)
 */
export default function ControlPanel({ module, params, onChange }) {
  const visibleParams = module.params.filter(
    (p) => !p.visible || p.visible(params),
  )

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow">
      <h2 className="text-sm font-bold text-slate-500">조작 변수</h2>
      {visibleParams.map((p) =>
        p.type === 'select' ? (
          <label key={p.key} className="flex flex-col gap-1">
            <span className="text-sm font-medium">{p.label}</span>
            <select
              value={params[p.key]}
              onChange={(e) => onChange(p.key, e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              {p.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label key={p.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">{p.label}</span>
              <span className="font-mono text-sm text-blue-600">
                {params[p.key]}
                {p.unit ? ` ${p.unit}` : ''}
              </span>
            </div>
            <input
              type="range"
              min={p.min}
              max={p.max}
              step={p.step}
              value={params[p.key]}
              onChange={(e) => onChange(p.key, Number(e.target.value))}
              className="accent-blue-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{p.min}</span>
              <span>{p.max}</span>
            </div>
          </label>
        ),
      )}
    </div>
  )
}
