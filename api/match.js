// api/match.js - 比赛相关接口
const { get, post } = require('./index')

/**
 * 获取比赛列表
 * @param {Object} params 查询参数
 * @param {string} params.status 比赛状态
 * @param {string} params.leagueId 联赛ID
 * @param {string} params.date 日期 YYYY-MM-DD
 */
function getMatchList(params = {}) {
  return get('/api/match/list', params)
}

/**
 * 获取比赛详情
 * @param {string|number} matchId 比赛ID
 */
function getMatchDetail(matchId) {
  return get(`/api/match/${matchId}`)
}

/**
 * 获取今日比赛
 */
function getTodayMatches() {
  const today = formatDate(new Date())
  return getMatchList({ date: today })
}

/**
 * 按状态获取比赛
 * @param {string} status 比赛状态
 */
function getMatchesByStatus(status) {
  return getMatchList({ status })
}

/**
 * 按联赛获取比赛
 * @param {string} leagueId 联赛ID
 */
function getMatchesByLeague(leagueId) {
  return getMatchList({ leagueId })
}

/**
 * 获取计算器比赛数据
 */
function getCalculatorMatches() {
  return get('/api/match/calculator')
}

/**
 * 保存计算器选择
 * @param {Object} data 选择数据
 */
function saveCalculatorSelection(data) {
  return post('/api/match/calculator/save', data)
}

/**
 * 获取用户的模拟试玩记录
 * @param {string|number} userId 用户ID
 */
function getCalculatorRecords(userId) {
  // 直接在URL上拼接时间戳避免缓存
  return get(`/api/match/calculator/get/${userId}?_t=${Date.now()}`)
}

/**
 * 删除模拟试玩记录
 * @param {string|number} id 记录ID
 */
function deleteCalculatorRecord(id) {
  return post(`/api/match/calculator/delete/${id}`)
}

/**
 * 获取比赛所有玩法赔率
 * @param {string|number} matchId 比赛ID
 */
function getMatchAllOdds(matchId) {
  return get(`/api/match/odds/${matchId}`)
}

/**
 * 格式化日期
 * @param {Date} date 日期对象
 */
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

module.exports = {
  getMatchList,
  getMatchDetail,
  getTodayMatches,
  getMatchesByStatus,
  getMatchesByLeague,
  getCalculatorMatches,
  saveCalculatorSelection,
  getCalculatorRecords,
  deleteCalculatorRecord,
  getMatchAllOdds
}
