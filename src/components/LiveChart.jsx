import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { downloadCSV } from '../utils/csv'

Chart.register(...registerables)

/** 라벨은 문자열 또는 (params) => 문자열 둘 다 허용 */
function resolveLabel(label, params) {
  return typeof label === 'function' ? label(params) : label
}

/**
 * 실시간 그래프 (chart.js 래퍼).
 * - 시뮬레이션 루프가 pointsRef.current 배열에 점을 밀어 넣으면(최대 300개 롤링),
 *   여기서는 일정 주기(150ms)로만 React 상태에 반영해 렌더 비용을 낮춘다.
 * - version이 바뀌면(초기화/실험 교체/모드 전환) 데이터를 비운다.
 * - chart.views가 있으면 여러 그래프(예: 궤적 ↔ 속도-시간)를 버튼으로 전환한다.
 *   각 view: { label, xKey, xLabel, yLabel, series } — getPoint가 반환한 점에서
 *   xKey(기본 'x')를 x축으로, series[].key를 y값으로 사용한다.
 */
export default function LiveChart({ module, params, pointsRef, version }) {
  const [points, setPoints] = useState([])
  const [viewIdx, setViewIdx] = useState(0)
  const lastSyncRef = useRef({ len: -1, last: null })

  useEffect(() => {
    setPoints([])
    setViewIdx(0)
    lastSyncRef.current = { len: -1, last: null }
  }, [module])

  useEffect(() => {
    setPoints([])
    lastSyncRef.current = { len: -1, last: null }
  }, [version])

  useEffect(() => {
    const id = setInterval(() => {
      const pts = pointsRef.current
      const sync = lastSyncRef.current
      const last = pts[pts.length - 1] ?? null
      if (pts.length === sync.len && last === sync.last) return // 변화 없으면 스킵
      lastSyncRef.current = { len: pts.length, last }
      setPoints([...pts])
    }, 150)
    return () => clearInterval(id)
  }, [pointsRef])

  const cfg = module.chart
  if (!cfg) return <div className="p-6 text-sm text-slate-400">이 실험에는 그래프가 없습니다.</div>

  const views = cfg.views
  const view = views ? views[Math.min(viewIdx, views.length - 1)] : cfg
  const xKey = view.xKey ?? 'x'
  // series는 배열 또는 (params) => 배열 (공 개수처럼 동적으로 변할 때)
  const series = typeof view.series === 'function' ? view.series(params) : view.series

  const data = {
    datasets: series.map((s) => ({
      label: s.label,
      // 시리즈별 x축 키(s.xKey)를 지원 — 예: 공마다 다른 x좌표의 궤적 비교
      data: points.map((p) => ({ x: p[s.xKey ?? xKey], y: p[s.key] })),
      borderColor: s.color,
      backgroundColor: s.color,
      borderWidth: 2,
      pointRadius: s.pointRadius ?? 0,
      borderDash: s.dash,
      tension: 0,
    })),
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: resolveLabel(view.xLabel, params) },
      },
      y: {
        title: { display: true, text: resolveLabel(view.yLabel, params) },
      },
    },
    plugins: {
      legend: { display: series.length > 1 },
    },
  }

  // 현재 뷰의 데이터를 CSV로 내보내기 (엑셀에서 분산형 차트로 그리기 좋은 형태)
  const exportCSV = () => {
    const mixedX = series.some((s) => s.xKey && s.xKey !== xKey)
    let header, rows
    if (mixedX) {
      // 시리즈마다 x가 다르면(예: 공별 궤적) [x, y] 쌍을 나란히
      header = series.flatMap((s) => [`${s.label} x`, `${s.label} y`])
      rows = points.map((p) => series.flatMap((s) => [p[s.xKey ?? xKey], p[s.key]]))
    } else {
      header = [resolveLabel(view.xLabel, params), ...series.map((s) => s.label)]
      rows = points.map((p) => [p[xKey], ...series.map((s) => p[s.key])])
    }
    downloadCSV(`scilab-${module.id}-${view.label ?? '그래프'}.csv`, header, rows)
  }

  return (
    <div className="p-3">
      <div className="mb-2 flex gap-1">
        {views &&
          views.map((v, i) => (
            <button
              key={v.label}
              onClick={() => setViewIdx(i)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                i === viewIdx
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {v.label}
            </button>
          ))}
        <button
          onClick={exportCSV}
          disabled={points.length === 0}
          className="ml-auto rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
          title="현재 그래프 데이터를 CSV로 저장 → 엑셀에서 차트 만들기"
        >
          ⬇ CSV 저장 (엑셀)
        </button>
      </div>
      <div className="h-52">
        <Line data={data} options={options} />
      </div>
    </div>
  )
}
