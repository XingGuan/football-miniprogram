// pages/vip/index.js
const userStore = require('../../store/user')
const userApi = require('../../api/user')

Page({
  data: {
    packages: [
      {
        id: 1,
        name: '月卡',
        duration: 1,
        durationUnit: '个月',
        icon: '💳',
        price: 39,
        originalPrice: 69
      },
      {
        id: 2,
        name: '年卡',
        duration: 12,
        durationUnit: '个月',
        icon: '👑',
        price: 299,
        originalPrice: 599,
        popular: true
      }
    ],
    selectedPackage: null,
    userInfo: null,
    isLoggedIn: false,
    faqOpen: [false, false, false],
    vipExpireTimeStr: '',
    showVipPurchase: true // 是否显示购买相关内容
  },

  onLoad() {
    this.loadUserInfo()
    this.checkFeatures()
    // 默认选中年卡（推荐套餐）
    this.setData({
      selectedPackage: this.data.packages.find(p => p.popular) || this.data.packages[0]
    })
  },

  onShow() {
    this.loadUserInfo()
    this.checkFeatures()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  // 检查功能开关
  async checkFeatures() {
    try {
      const matchApi = require('../../api/match')
      const result = await matchApi.checkFeatures()
      this.setData({
        showVipPurchase: result === true
      })
    } catch (error) {
      console.error('检查功能开关失败:', error)
      this.setData({ showVipPurchase: false })
    }
  },

  // 加载用户信息
  async loadUserInfo() {
    const isLoggedIn = userStore.isLoggedIn()
    let userInfo = userStore.getUserInfo()

    // 如果已登录，刷新用户信息
    if (isLoggedIn && userInfo && userInfo.id) {
      try {
        const latestUserInfo = await userApi.getUserInfoById(userInfo.id)
        if (latestUserInfo) {
          wx.setStorageSync('userInfo', latestUserInfo)
          userInfo = latestUserInfo
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
      }
    }

    // 格式化VIP到期时间
    let vipExpireTimeStr = ''
    if (userInfo && userInfo.isVip && userInfo.vipExpireTime) {
      vipExpireTimeStr = this.formatExpireTime(userInfo.vipExpireTime)
    }

    this.setData({
      isLoggedIn,
      userInfo,
      vipExpireTimeStr
    })
  },

  // 滚动到套餐选择区域
  scrollToPackages() {
    wx.pageScrollTo({
      selector: '.packages-section',
      duration: 300
    })
  },

  // 选择套餐
  onSelectPackage(e) {
    const { id, action } = e.currentTarget.dataset

    // 如果是续费，需要先检查是否登录
    if (action === 'renew' && !this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    if (id) {
      const selectedPackage = this.data.packages.find(p => p.id === id)
      this.setData({ selectedPackage })
    }
  },

  // 格式化到期时间
  formatExpireTime(timeStr) {
    if (!timeStr) return '未知'
    const date = new Date(timeStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 切换FAQ
  toggleFaq(e) {
    const { index } = e.currentTarget.dataset
    const faqOpen = [...this.data.faqOpen]
    faqOpen[index] = !faqOpen[index]
    this.setData({ faqOpen })
  },

  // 分享页面
  onShareAppMessage() {
    return {
      title: 'AI足球智能体 - 开通会员享无限分析',
      path: '/pages/vip/index',
      imageUrl: '' // 可以设置分享图片
    }
  }
})
