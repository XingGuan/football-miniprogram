// utils/date.js - 日期处理工具

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date|string|number} date 日期
 */
function formatDate(date) {
  const d = parseDate(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化时间为 HH:mm
 * @param {Date|string|number} date 日期
 */
function formatTime(date) {
  const d = parseDate(date)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm
 * @param {Date|string|number} date 日期
 */
function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`
}

/**
 * 格式化日期时间为 MM-DD HH:mm
 * @param {Date|string|number} date 日期
 */
function formatShortDateTime(date) {
  const d = parseDate(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

/**
 * 解析日期
 * @param {Date|string|number} date
 */
function parseDate(date) {
  if (date instanceof Date) {
    return date
  }
  if (typeof date === 'number') {
    return new Date(date)
  }
  if (typeof date === 'string') {
    // 兼容 ISO 格式和其他格式
    return new Date(date.replace(/-/g, '/'))
  }
  return new Date()
}

/**
 * 获取相对时间描述
 * @param {Date|string|number} date
 */
function getRelativeTime(date) {
  const d = parseDate(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) {
    return '刚刚'
  }
  if (minutes < 60) {
    return `${minutes}分钟前`
  }
  if (hours < 24) {
    return `${hours}小时前`
  }
  if (days < 7) {
    return `${days}天前`
  }
  if (days < 30) {
    return `${Math.floor(days / 7)}周前`
  }
  if (days < 365) {
    return `${Math.floor(days / 30)}个月前`
  }
  return `${Math.floor(days / 365)}年前`
}

/**
 * 判断是否是今天
 * @param {Date|string|number} date
 */
function isToday(date) {
  const d = parseDate(date)
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

/**
 * 判断是否是明天
 * @param {Date|string|number} date
 */
function isTomorrow(date) {
  const d = parseDate(date)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return d.toDateString() === tomorrow.toDateString()
}

/**
 * 判断是否是昨天
 * @param {Date|string|number} date
 */
function isYesterday(date) {
  const d = parseDate(date)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return d.toDateString() === yesterday.toDateString()
}

/**
 * 获取友好的日期描述
 * @param {Date|string|number} date
 */
function getFriendlyDate(date) {
  if (isToday(date)) {
    return '今天'
  }
  if (isTomorrow(date)) {
    return '明天'
  }
  if (isYesterday(date)) {
    return '昨天'
  }
  return formatDate(date)
}

/**
 * 获取星期几
 * @param {Date|string|number} date
 */
function getWeekDay(date) {
  const d = parseDate(date)
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekDays[d.getDay()]
}

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  formatShortDateTime,
  parseDate,
  getRelativeTime,
  isToday,
  isTomorrow,
  isYesterday,
  getFriendlyDate,
  getWeekDay
}
