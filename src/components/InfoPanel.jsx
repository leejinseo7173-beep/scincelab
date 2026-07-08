/** 원리 설명 패널: 공식 + 설명 텍스트 */
export default function InfoPanel({ module }) {
  const info = module.info
  if (!info) return <div className="p-6 text-sm text-slate-400">설명이 없습니다.</div>

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="rounded-lg bg-slate-800 px-5 py-4 text-center font-mono text-lg text-emerald-300">
        {info.formula}
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
        {info.description}
      </p>
    </div>
  )
}
