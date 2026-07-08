import { useState } from 'react'

const SUBJECTS = ['전체', '물리', '화학', '생물', '지구과학']

const SUBJECT_STYLE = {
  물리: 'bg-blue-100 text-blue-700',
  화학: 'bg-emerald-100 text-emerald-700',
  생물: 'bg-rose-100 text-rose-700',
  지구과학: 'bg-amber-100 text-amber-700',
}

/**
 * 로비(실험 카탈로그) 화면.
 * 과목 필터를 고르면 해당 과목의 실험 카드가 보이고, 카드를 누르면 실험이 시작된다.
 */
export default function Lobby({ experiments, onSelect }) {
  const [subject, setSubject] = useState('전체')

  const filtered =
    subject === '전체' ? experiments : experiments.filter((e) => e.subject === subject)

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-8 p-6">
      {/* ---------- 타이틀 ---------- */}
      <header className="pt-10 text-center">
        <div className="text-5xl">🔬</div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">SciLab 가상 과학 실험실</h1>
        <p className="mt-2 text-slate-500">
          과목을 고르고, 실험을 선택해서 직접 변수를 바꿔보며 과학 원리를 확인해 보세요.
        </p>
      </header>

      {/* ---------- 과목 필터 ---------- */}
      <div className="flex flex-wrap justify-center gap-2">
        {SUBJECTS.map((s) => {
          const count =
            s === '전체' ? experiments.length : experiments.filter((e) => e.subject === s).length
          return (
            <button
              key={s}
              onClick={() => setSubject(s)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                subject === s
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
              }`}
            >
              {s} <span className="opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* ---------- 실험 카드 ---------- */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center text-slate-400 shadow-sm">
          <div className="text-3xl">🧫</div>
          <p className="mt-3">이 과목의 실험은 아직 준비 중입니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <button
              key={e.id}
              onClick={() => onSelect(e.id)}
              className="group flex flex-col gap-3 rounded-2xl bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{e.icon ?? '🔭'}</span>
                <span
                  className={`ml-auto rounded-full px-3 py-0.5 text-xs font-semibold ${
                    SUBJECT_STYLE[e.subject] ?? 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {e.subject}
                </span>
              </div>
              <h2 className="text-lg font-bold">{e.title}</h2>
              <p className="text-sm leading-relaxed text-slate-500">{e.summary}</p>
              <span className="mt-auto text-sm font-semibold text-blue-600 group-hover:underline">
                실험 시작 →
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
