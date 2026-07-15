import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { Line } from 'react-chartjs-2'

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

  const data = {
    datasets: view.series.map((s) => ({
      label: s.label,
      data: points.map((p) => ({ x: p[xKey], y: p[s.key] })),
      borderColor: s.color,
      backgroundColor: s.color,
      borderWidth: 2,
      pointRadius: s.pointRadius ?? 0,
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
      legend: { display: view.series.length > 1 },
    },
  }

  return (
    <div className="p-3">
      {views && (
        <div className="mb-2 flex gap-1">
          {views.map((v, i) => (
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
        </div>
      )}
      <div className="h-52">
        <Line data={data} options={options} />
      </div>
    </div>
  )
}
