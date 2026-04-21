// api/league.js - 联赛相关接口
const { post } = require('./index')

/**
 * 获取联赛列表
 * @returns {Promise} 联赛列表
 */
function getLeagueList() {
  return post('/api/league/list', {}, { showLoading: false })
}

/**
 * 获取联赛赛季列表
 * @param {number|string} leagueId 联赛ID
 * @returns {Promise} 赛季列表
 */
function getSeasonList(leagueId) {
  return post(`/api/league/season/list/${leagueId}`, {}, { showLoading: false })
}

/**
 * 获取联赛排名信息
 * @param {number|string} leagueId 联赛ID
 * @param {number|string} seasonId 赛季ID
 * @returns {Promise} 排名列表
 */
function getStanding(leagueId, seasonId) {
  return post(`/api/league/standing/${leagueId}/${seasonId}`, {}, { showLoading: false })
}

module.exports = {
  getLeagueList,
  getSeasonList,
  getStanding
}
