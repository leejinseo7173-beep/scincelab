/**
 * 실험 ③ 보일-샤를 법칙 (화학)
 *
 * 이상기체 PV = nRT를 학생 수준의 상대 단위로 단순화:
 *   V = n·T / (P·300)  →  n=1 mol, T=300 K, P=1 atm일 때 V=1 (상대부피)
 *
 * - 보일 법칙(등온): T=300 K 고정, P 조작 → V ∝ 1/P (반비례)
 * - 샤를 법칙(등압): P=1 atm 고정, T 조작 → V ∝ T (비례)
 *
 * 파라미터 확장 사용: type:'select'(모드), visible(모드별 슬라이더 표시)
 * 그래프 확장 사용: clearOnParamChange:false(슬라이더를 움직이며 곡선 누적),
 *                  resetOn(모드가 바뀌면 그래프 초기화), xLabel을 함수로(축 라벨 전환)
 */
const T_FIXED = 300 // 보일 모드 고정 온도 (K)
const P_FIXED = 1 // 샤를 모드 고정 압력 (atm)
const V_MAX = 6 // 상대부피 최댓값 (n=3, T=600, P=1)

/** 현재 모드의 P, T, V 계산 */
function gasState(params) {
  const boyle = params.mode === 'boyle'
  const P = boyle ? params.P : P_FIXED
  const T = boyle ? T_FIXED : params.T
  const V = (params.n * T) / (P * 300)
  return { P, T, V, boyle }
}

