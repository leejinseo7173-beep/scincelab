/**
 * 실험 모듈 레지스트리.
 * 여기 배열에 모듈을 추가하면 로비 카탈로그와 실험 드롭다운에 자동으로 나타난다.
 * (demo.js는 프레임 개발용 데모 — 카탈로그에서는 제외)
 */
import incline from './incline'
import projectile from './projectile'
import gasLaw from './gasLaw'

const all = [incline, projectile, gasLaw]

// 단일 실험 배포용: VITE_ONLY=<실험id> 로 빌드하면 그 실험만 포함된다
// (예: VITE_ONLY=projectile npx vite build → 포물선 실험 단독 HTML)
const only = import.meta.env.VITE_ONLY
export const experiments = only ? all.filter((e) => e.id === only) : all
