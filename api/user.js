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
 * 更新用户信息
 * @param {Object} data 用户信息
 */
function updateUserInfo(data) {
  return post('/api/user/update', data)
}

module.exports = {
  sendSms,
  login,
  logout,
  getUserInfo,
  updateUserInfo
}