const gasLaw = {
  id: 'gas-law',
  title: '보일-샤를 법칙 (기체)',
  subject: '화학',

  params: [
    {
      key: 'mode',
      label: '모드',
      type: 'select',
      value: 'boyle',
      options: [
        { value: 'boyle', label: '보일 법칙 (등온: T 고정)' },
        { value: 'charles', label: '샤를 법칙 (등압: P 고정)' },
      ],
    },
    {
      key: 'P', label: '압력 P', min: 0.5, max: 3, step: 0.05, value: 1, unit: 'atm',
      visible: (p) => p.mode === 'boyle',
    },
    {
      key: 'T', label: '온도 T', min: 100, max: 600, step: 5, value: 300, unit: 'K',
      visible: (p) => p.mode === 'charles',
    },
    { key: 'n', label: '기체 양 n', min: 0.5, max: 3, step: 0.1, value: 1, unit: 'mol' },
  ],

  /**
   * 입자는 추상 좌표계에서 시뮬레이션: 가로 0~2(고정), 세로 0~V(부피에 비례).
   * 부피가 작을수록 세로 왕복이 잦아져 "벽 충돌이 많다 = 압력이 높다"는 느낌을 준다.
   */
  reset: (params) => {
    const { V, T } = gasState(params)
    const count = Math.round(params.n * 16)
    const speed = 1.6 * Math.sqrt(T / 300) // 온도 높을수록 빠르게
    const particles = []
    // Math.random 대신 결정적 의사난수(재현 가능한 초기 배치)
    let seed = 42
    const rnd = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    for (let i = 0; i < count; i++) {
      const ang = rnd() * Math.PI * 2
      particles.push({
        x: 0.1 + rnd() * 1.8,
        y: V * (0.05 + rnd() * 0.9),
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
      })
    }
    return { particles }
  },

  step: (state, params, dt) => {
    const { V } = gasState(params)
    const particles = state.particles.map((p) => {
      let { x, y, vx, vy } = p
      x += vx * dt
      y += vy * dt
      if (x < 0) { x = -x; vx = -vx }
      if (x > 2) { x = 4 - x; vx = -vx }
      if (y < 0) { y = -y; vy = -vy }
      if (y > V) { y = 2 * V - y; vy = -vy } // 피스톤(움직이는 벽)에서 반사
      return { x, y, vx, vy }
    })
    return { particles }
  },

  draw: (ctx, state, params, canvas) => {
    const W = canvas.width
    const H = canvas.height
    const { P, T, V, boyle } = gasState(params)

    // ---- 실린더 배치: 세로형, 부피 → 기체 기둥 높이 ----
    const cylW = Math.min(W * 0.4, 260)
    const cylX = (W - cylW) / 2
    const bottomY = H - 45
    const usableH = bottomY - 70
    const pxPerV = usableH / V_MAX // 상대부피 1당 픽셀 (고정 스케일)
    const gasH = V * pxPerV
    const gasTopY = bottomY - gasH

    // 실린더 벽 (기체 영역보다 위까지)
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(cylX, bottomY - usableH - 14)
    ctx.lineTo(cylX, bottomY)
    ctx.lineTo(cylX + cylW, bottomY)
    ctx.lineTo(cylX + cylW, bottomY - usableH - 14)
    ctx.stroke()

    // 기체 영역
    ctx.fillStyle = boyle ? 'rgba(59,130,246,0.10)' : 'rgba(16,185,129,0.10)'
    ctx.fillRect(cylX, gasTopY, cylW, gasH)

    // 기체 입자 (추상좌표 → 픽셀: x 0~2, y 0~V)
    ctx.fillStyle = boyle ? '#2563eb' : '#059669'
    state.particles.forEach((p) => {
      const px = cylX + (p.x / 2) * cylW
      const py = bottomY - p.y * pxPerV
      ctx.beginPath()
      ctx.arc(px, py, 3.5, 0, Math.PI * 2)
      ctx.fill()
    })

    // 피스톤
    ctx.fillStyle = '#94a3b8'
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 1.5
    ctx.fillRect(cylX - 2, gasTopY - 16, cylW + 4, 16)
    ctx.strokeRect(cylX - 2, gasTopY - 16, cylW + 4, 16)
    ctx.fillRect(cylX + cylW / 2 - 5, gasTopY - 60, 10, 46) // 피스톤 막대
    // 피스톤 위 화살표(압력 방향 느낌)
    ctx.fillStyle = '#64748b'
    ctx.font = '11px sans-serif'
    ctx.fillText('피스톤', cylX + cylW + 10, gasTopY - 4)

    // 열원/냉각 표시 (샤를 모드)
    if (!boyle) {
      const hot = T > 300
      ctx.font = '18px sans-serif'
      ctx.fillText(hot ? '🔥' : '❄️', cylX + cylW / 2 - 10, bottomY + 26)
    }

    // ---- 현재 P·V·T 수치 ----
    ctx.fillStyle = '#334155'
    ctx.font = 'bold 15px sans-serif'
    ctx.fillText(`P = ${P.toFixed(2)} atm    V = ${V.toFixed(2)} (상대부피)    T = ${T.toFixed(0)} K`, 20, 28)
    ctx.font = '13px sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.fillText(
      boyle
        ? `보일 법칙 모드 — 온도 T = ${T_FIXED} K 고정 · P·V = ${(P * V).toFixed(2)} (일정)`
        : `샤를 법칙 모드 — 압력 P = ${P_FIXED} atm 고정 · V/T = ${(V / T).toFixed(4)} (일정)`,
      20, 50,
    )
  },

  chart: {
    // 모드에 따라 x축이 P ↔ T로 바뀐다
    xLabel: (params) => (params.mode === 'boyle' ? '압력 P (atm)' : '온도 T (K)'),
    yLabel: '부피 V (상대부피)',
    // 슬라이더를 움직이는 동안 점이 누적되어 곡선이 그려진다
    clearOnParamChange: false,
    resetOn: (params) => params.mode, // 모드 전환 시에만 그래프 초기화
    getPoint: (state, params) => {
      const { P, T, V, boyle } = gasState(params)
      return { x: boyle ? Number(P.toFixed(2)) : Number(T.toFixed(0)), V: Number(V.toFixed(3)) }
    },
    series: [{ key: 'V', label: '부피 V', color: '#059669', pointRadius: 2.5 }],
  },

  table: {
    columns: [
      { key: 'P', label: '압력 P', unit: 'atm' },
      { key: 'V', label: '부피 V', unit: '상대' },
      { key: 'T', label: '온도 T', unit: 'K' },
      { key: 'PV', label: 'P·V', unit: '' },
      { key: 'VT', label: 'V/T', unit: '' },
    ],
    sample: (state, params) => {
      const { P, T, V } = gasState(params)
      return {
        P: P.toFixed(2),
        V: V.toFixed(2),
        T: T.toFixed(0),
        PV: (P * V).toFixed(2),
        VT: (V / T).toFixed(4),
      }
    },
  },

  info: {
    formula: 'PV = nRT   (보일: PV = 일정,   샤를: V/T = 일정)',
    description:
      '일정량의 기체에서 압력(P)·부피(V)·온도(T)는 이상기체 상태방정식 PV = nRT로 묶여 있습니다.\n\n• 보일 법칙(등온): 온도를 고정하면 PV = 일정 — 압력을 2배로 하면 부피는 절반이 됩니다(반비례). 압력 슬라이더를 천천히 움직이면 그래프에 반비례 곡선이 그려집니다.\n• 샤를 법칙(등압): 압력을 고정하면 V/T = 일정 — 절대온도에 비례해 부피가 늘어납니다(비례 직선). 온도를 높이면 입자들이 빨라져 피스톤을 밀어 올리는 모습을 관찰하세요.\n• 입자 관점: 온도가 높을수록 입자가 빠르게 움직이고, 부피가 작을수록 벽에 부딪히는 횟수가 늘어나 압력이 커집니다.\n• [측정]으로 여러 조건을 기록해 P·V(보일)와 V/T(샤를)가 일정하게 유지되는지 확인해 보세요.',
  },
}

export default gasLaw
