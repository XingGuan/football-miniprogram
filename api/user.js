// api/user.js - 用户相关接口
const { get, post } = require('./index')

/**
 * 发送验证码
 * @param {string} phone 手机号
 */
function sendSms(phone) {
  return post('/api/sms/send', { phone }, { showLoading: false })
}

/**
 * 用户登录
 * @param {string} phone 手机号
 * @param {string} code 验证码
 */
function login(phone, code) {
  return post('/api/user/login', { phone, code })
}

/**
 * 退出登录
 */
function logout() {
  return post('/api/user/logout', {}, { showLoading: false })
}

/**
 * 获取用户信息
 */
function getUserInfo() {
  return get('/api/user/info', {}, { showLoading: false })
}

/**
 * 通过用户ID获取用户信息
 * @param {string} id 用户ID
 */
function getUserInfoById(id) {
  return post('/api/user/info', { id }, { showLoading: false })
}

/**
 * 更新用户信息
 * @param {Object} data 用户信息
 */
function updateUserInfo(data) {
  return post('/api/user/update', data)
}

/**
 * 扣减用户积分
 * @param {string} id 用户ID
 * @param {number} deductPoint 扣减积分数
 * @param {string} matchId 比赛ID（可选）
 */
function deductPoint(id, deductPoint, matchId) {
  const params = { id, deductPoint }
  if (matchId) params.matchId = matchId
  return post('/api/user/point/deduct', params)
}

/**
 * 查询比赛是否已解锁
 * @param {string} matchId 比赛ID
 * @param {string} userId 用户ID
 */
function checkMatchUnlock(matchId, userId) {
  return post('/api/match/check/unlock', { matchId, userId }, { showLoading: false })
}

/**
 * 批量查询比赛解锁状态
 * @param {Array<string>} matchIds 比赛ID数组
 * @param {string} userId 用户ID
 */
function batchCheckMatchUnlock(matchIds, userId) {
  return post('/api/match/batch/check/unlock', { matchIds, userId }, { showLoading: false })
}

module.exports = {
  sendSms,
  login,
  logout,
  getUserInfo,
  getUserInfoById,
  updateUserInfo,
  deductPoint,
  checkMatchUnlock,
  batchCheckMatchUnlock
}
