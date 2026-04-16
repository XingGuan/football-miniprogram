// pages/credits/index.js
const userStore = require('../../store/user')

Page({
  data: {
    packages: [
      {
        id: 1,
        points: 100,
        price: 30,
        firstPrice: 15,
        icon: '💰',
        selected: false
      },
      {
        id: 2,
        points: 500,
        price: 150,
        firstPrice: 75,
        icon: '💎',
        selected: false,
        popular: true
      }
    ],
    selectedPackage: null,
    userInfo: null,
    qrCode: 'https://ai-football.cn/me.png',
    showContactModal: false,
    loading: false,
    isFirstPurchase: true  // 是否首次购买
  },

  onLoad() {
    this.loadUserInfo()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = userStore.getUserInfo()
    if (userInfo) {
      this.setData({ userInfo })
    }
  },

  // 选择套餐
  onSelectPackage(e) {
    const { id } = e.currentTarget.dataset
    const selectedPackage = this.data.packages.find(p => p.id === id)
    this.setData({ selectedPackage })
  },

  // 复制微信号
  onCopyWechat() {
    const wechatId = 'your_wechat_id' // 需要替换为实际的微信号
    wx.setClipboardData({
      data: wechatId,
      success: () => {
        wx.showToast({
          title: '微信号已复制',
          icon: 'success',
          duration: 1500
        })
      }
    })
  },

  // 打开联系方式弹窗
  onOpenContact() {
    if (!this.data.selectedPackage) {
      wx.showToast({
        title: '请先选择套餐',
        icon: 'none'
      })
      return
    }
    this.setData({ showContactModal: true })
  },

  // 关闭联系方式弹窗
  onCloseContactModal() {
    this.setData({ showContactModal: false })
  },

  // 打开微信客服
  onContactService() {
    // 打开联系客服
    const button = this.selectComponent('.contact-button')
    if (button) {
      button.openContact({
        converseId: '',
        showMessageCard: true
      })
    }
  },

  // 阻止冒泡
  preventTap() {},

  // 分享页面
  onShareAppMessage() {
    return {
      title: 'AI足球分析助手 - 积分充值',
      path: '/pages/credits/index'
    }
  }
})
