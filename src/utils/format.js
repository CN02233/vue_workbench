// EN: Shared formatting helpers used by table cells and detail views.
// 中文：表格单元格与详情页共用的格式化工具。

// EN: Truncate an ISO timestamp to minute precision; a missing value shows a placeholder.
// 中文：把 ISO 时间截断到分钟；缺失值显示占位符。
export function formatTime(value) {
  return value ? String(value).replace('T', ' ').slice(0, 16) : '—'
}

// EN: Render a table cell: translate enums, format dates, and keep a placeholder for nullish values.
// 中文：渲染表格单元格：翻译枚举、格式化日期，空值显示占位符。
export function formatCell(row, key, translate, dateKeys = []) {
  if (['status', 'category', 'refund_type'].includes(key)) return translate(row[key] || '')
  if (dateKeys.includes(key)) return formatTime(row[key])
  return row[key] === null || row[key] === undefined ? '—' : row[key]
}
