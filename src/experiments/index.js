/**
 * 실험 모듈 레지스트리.
 * 여기 배열에 모듈을 추가하면 로비 카탈로그와 실험 드롭다운에 자동으로 나타난다.
 * (demo.js는 프레임 개발용 데모 — 카탈로그에서는 제외)
 */
import incline from './incline'
import projectile from './projectile'
import gasLaw from './gasLaw'

export const experiments = [incline, projectile, gasLaw]
