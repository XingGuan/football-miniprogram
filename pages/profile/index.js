// pages/profile/index.js - 个人中心页面
const userStore = require('../../store/user')
const userApi = require('../../api/user')

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    menuList: [
      { icon: '👨‍💼', title: '联系客服', desc: '24小时在线客服', action: 'contact' },
      // { icon: '💬', title: '意见反馈', desc: '帮助我们改进产品', action: 'feedback' },
      // { icon: '⭐', title: '给我们评分', desc: '如果喜欢请给个好评', action: 'rate' },
      { icon: '📄', title: '用户协议', desc: '查看用户协议', action: 'agreement' },
      { icon: '🔒', title: '隐私政策', desc: '查看隐私政策', action: 'privacy' },
      { icon: 'ℹ️', title: '关于我们', desc: '了解AI足球智能体', action: 'about' }
    ],
    version: '1.0.0',
    // 绑定手机号相关
    showPhonePopup: false,
    bindPhone: '',
    bindCode: '',
    bindCountdown: 0,
    sendingBindCode: false,
    bindLoading: false
  },

  onLoad() {
    // 不在这里调用 updateUserState，避免与 onShow 重复调用
  },

  onShow() {
    this.updateUserState()

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  // 更新用户状态
  async updateUserState() {
    const isLoggedIn = userStore.isLoggedIn()
    let userInfo = userStore.getUserInfo()

    // 如果已登录，重新从服务器获取最新用户信息
    if (isLoggedIn && userInfo && userInfo.id) {
      try {
        const latestUserInfo = await userApi.getUserInfoById(userInfo.id)
        if (latestUserInfo) {
          // 更新本地存储
          wx.setStorageSync('userInfo', latestUserInfo)
          // 更新 app 全局数据
          const app = getApp()
          if (app && app.globalData) {
            app.globalData.userInfo = latestUserInfo
          }
          userInfo = latestUserInfo
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
        // 获取失败时使用本地缓存的用户信息
      }
    }

    this.setData({
      isLoggedIn,
      userInfo
    })
  },

  // 跳转登录
  onLogin() {
    wx.navigateTo({
      url: '/pages/login/index'
    })
  },

  // 退出登录
  async onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '退出中...' })

          await userStore.logout()

          wx.hideLoading()
          this.updateUserState()

          wx.showToast({
            title: '已退出',
            icon: 'success'
          })
        }
      }
    })
  },

  // 签到
  async onSign() {
    const { userInfo, isLoggedIn } = this.data

    if (!isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    // 检查是否已签到
    if (userInfo && userInfo.signToday) {
      wx.showToast({
        title: '今日已签到',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '签到中...' })
      await userApi.userSign(userInfo.id)
      wx.hideLoading()

      wx.showToast({
        title: '签到成功，获得1积分',
        icon: 'success',
        duration: 2000
      })

      // 重新获取用户信息
      setTimeout(() => {
        this.updateUserState()
      }, 1500)
    } catch (error) {
      wx.hideLoading()
      console.error('签到失败:', error)
      wx.showToast({
        title: error.message || '签到失败',
        icon: 'none'
      })
    }
  },

  // 编辑用户信息
  onEditProfile() {
    // 可以弹出编辑框或跳转编辑页面
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 菜单项点击
  onMenuTap(e) {
    const { path, action } = e.currentTarget.dataset

    if (path) {
      wx.navigateTo({ url: path })
      return
    }

    switch (action) {
      case 'feedback':
        this.openFeedback()
        break
      case 'rate':
        this.openRate()
        break
      case 'agreement':
        this.showAgreement()
        break
      case 'privacy':
        this.showPrivacy()
        break
      case 'about':
        this.showAbout()
        break
    }
  },

  // 打开意见反馈
  openFeedback() {
    // 小程序内置反馈入口
    wx.showToast({
      title: '请通过设置-关于-投诉与反馈进行反馈',
      icon: 'none',
      duration: 3000
    })
  },

  // 评分
  openRate() {
    wx.showToast({
      title: '感谢您的支持！',
      icon: 'success'
    })
  },

  // 用户协议
  showAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/index?type=user'
    })
  },

  // 隐私政策
  showPrivacy() {
    wx.navigateTo({
      url: '/pages/agreement/index?type=privacy'
    })
  },

  // 关于我们
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '足球分析助手是一款专业的足球比赛分析工具，为您提供智能 AI 分析、赛事数据、预测建议等服务。',
      showCancel: false
    })
  },

  // 清除缓存
  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存数据吗？',
      success: (res) => {
        if (res.confirm) {
          // 保留登录信息，只清除其他缓存
          const token = wx.getStorageSync('token')
          const userInfo = wx.getStorageSync('userInfo')

          wx.clearStorageSync()

          if (token) wx.setStorageSync('token', token)
          if (userInfo) wx.setStorageSync('userInfo', userInfo)

          wx.showToast({
            title: '缓存已清除',
            icon: 'success'
          })
        }
      }
    })
  },

  // ========== 绑定手机号相关 ==========

  // 点击绑定手机号任务
  onBindPhone() {
    const { userInfo } = this.data
    if (userInfo && userInfo.phone) {
      wx.showToast({
        title: '手机号已绑定',
        icon: 'none'
      })
      return
    }
    this.setData({ showPhonePopup: true })
  },

  // 关闭弹窗
  onClosePhonePopup() {
    this.setData({
      showPhonePopup: false,
      bindPhone: '',
      bindCode: '',
      bindCountdown: 0,
      sendingBindCode: false,
      bindLoading: false
    })
    if (this._bindCountdownTimer) {
      clearInterval(this._bindCountdownTimer)
    }
  },

  // 阻止冒泡
  preventTap() {},

  // 手机号输入
  onBindPhoneInput(e) {
    this.setData({ bindPhone: e.detail.value })
  },

  // 验证码输入
  onBindCodeInput(e) {
    this.setData({ bindCode: e.detail.value })
  },

  // 发送验证码
  async onSendBindCode() {
    const { bindPhone, sendingBindCode, bindCountdown } = this.data

    if (sendingBindCode || bindCountdown > 0) return

    // 验证手机号
    if (!/^1[3-9]\d{9}$/.test(bindPhone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    this.setData({ sendingBindCode: true })

    try {
      await userApi.sendSms(bindPhone)
      wx.showToast({
        title: '验证码已发送',
        icon: 'success'
      })
      this.startBindCountdown()
    } catch (e) {
      wx.showToast({
        title: e.message || '发送失败',
        icon: 'none'
      })
    } finally {
      this.setData({ sendingBindCode: false })
    }
  },

  // 开始倒计时
  startBindCountdown() {
    this.setData({ bindCountdown: 60 })

    this._bindCountdownTimer = setInterval(() => {
      const { bindCountdown } = this.data
      if (bindCountdown <= 1) {
        clearInterval(this._bindCountdownTimer)
        this.setData({ bindCountdown: 0 })
      } else {
        this.setData({ bindCountdown: bindCountdown - 1 })
      }
    }, 1000)
  },

  // 确认绑定
  async onConfirmBindPhone() {
    const { bindPhone, bindCode, bindLoading, userInfo } = this.data

    if (bindLoading) return

    // 验证手机号
    if (!/^1[3-9]\d{9}$/.test(bindPhone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    // 验证验证码
    if (!bindCode || bindCode.length < 4) {
      wx.showToast({
        title: '请输入验证码',
        icon: 'none'
      })
      return
    }

    this.setData({ bindLoading: true })

    try {
      // 调用更新接口
      await userApi.updateUserInfoWithPhone({
        userId: userInfo.id,
        phone: bindPhone,
        code: bindCode
      })

      wx.showToast({
        title: '绑定成功，获得5积分',
        icon: 'success',
        duration: 2000
      })

      // 关闭弹窗
      this.onClosePhonePopup()

      // 刷新用户信息
      setTimeout(() => {
        this.updateUserState()
      }, 1500)
    } catch (e) {
      wx.showToast({
        title: e.message || '绑定失败',
        icon: 'none'
      })
    } finally {
      this.setData({ bindLoading: false })
    }
  },

  onUnload() {
    if (this._bindCountdownTimer) {
      clearInterval(this._bindCountdownTimer)
    }
  },

  // 分享给好友
  onShareAppMessage() {
    return {
      title: 'AI足球分析助手 - 智能比赛分析预测',
      path: '/pages/index/index'
    }
  }
})
