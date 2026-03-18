// pages/agreement/index.js - 用户协议页面
Page({
  data: {
    type: 'user', // user | privacy
    title: '用户协议'
  },

  onLoad(options) {
    const { type = 'user' } = options
    const title = type === 'privacy' ? '隐私政策' : '用户协议'

    this.setData({ type, title })
    wx.setNavigationBarTitle({ title })
  }
})
