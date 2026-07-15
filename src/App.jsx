import { useState } from 'react'
import { experiments } from './experiments'
import Lobby from './components/Lobby'
import ExperimentLab from './components/ExperimentLab'

/**
 * 최상위 라우팅: 로비(실험 카탈로그) ↔ 실험 화면.
 * ExperimentLab에 key={module.id}를 주어 실험이 바뀌면 컴포넌트를 통째로
 * 다시 마운트한다 → 이전 실험의 상태가 새 실험의 step/draw에 넘어가는
 * 타이밍 버그가 구조적으로 발생하지 않는다.
 */
export default function App() {
  // 실험이 하나뿐이면(단일 실험 빌드) 로비를 건너뛰고 바로 실험 화면으로
  const [selectedId, setSelectedId] = useState(
    experiments.length === 1 ? experiments[0].id : null,
  )
  const module = experiments.find((e) => e.id === selectedId)

  if (!module) {
    return <Lobby experiments={experiments} onSelect={setSelectedId} />
  }

  return (
    <ExperimentLab
      key={module.id}
      module={module}
      experiments={experiments}
      onSwitch={setSelectedId}
      onBack={() => setSelectedId(null)}
    />
  )
}
