// app.js
App({
  globalData: {
    userInfo: null,
    token: null,
    isLoggedIn: false,
    baseUrl: 'https://www.xingxing2019.cn/foot' // 需要替换为实际的 API 域名
  },

  onLaunch() {
    // 初始化用户状态
    this.initUserState()

    // 获取系统信息
    this.getSystemInfo()
  },

  // 初始化用户状态
  initUserState() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')

    if (token) {
      this.globalData.token = token
      this.globalData.isLoggedIn = true
    }

    if (userInfo) {
      this.globalData.userInfo = userInfo
    }
  },

  // 获取系统信息
  getSystemInfo() {
    try {
      const systemInfo = wx.getWindowInfo()
      const deviceInfo = wx.getDeviceInfo()

      this.globalData.systemInfo = {
        ...systemInfo,
        ...deviceInfo
      }

      // 获取状态栏高度
      this.globalData.statusBarHeight = systemInfo.statusBarHeight || 20

      // 计算导航栏高度 (状态栏 + 导航栏内容)
      this.globalData.navBarHeight = this.globalData.statusBarHeight + 44
    } catch (e) {
      console.error('获取系统信息失败:', e)
      this.globalData.statusBarHeight = 20
      this.globalData.navBarHeight = 64
    }
  },

  // 设置登录状态
  setLoginState(token, userInfo) {
    this.globalData.token = token
    this.globalData.userInfo = userInfo
    this.globalData.isLoggedIn = true

    wx.setStorageSync('token', token)
    if (userInfo) {
      wx.setStorageSync('userInfo', userInfo)
    }
  },

  // 清除登录状态
  clearLoginState() {
    this.globalData.token = null
    this.globalData.userInfo = null
    this.globalData.isLoggedIn = false

    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
  },

  // 检查登录状态
  checkLogin() {
    if (!this.globalData.isLoggedIn || !this.globalData.token) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return false
    }
    return true
  }
})
