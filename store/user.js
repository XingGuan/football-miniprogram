// store/user.js - 用户状态管理
const userApi = require('../api/user')

/**
 * 获取 App 实例（延迟获取，避免在模块加载时 App 还未初始化）
 */
function getAppInstance() {
  return getApp()
}

/**
 * 用户状态管理器
 */
const userStore = {
  /**
   * 获取登录状态
   */
  isLoggedIn() {
    const app = getAppInstance()
    return app && app.globalData && app.globalData.isLoggedIn
  },

  /**
   * 获取 Token
   */
  getToken() {
    const app = getAppInstance()
    return app && app.globalData && app.globalData.token
  },

  /**
   * 获取用户信息
   */
  getUserInfo() {
    const app = getAppInstance()
    
    return app && app.globalData && app.globalData.userInfo
  },

  /**
   * 发送验证码
   * @param {string} phone 手机号
   */
  async sendSms(phone) {
    try {
      await userApi.sendSms(phone)
      return { success: true }
    } catch (error) {
      return { success: false, message: error.message }
    }
  },

  /**
   * 登录
   * @param {string} phone 手机号
   * @param {string} code 验证码
   */
  async login(phone, code) {
    try {
      const app = getAppInstance()
      const data = await userApi.login(phone, code)

      if (data && data.token) {
        // 保存登录状态
        app.setLoginState(data.token, data.userInfo || null)

        // 如果没有用户信息，再获取一次
        if (!data.userInfo) {
          await this.fetchUserInfo()
        }

        return { success: true }
      }

      return { success: false, message: '登录失败' }
    } catch (error) {
      return { success: false, message: error.message }
    }
  },

  /**
   * 退出登录
   */
  async logout() {
    const app = getAppInstance()
    try {
      await userApi.logout()
    } catch (error) {
      console.error('退出登录接口调用失败:', error)
    }

    // 无论接口是否成功，都清除本地状态
    app.clearLoginState()
    return { success: true }
  },

  /**
   * 获取用户信息
   */
  async fetchUserInfo() {
    const app = getAppInstance()
    try {
      const userInfo = await userApi.getUserInfo()

      if (userInfo) {
        app.globalData.userInfo = userInfo
        wx.setStorageSync('userInfo', userInfo)
        return { success: true, data: userInfo }
      }

      return { success: false, message: '获取用户信息失败' }
    } catch (error) {
      return { success: false, message: error.message }
    }
  },

  /**
   * 更新用户信息
   * @param {Object} data 用户信息
   */
  async updateUserInfo(data) {
    const app = getAppInstance()
    try {
      await userApi.updateUserInfo(data)

      // 更新本地状态
      const userInfo = { ...app.globalData.userInfo, ...data }
      app.globalData.userInfo = userInfo
      wx.setStorageSync('userInfo', userInfo)

      return { success: true }
    } catch (error) {
      return { success: false, message: error.message }
    }
  },

  /**
   * 检查登录状态，未登录则跳转登录页
   */
  checkLoginWithRedirect() {
    if (!this.isLoggedIn()) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return false
    }
    return true
  },

  /**
   * 微信登录
   * @param {Object} userInfo 用户信息（昵称、头像等）
   */
  async wxLogin(userInfo) {
    try {
      const app = getAppInstance()

      // 获取微信登录凭证
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        })
      })

      if (!loginRes.code) {
        return { success: false, message: '获取微信登录凭证失败' }
      }

      // 调用后端微信登录接口
      const data = await userApi.wxLogin(loginRes.code, userInfo)

      if (data && data.token) {
        // 保存登录状态
        app.setLoginState(data.token, data.userInfo || null)

        // 如果没有用户信息，再获取一次
        if (!data.userInfo) {
          await this.fetchUserInfo()
        }

        return { success: true }
      }

      return { success: false, message: '登录失败' }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }
}

module.exports = userStore
