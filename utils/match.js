// utils/match.js - 比赛相关工具函数

/**
 * 比赛状态映射
 */
const MATCH_STATUS = {
  '1': { name: '待开', color: '#999999', badge: 'default' },
  '2': { name: '开放', color: '#1890ff', badge: 'processing' },
  '3': { name: '关闭', color: '#ff4d4f', badge: 'error' },
  '4': { name: '进行中', color: '#52c41a', badge: 'success' },
  '5': { name: '已完成', color: '#666666', badge: 'default' },
  '6': { name: '已取消', color: '#ff4d4f', badge: 'error' }
}

/**
 * 获取比赛状态信息
 * @param {string} status 状态码
 */
function getMatchStatus(status) {
  return MATCH_STATUS[status] || { name: '未知', color: '#999999', badge: 'default' }
}

/**
 * 获取比赛状态名称
 * @param {string} status 状态码
 */
function getMatchStatusName(status) {
  return getMatchStatus(status).name
}

/**
 * 获取比赛状态颜色
 * @param {string} status 状态码
 */
function getMatchStatusColor(status) {
  return getMatchStatus(status).color
}

/**
 * 判断比赛是否可以分析
 * @param {Object} match 比赛对象
 */
function canAnalyze(match) {
  return match.status === '2' || match.status === '1'
}

/**
 * 判断比赛是否进行中
 * @param {Object} match 比赛对象
 */
function isMatchLive(match) {
  return match.status === '4'
}

/**
 * 判断比赛是否已结束
 * @param {Object} match 比赛对象
 */
function isMatchFinished(match) {
  return match.status === '5'
}

/**
 * 格式化赔率
 * @param {number|string|null} odds 赔率值
 * @param {number} decimals 小数位数
 */
function formatOdds(odds, decimals = 2) {
  if (odds === null || odds === undefined || odds === '') {
    return '-'
  }
  const num = parseFloat(odds)
  if (isNaN(num)) {
    return '-'
  }
  return num.toFixed(decimals)
}

/**
 * 格式化让球盘口
 * @param {string|null} goalLine 让球盘口
 */
function formatGoalLine(goalLine) {
  if (!goalLine || goalLine === '0') {
    return '平手'
  }
  const num = parseFloat(goalLine)
  if (num > 0) {
    return `+${goalLine}`
  }
  return goalLine
}

/**
 * 根据比赛结果获取样式类
 * @param {string} result 结果: '胜'|'平'|'负'
 */
function getResultClass(result) {
  const classMap = {
    '胜': 'result-win',
    '平': 'result-draw',
    '负': 'result-lose'
  }
  return classMap[result] || ''
}

/**
 * 判断比赛结果
 * @param {Object} match 比赛对象
 * @param {string} teamType 球队类型: 'home' | 'away'
 */
function getMatchOutcome(match, teamType = 'home') {
  if (!match.score) return null

  const [homeScore, awayScore] = match.score.split(':').map(Number)

  if (isNaN(homeScore) || isNaN(awayScore)) {
    return null
  }

  if (teamType === 'home') {
    if (homeScore > awayScore) return '胜'
    if (homeScore < awayScore) return '负'
    return '平'
  } else {
    if (awayScore > homeScore) return '胜'
    if (awayScore < homeScore) return '负'
    return '平'
  }
}

/**
 * 计算胜率
 * @param {number} wins 胜场数
 * @param {number} total 总场数
 */
function calculateWinRate(wins, total) {
  if (!total || total === 0) return 0
  return Math.round((wins / total) * 100)
}

/**
 * 计算 xG 百分比
 * @param {number} homeXg 主队 xG
 * @param {number} awayXg 客队 xG
 */
function calculateXgPercent(homeXg, awayXg) {
  const total = (homeXg || 0) + (awayXg || 0)
  if (total === 0) return { home: 50, away: 50 }

  return {
    home: Math.round((homeXg / total) * 100),
    away: Math.round((awayXg / total) * 100)
  }
}

/**
 * 获取赔率变化标识
 * @param {string} hf 热门标志
 */
function getOddsChangeFlag(hf) {
  if (hf === '1') return { text: '主热', color: '#f5222d' }
  if (hf === '-1') return { text: '客热', color: '#52c41a' }
  return null
}

/**
 * 按联赛分组比赛
 * @param {Array} matches 比赛列表
 */
function groupMatchesByLeague(matches) {
  const groups = {}

  matches.forEach(match => {
    const league = match.league || '其他'
    if (!groups[league]) {
      groups[league] = []
    }
    groups[league].push(match)
  })

  return Object.keys(groups).map(league => ({
    league,
    matches: groups[league]
  }))
}

/**
 * 按日期分组比赛
 * @param {Array} matches 比赛列表
 */
function groupMatchesByDate(matches) {
  const dateUtils = require('./date')
  const groups = {}

  matches.forEach(match => {
    const date = dateUtils.formatDate(match.fullMatchTime)
    const friendlyDate = dateUtils.getFriendlyDate(match.fullMatchTime)

    if (!groups[date]) {
      groups[date] = {
        date,
        friendlyDate,
        matches: []
      }
    }
    groups[date].matches.push(match)
  })

  return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date))
}

module.exports = {
  MATCH_STATUS,
  getMatchStatus,
  getMatchStatusName,
  getMatchStatusColor,
  canAnalyze,
  isMatchLive,
  isMatchFinished,
  formatOdds,
  formatGoalLine,
  getResultClass,
  getMatchOutcome,
  calculateWinRate,
  calculateXgPercent,
  getOddsChangeFlag,
  groupMatchesByLeague,
  groupMatchesByDate
}
