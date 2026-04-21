// app.js
App({
  globalData: {
    userInfo: null,
    token: null,
    isLoggedIn: false,
    baseUrl: 'https://ai-football.cn/foot' // 需要替换为实际的 API 域名
  },

  onLaunch() {
    // 初始化用户状态
    this.initUserState()

    // 获取系统信息
    this.getSystemInfo()

    // 延迟加载远程 tabBar 图标（避免首屏加载过慢）
    setTimeout(() => {
      this.loadRemoteTabBarIcons()
    }, 1000)
  },

  // tabBar 图标配置（远程地址）
  tabBarIcons: [
    {
      index: 0,
      iconPath: 'https://ai-football.cn/10.png',
      selectedIconPath: 'https://ai-football.cn/5.png'
    },
    {
      index: 1,
      iconPath: 'https://ai-football.cn/6.png',
      selectedIconPath: 'https://ai-football.cn/1.png'
    },
    {
      index: 2,
      iconPath: 'https://ai-football.cn/7.png',
      selectedIconPath: 'https://ai-football.cn/2.png'
    },
    {
      index: 3,
      iconPath: 'https://ai-football.cn/8.png',
      selectedIconPath: 'https://ai-football.cn/3.png'
    },
    {
      index: 4,
      iconPath: 'https://ai-football.cn/9.png',
      selectedIconPath: 'https://ai-football.cn/4.png'
    }
  ],

  // 加载远程 tabBar 图标
  loadRemoteTabBarIcons() {
    const cacheKey = 'tabBarIconsCache'
    const cachedIcons = wx.getStorageSync(cacheKey)

    this.tabBarIcons.forEach(item => {
      // 检查缓存
      if (cachedIcons && cachedIcons[item.index]) {
        const cached = cachedIcons[item.index]
        wx.setTabBarItem({
          index: item.index,
          iconPath: cached.iconPath,
          selectedIconPath: cached.selectedIconPath
        })
        return
      }

      // 同时下载普通图标和选中图标
      Promise.all([
        this.downloadFile(item.iconPath),
        this.downloadFile(item.selectedIconPath)
      ]).then(([iconPath, selectedIconPath]) => {
        if (iconPath || selectedIconPath) {
          const updateData = {}
          if (iconPath) updateData.iconPath = iconPath
          if (selectedIconPath) updateData.selectedIconPath = selectedIconPath

          wx.setTabBarItem({
            index: item.index,
            ...updateData
          })

          // 保存到缓存
          const allCache = wx.getStorageSync(cacheKey) || {}
          allCache[item.index] = {
            iconPath: iconPath || item.iconPath,
            selectedIconPath: selectedIconPath || item.selectedIconPath
          }
          wx.setStorageSync(cacheKey, allCache)
        }
      }).catch(err => {
        console.log('tabBar 图标加载失败，使用本地图标:', err)
      })
    })
  },

  // 下载文件并返回本地路径
  downloadFile(url) {
    return new Promise((resolve) => {
      wx.downloadFile({
        url: url,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.tempFilePath)
          } else {
            resolve(null)
          }
        },
        fail: () => {
          resolve(null)
        }
      })
    })
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
