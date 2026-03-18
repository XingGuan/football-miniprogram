// pages/history-detail/index.js - 历史详情页面
const historyApi = require('../../api/history')
const dateUtils = require('../../utils/date')

Page({
  data: {
    id: null,
    record: null,
    loading: true,
    error: null,
    matchTimeStr: '',
    createTimeStr: '',
    activeTab: 'analysis' // analysis | afterMatch
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      this.setData({ id })
      this.loadDetail(id)
    } else {
      this.setData({
        loading: false,
        error: '缺少记录 ID'
      })
    }
  },

  // 加载详情
  async loadDetail(id) {
    this.setData({ loading: true, error: null })

    try {
      const record = await historyApi.getHistoryDetail(id)

      this.setData({
        record,
        loading: false,
        matchTimeStr: record.matchTime ? dateUtils.formatDateTime(record.matchTime) : '',
        createTimeStr: record.createTime ? dateUtils.formatDateTime(record.createTime) : ''
      })

      // 设置标题
      if (record.homeTeam && record.awayTeam) {
        wx.setNavigationBarTitle({
          title: `${record.homeTeam} VS ${record.awayTeam}`
        })
      }
    } catch (e) {
      console.error('加载详情失败:', e)
      this.setData({
        loading: false,
        error: e.message || '加载失败'
      })
    }
  },

  // 切换 Tab
  onTabChange(e) {
    const { tab } = e.currentTarget.dataset
    this.setData({ activeTab: tab })
  },

  // 复制内容
  onCopy() {
    const { record, activeTab } = this.data
    if (!record) return

    const content = activeTab === 'analysis' ? record.aiAnalysis : record.afterMatchAnalysis

    if (!content) {
      wx.showToast({ title: '暂无内容', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  // 分享
  onShare() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 删除记录
  onDelete() {
    const { id } = this.data

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })

          try {
            await historyApi.deleteHistory(id)

            wx.hideLoading()
            wx.showToast({ title: '已删除', icon: 'success' })

            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          } catch (e) {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 重试
  onRetry() {
    const { id } = this.data
    if (id) {
      this.loadDetail(id)
    }
  },

  // 分享配置
  onShareAppMessage() {
    const { record } = this.data
    const title = record ? `${record.homeTeam} VS ${record.awayTeam} 分析` : '足球分析记录'
    return {
      title,
      path: `/pages/history-detail/index?id=${this.data.id}`
    }
  }
})
