// pages/history/index.js - 历史记录页面
const historyApi = require('../../api/history')
const userStore = require('../../store/user')

Page({
  data: {
    currentTab: 'models', // history: 历史记录, models: 模型统计
    // 历史记录相关
    list: [],
    loading: false,
    refreshing: false,
    hasMore: true,
    pageNo: 1,
    pageSize: 20,
    total: 0,
    error: null,
    // 模型统计相关
    models: [],
    modelsLoading: false,
    modelsError: null,
    // 统计详情弹窗相关
    showStatsDetail: false,
    statsDetail: null,
    statsLoading: false,
    statsError: null,
    selectedModel: null
  },

  onLoad() {
    // 默认加载模型列表
    this.loadModels()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  // 切换Tab
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.currentTab) return

    this.setData({ currentTab: tab })

    // 切换到该tab时自动刷新数据
    if (tab === 'history') {
      this.refreshHistory()
    } else if (tab === 'models') {
      this.refreshModels()
    }
  },

  onPullDownRefresh() {
    if (this.data.currentTab === 'history') {
      this.refreshHistory().finally(() => {
        wx.stopPullDownRefresh()
      })
    } else if (this.data.currentTab === 'models') {
      this.refreshModels().finally(() => {
        wx.stopPullDownRefresh()
      })
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  // 加载历史记录
  async loadHistory() {
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
    // 检查登录状态
    if (!userStore.isLoggedIn()) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return
    }

    const { record } = e.detail
    const matchId = (record && record.matchId);
    wx.navigateTo({
      url: `/pages/history-detail/index?id=`+matchId
    })
  },

  // 重试
  onRetry() {
    this.loadHistory()
  },

  // 加载模型列表
  async loadModels() {
    this.setData({ modelsLoading: true, modelsError: null })

    try {
      const data = await historyApi.getModelList()
      const models = data.data || data || []
      this.setData({ models, modelsLoading: false })
    } catch (error) {
      console.error('加载模型列表失败:', error)
      this.setData({ modelsLoading: false, modelsError: error.message || '加载失败' })
    }
  },

  // 刷新模型列表
  async refreshModels() {
    return this.loadModels()
  },

  // 重试加载模型
  onRetryModels() {
    this.loadModels()
  },

  // 点击模型卡片
  onModelTap(e) {
    const model = e.currentTarget.dataset.model
    if (!model || !model.id) return

    // 只有胜负预测模型可以点击
    if (model.modelType !== 'result') {
      wx.showToast({
        title: '敬请期待',
        icon: 'none'
      })
      return
    }

    // 检查登录状态
    if (!userStore.isLoggedIn()) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return
    }

    this.setData({
      showStatsDetail: true,
      selectedModel: model,
      statsDetail: null,
      statsError: null
    })

    this.loadStatsDetail(model)
  },

  // 加载统计详情
  async loadStatsDetail(model) {
    this.setData({ statsLoading: true, statsError: null })

    try {
      // 使用 modelType 或 type 字段查询统计信息
      const modelType = model.modelType || model.type || 'result'
      const data = await historyApi.getModelStats(modelType)
      const statsDetail = data.data || data[0] || {}

      // 计算各分类的准确率
      statsDetail.homeWinRate = statsDetail.homeWinCount > 0
        ? Math.round((statsDetail.homeWinCorrect / statsDetail.homeWinCount) * 100)
        : 0
      statsDetail.drawRate = statsDetail.drawCount > 0
        ? Math.round((statsDetail.drawCorrect / statsDetail.drawCount) * 100)
        : 0
      statsDetail.awayWinRate = statsDetail.awayWinCount > 0
        ? Math.round((statsDetail.awayWinCorrect / statsDetail.awayWinCount) * 100)
        : 0

      // 格式化时间
      if (statsDetail.statsDate) {
        const date = new Date(statsDetail.statsDate)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        statsDetail.statsDateStr = `${year}-${month}-${day}`
      }

      this.setData({ statsDetail, statsLoading: false })
    } catch (error) {
      console.error('加载统计详情失败:', error)
      this.setData({ statsLoading: false, statsError: error.message || '加载失败' })
    }
  },

  // 重试加载统计详情
  onRetryStats() {
    if (this.data.selectedModel) {
      this.loadStatsDetail(this.data.selectedModel)
    }
  },

  // 关闭统计详情弹窗
  onCloseStatsDetail() {
    this.setData({
      showStatsDetail: false,
      statsDetail: null,
      selectedModel: null
    })
  }
})
