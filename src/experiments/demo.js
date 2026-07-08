/**
 * 데모 모듈 — 프레임 동작 확인용.
 * 원이 좌우로 단진동(왕복 운동)한다. x = A·sin(2πf·t)
 */
const demo = {
  id: 'demo',
  title: '데모: 왕복 운동',
  subject: '물리',

  params: [
    { key: 'A', label: '진폭 A', min: 1, max: 5, step: 0.5, value: 3, unit: 'm' },
    { key: 'f', label: '진동수 f', min: 0.1, max: 2, step: 0.1, value: 0.5, unit: 'Hz' },
  ],

  reset: () => ({ t: 0, x: 0 }),

  step: (state, params, dt) => {
    const t = state.t + dt
    return { t, x: params.A * Math.sin(2 * Math.PI * params.f * t) }
  },

  draw: (ctx, state, params, canvas) => {
    const W = canvas.width
    const H = canvas.height
    const cx = W / 2
    const cy = H / 2
    const scale = (W / 2 - 60) / 5 // 최대 진폭 5m 기준 픽셀 환산

    // 중심선
    ctx.strokeStyle = '#cbd5e1'
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    ctx.moveTo(60, cy)
    ctx.lineTo(W - 60, cy)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(cx, cy - 30)
    ctx.lineTo(cx, cy + 30)
    ctx.stroke()

    // 움직이는 원
    ctx.fillStyle = '#2563eb'
    ctx.beginPath()
    ctx.arc(cx + state.x * scale, cy, 18, 0, Math.PI * 2)
    ctx.fill()

    // 수치 표시
    ctx.fillStyle = '#334155'
    ctx.font = '14px sans-serif'
    ctx.fillText(`t = ${state.t.toFixed(1)} s`, 20, 28)
    ctx.fillText(`x = ${state.x.toFixed(2)} m`, 20, 48)
  },

  chart: {
    xLabel: '시간 t (s)',
    yLabel: '위치 x (m)',
    getPoint: (state) => ({ x: Number(state.t.toFixed(3)), y: state.x }),
    series: [{ key: 'y', label: '위치 x', color: '#2563eb' }],
  },

  table: {
    columns: [
      { key: 't', label: '시간', unit: 's' },
      { key: 'x', label: '위치', unit: 'm' },
    ],
    sample: (state) => ({ t: state.t.toFixed(2), x: state.x.toFixed(2) }),
  },

  info: {
    formula: 'x = A·sin(2πf·t)',
    description:
      '프레임 동작 확인용 데모입니다. 진폭 A와 진동수 f를 바꾸면 원의 왕복 운동이 어떻게 달라지는지 관찰해 보세요.\n실제 실험 모듈은 이 데모와 같은 ExperimentModule 인터페이스로 추가됩니다.',
  },
}

export default demo
