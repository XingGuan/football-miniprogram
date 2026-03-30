// pages/history/index.js - 历史记录页面
const historyApi = require('../../api/history')
const userStore = require('../../store/user')

Page({
  data: {
    list: [],
    loading: false,
    refreshing: false,
    hasMore: true,
    pageNo: 1,
    pageSize: 20,
    total: 0,
    error: null
  },

  onLoad() {
    this.loadHistory()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  onPullDownRefresh() {
    this.refreshHistory().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  // 加载历史记录
  async loadHistory() {
    // 检查登录状态
    if (!userStore.isLoggedIn()) {
      this.setData({
        list: [],
        error: '请先登录'
      })
      return
    }

    this.setData({ loading: true, error: null })

    try {
      const { pageNo, pageSize } = this.data
      const result = await historyApi.getHistoryList({ pageNo, pageSize })

      const { list = [], total = 0 } = result || {}

      this.setData({
        list,
        total,
        hasMore: list.length >= pageSize,
        loading: false
      })
    } catch (e) {
      console.error('加载历史记录失败:', e)
      this.setData({
        loading: false,
        error: e.message || '加载失败'
      })
    }
  },

  // 刷新
  async refreshHistory() {
    this.setData({
      pageNo: 1,
      refreshing: true
    })

    await this.loadHistory()

    this.setData({ refreshing: false })
  },

  // 加载更多
  async loadMore() {
    if (!this.data.hasMore || this.data.loading) return

    const { pageNo, pageSize, list } = this.data

    this.setData({ loading: true })

    try {
      const result = await historyApi.getHistoryList({
        pageNo: pageNo + 1,
        pageSize
      })

      const { list: newList = [] } = result || {}

      this.setData({
        list: [...list, ...newList],
        pageNo: pageNo + 1,
        hasMore: newList.length >= pageSize,
        loading: false
      })
    } catch (e) {
      console.error('加载更多失败:', e)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 点击历史记录
  onItemTap(e) {
    const { record } = e.detail
    const matchId = (record && record.matchId);
    wx.navigateTo({
      url: `/pages/history-detail/index?id=`+matchId
    })
  },

  // 跳转登录
  onLogin() {
    wx.navigateTo({
      url: '/pages/login/index'
    })
  },

  // 重试
  onRetry() {
    this.loadHistory()
  }
})
