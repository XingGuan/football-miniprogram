// api/history.js - 历史记录相关接口
const { post, get } = require('./index')

/**
 * 获取历史记录列表
 * @param {Object} params 分页参数
 * @param {number} params.page 页码
 * @param {number} params.pageSize 每页数量
 */
function getHistoryList(params = {}) {
  const { pageNo = 1, pageSize = 20 } = params
  return post('/api/analysis/history/list', { pageNo, pageSize })
}

/**
 * 获取历史记录详情
 * @param {string|number} matchId 比赛ID
 */
function getHistoryDetail(matchId) {
  return get(`/api/analysis/history/${matchId}`)
}

/**
 * 删除历史记录
 * @param {string|number} id 记录ID
 */
function deleteHistory(id) {
  return post(`/api/analysis/history/delete/${id}`)
}

module.exports = {
  getHistoryList,
  getHistoryDetail,
  deleteHistory
}
