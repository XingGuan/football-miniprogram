// api/groupbuy.js - 拼团相关接口
const { get, post } = require('./index')

/**
 * 发起拼团
 * @param {string} userId 用户ID
 * @param {number} groupSize 拼团人数
 */
function createGroup(userId, groupSize) {
  return post('/api/groupbuy/create', { userId, groupSize })
}

/**
 * 加入拼团
 * @param {string} groupId 拼团ID
 * @param {string} userId 用户ID
 */
function joinGroup(groupId, userId) {
  return post('/api/groupbuy/join', { groupId, userId })
}

/**
 * 查询拼团详情
 * @param {string} groupId 拼团ID
 */
function getGroupDetail(groupId) {
  return get(`/api/groupbuy/detail/${groupId}`, { _t: Date.now() }, { showLoading: false })
}

/**
 * 获取我发起的拼团列表
 * @param {string} userId 用户ID
 * @param {number} pageNum 页码
 * @param {number} pageSize 每页数量
 */
function getMyGroupList(userId, pageNum = 1, pageSize = 20) {
  return post('/api/groupbuy/my/list', { userId, pageNum, pageSize }, { showLoading: false })
}

/**
 * 领取拼团奖励
 * @param {string} userId 用户ID
 * @param {string} groupId 拼团ID
 */
function claimReward(userId, groupId) {
  return post('/api/groupbuy/claim/reward', { userId, groupId })
}

module.exports = {
  createGroup,
  joinGroup,
  getGroupDetail,
  getMyGroupList,
  claimReward
}
