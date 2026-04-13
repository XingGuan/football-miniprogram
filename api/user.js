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
 * 扣减用户积分
 * @param {string} id 用户ID
 * @param {number} deductPoint 扣减积分数
 * @param {string} matchId 比赛ID（可选）
 */
function deductPointForInformation(id, deductPoint, matchId) {
  const params = { id, deductPoint }
  if (matchId) params.matchId = matchId
  return post('/api/user/point/information/deduct', params)
}

/**
 * 查询情报是否已解锁
 * @param {string} matchId 比赛ID
 * @param {string} userId 用户ID
 */
function checkInformationUnlock(matchId, userId) {
  return post('/api/match/check/Information/unlock', { matchId, userId }, { showLoading: false })
}

/**
 * 批量查询比赛解锁状态
 * @param {Array<string>} matchIds 比赛ID数组
 * @param {string} userId 用户ID
 */
function batchCheckMatchUnlock(matchIds, userId) {
  return post('/api/match/batch/check/unlock', { matchIds, userId }, { showLoading: false })
}

/**
 * 用户签到
 * @param {string} userId 用户ID
 */
function userSign(userId) {
  return post(`/api/user/sign/${userId}`)
}

/**
 * 微信登录
 * @param {string} code 微信登录凭证
 * @param {Object} userInfo 用户信息（昵称、头像等）
 */
function wxLogin(code, userInfo) {
  return post('/api/user/wx/login', { code, ...userInfo })
}

/**
 * 绑定手机号（更新用户信息）
 * @param {Object} data 绑定参数
 * @param {string} data.userId 用户ID
 * @param {string} data.phone 手机号
 * @param {string} data.code 验证码
 */
function updateUserInfoWithPhone(data) {
  return post('/api/user/info/update', {
    userId: data.userId,
    phone: data.phone,
    code: data.code
  })
}

/**
 * 获取积分明细列表
 * @param {string} userId 用户ID
 * @param {string} changeType 变化类型（可选）
 * @param {number} pageNum 页码
 * @param {number} pageSize 每页数量
 * @param {number} timestamp 时间戳（可选）
 */
function getPointDetailList(userId, changeType, pageNum = 1, pageSize = 20, timestamp) {
  const params = { userId, pageNum, pageSize }
  if (changeType) params.changeType = changeType
  if (timestamp) params.timestamp = timestamp
  return post('/api/user/point/detail/list', params, { showLoading: false })
}

/**
 * 修改用户名
 * @param {string} userId 用户ID
 * @param {string} userName 新用户名
 */
function updateUserName(userId, userName) {
  return post('/api/user/info/update/name', { userId, userName })
}

/**
 * 获取用户勋章列表
 * @param {string} userId 用户ID
 * @returns {Promise<Array>} 勋章列表
 */
function getUserMedals(userId) {
  return get(`/api/user/medal/my/${userId}?_t=${Date.now()}`, {}, { showLoading: false })
}

module.exports = {
  sendSms,
  login,
  logout,
  getUserInfo,
  getUserInfoById,
  updateUserInfo,
  deductPoint,
  deductPointForInformation,
  checkInformationUnlock,
  batchCheckMatchUnlock,
  userSign,
  wxLogin,
  updateUserInfoWithPhone,
  getPointDetailList,
  updateUserName,
  getUserMedals
}
