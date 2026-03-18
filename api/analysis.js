// api/analysis.js - 比赛分析相关接口
const { post, get } = require('./index')

/**
 * 获取历史交锋数据
 * @param {string|number} matchId 比赛ID
 */
function getHistoryData(matchId) {
  return post(`/api/match/history/data/${matchId}`, {}, { showLoading: false })
}

/**
 * 获取 xG 数据
 * @param {string|number} matchId 比赛ID
 */
function getXgData(matchId) {
  return post(`/api/match/xg/data/${matchId}`, {}, { showLoading: false })
}

/**
 * 获取相似比赛数据
 * @param {string|number} matchId 比赛ID
 */
function getSimilarData(matchId) {
  return post(`/api/match/similar/data/${matchId}`, {}, { showLoading: false })
}

/**
 * 获取赔率变化数据
 * @param {string|number} matchId 比赛ID
 */
function getOddsData(matchId) {
  return post(`/api/match/odds/data/${matchId}`, {}, { showLoading: false })
}

/**
 * 获取情报数据
 * @param {string|number} matchId 比赛ID
 */
function getInformationData(matchId) {
  return post(`/api/match/information/data/${matchId}`, {}, { showLoading: false })
}

module.exports = {
  getHistoryData,
  getXgData,
  getSimilarData,
  getOddsData,
  getInformationData
}
