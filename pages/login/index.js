// pages/login/index.js - 登录页
const userStore = require('../../store/user')

Page({
  data: {
    phone: '',
    code: '',
    agreed: false,
    countdown: 0,
    loading: false,
    sendingCode: false
  },

  onLoad() {
    // 检查是否已登录
    if (userStore.isLoggedIn()) {
      this.navigateBack()
    }
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  // 验证码输入
  onCodeInput(e) {
    this.setData({ code: e.detail.value })
  },

  // 协议勾选
  onAgreeChange(e) {
    this.setData({ agreed: e.detail.value.length > 0 })
  },

  // 发送验证码
  async onSendCode() {
    const { phone, sendingCode, countdown } = this.data

    if (sendingCode || countdown > 0) return

    // 验证手机号
    if (!this.validatePhone(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    this.setData({ sendingCode: true })

    try {
      const result = await userStore.sendSms(phone)

      if (result.success) {
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        })
        this.startCountdown()
      } else {
        wx.showToast({
          title: result.message || '发送失败',
          icon: 'none'
        })
      }
    } catch (e) {
      wx.showToast({
        title: '发送失败',
        icon: 'none'
      })
    } finally {
      this.setData({ sendingCode: false })
    }
  },

  // 开始倒计时
  startCountdown() {
    this.setData({ countdown: 60 })

    this._countdownTimer = setInterval(() => {
      const { countdown } = this.data
      if (countdown <= 1) {
        clearInterval(this._countdownTimer)
        this.setData({ countdown: 0 })
      } else {
        this.setData({ countdown: countdown - 1 })
      }
    }, 1000)
  },

  // 登录
  async onLogin() {
    const { phone, code, agreed, loading } = this.data

    if (loading) return

    // 验证表单
    if (!this.validatePhone(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    if (!code || code.length < 4) {
      wx.showToast({
        title: '请输入验证码',
        icon: 'none'
      })
      return
    }

    if (!agreed) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    try {
      const result = await userStore.login(phone, code)

      if (result.success) {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })

        setTimeout(() => {
          this.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: result.message || '登录失败',
          icon: 'none'
        })
      }
    } catch (e) {
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 验证手机号
  validatePhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone)
  },

  // 返回上一页或首页
  navigateBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  // 查看用户协议
  onViewAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/index?type=user'
    })
  },

  // 查看隐私政策
  onViewPrivacy() {
    wx.navigateTo({
      url: '/pages/agreement/index?type=privacy'
    })
  },

  onUnload() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer)
    }
  }
})
