/**
 * 데이터 표.
 * "측정" 버튼 → module.table.sample(state, params) 결과를 한 줄 추가.
 * 행 개별 삭제 / 전체 지우기 지원.
 */
export default function DataTable({ module, rows, onMeasure, onDeleteRow, onClear }) {
  const cfg = module.table
  if (!cfg) return <div className="p-6 text-sm text-slate-400">이 실험에는 데이터 표가 없습니다.</div>

  return (
    <div className="p-3">
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={onMeasure}
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          📏 측정
        </button>
        <button
          onClick={onClear}
          disabled={rows.length === 0}
          className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-300 disabled:opacity-40"
        >
          전체 지우기
        </button>
        <span className="ml-auto text-xs text-slate-400">{rows.length}개 기록</span>
      </div>
      <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              {cfg.columns.map((c) => (
                <th key={c.key} className="px-3 py-2 font-medium">
                  {c.label}
                  {c.unit ? <span className="text-slate-400"> ({c.unit})</span> : null}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={cfg.columns.length + 2} className="px-3 py-6 text-center text-slate-400">
                  아직 기록이 없습니다. 조건을 바꿔가며 [측정]을 눌러보세요.
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                {cfg.columns.map((c) => (
                  <td key={c.key} className="px-3 py-1.5 font-mono">
                    {row[c.key]}
                  </td>
                ))}
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => onDeleteRow(i)}
                    className="text-slate-300 transition hover:text-red-500"
                    title="이 행 삭제"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
