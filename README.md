# 🔬 SciLab — 가상 과학 실험실

브라우저에서 돌아가는 가상 과학 실험 플랫폼입니다.
실험은 **ExperimentModule 인터페이스** 하나만 구현해 등록하면 프레임이 슬라이더·캔버스·그래프·데이터 표·설명 패널을 전부 자동으로 렌더링합니다.

## 기술 스택

- Vite + React (JavaScript)
- Tailwind CSS 4
- Chart.js + react-chartjs-2 (실시간 그래프)
- HTML5 Canvas + requestAnimationFrame (시뮬레이션 애니메이션)
- 정적 배포 가능 (GitHub Pages / Vercel — `base: './'` 설정 완료)

## 실행 방법

```bash
npm install      # 의존성 설치
npm run dev      # 개발 서버 (기본 http://localhost:5173)
npm run build    # 정적 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```

## 실험 추가 방법

1. `src/experiments/` 아래에 모듈 파일을 만든다 (아래 인터페이스 구현).
2. `src/experiments/index.js`의 `experiments` 배열에 추가한다.
3. 끝 — 드롭다운에 자동으로 나타난다.

### ExperimentModule 인터페이스

```js
const module = {
  id: string,
  title: string,
  subject: '물리' | '화학' | '생물' | '지구과학',

  // 조작 변수 → 슬라이더 자동 생성
  // 확장: { type: 'select', options: [{value,label}] } → 드롭다운
  // 확장: visible: (params) => boolean → 조건부 표시
  params: [{ key, label, min, max, step, value, unit }],

  reset: (params) => state,               // 초기 상태
  step: (state, params, dt) => newState,  // 매 프레임 물리 업데이트 (dt: 초)
  draw: (ctx, state, params, canvas) => void, // 캔버스 그리기

  chart: {
    xLabel, yLabel,                        // 문자열 또는 (params) => 문자열
    getPoint: (state, params) => ({ x, [seriesKey]: value }),
    series: [{ key, label, color, pointRadius? }],
    clearOnParamChange?: boolean,          // 기본 true. false면 파라미터를 바꿔도 점 누적
    resetOn?: (params) => any,             // 반환값이 바뀌면 그래프 초기화 (모드 전환 등)
  },

  table: {
    columns: [{ key, label, unit }],
    sample: (state, params) => ({ [key]: value }), // "측정" 버튼 → 한 줄 기록
  },

  info: { formula: string, description: string },
}
```

## 폴더 구조

```
src/
  main.jsx              진입점
  App.jsx               레이아웃 + 시뮬레이션 오케스트레이션
  components/
    SimulationCanvas.jsx  rAF 루프 + 리사이즈 대응 캔버스
    ControlPanel.jsx      params → 슬라이더/셀렉트 자동 생성
    PlaybackControls.jsx  재생/일시정지/초기화/배속(0.5x/1x/2x)
    LiveChart.jsx         chart.js 래퍼, 실시간 스트리밍(최대 300점 롤링)
    DataTable.jsx         측정 기록 표 (행 삭제/전체 지우기)
    InfoPanel.jsx         공식 + 원리 설명
  experiments/
    index.js              실험 레지스트리 (여기 등록하면 드롭다운에 자동 추가)
    demo.js               데모: 왕복 운동
```
