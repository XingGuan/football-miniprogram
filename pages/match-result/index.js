// pages/match-result/index.js - 赛果列表
const matchApi = require('../../api/match')

Page({
  data: {
    results: [],
    loading: true,
    error: null
  },

  onLoad() {
    this.loadResults()
  },

  onShow() {
    // 每次显示时刷新列表
    this.loadResults()
  },

  // 加载赛果列表
  async loadResults() {
    this.setData({ loading: true })
    try {
      const res = await matchApi.getMatchResults()
      const results = res.data || res || []

      // 处理数据，添加展示需要的字段
      const processedResults = results.map(item => ({
        ...item,
        // 格式化状态类名
        statusClass: this.getStatusClass(item.matchStatus),
        // 完整比分显示
        fullScore: this.formatScore(item.sectionsNo999),
        halfScore: this.formatScore(item.sectionsNo1),
        extraScore: item.sectionsExtra ? this.formatScore(item.sectionsExtra) : '',
        penaltyScore: item.sectionsPenalty ? this.formatScore(item.sectionsPenalty) : ''
      }))

      this.setData({ results: processedResults, loading: false, error: null })
    } catch (error) {
      console.error('加载赛果失败:', error)
      this.setData({ loading: false, error: '加载失败，请重试' })
    }
  },

  // 获取状态样式类
  getStatusClass(status) {
    const statusMap = {
      '0': 'upcoming',   // 未开始
      '1': 'ongoing',    // 进行中
      '2': 'finished'    // 已结束
    }
    return statusMap[status] || 'unknown'
  },

  // 格式化比分
  formatScore(score) {
    if (!score) return '-'
    return score
  },

  // 获取胜平负结果显示
  getHadResultDisplay(hadResult) {
    const map = {
      'H': '主胜',
      'D': '平局',
      'A': '客胜'
    }
    return map[hadResult] || '-'
  },

  // 重试加载
  onRetry() {
    this.loadResults()
  }
})
