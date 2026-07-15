/**
 * CSV 다운로드 유틸.
 * 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 붙인다.
 */
export function downloadCSV(filename, header, rows) {
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s
  }
  const csv = '\uFEFF' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a) // 일부 브라우저는 DOM에 있어야 download 속성을 존중
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}
