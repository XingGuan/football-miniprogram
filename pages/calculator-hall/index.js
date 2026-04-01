// pages/calculator-hall/index.js - 推荐方案大厅
const matchApi = require('../../api/match')

Page({
  data: {
    recommendations: [],
    rankList: [], // 胜率排行榜前三
    loading: true,
    error: null
  },

  onLoad() {
    this.loadRecommendations()
  },

  onShow() {
    // 每次显示时刷新列表
    this.loadRecommendations()
  },

  // 加载推荐方案列表
  async loadRecommendations() {
    this.setData({ loading: true })
    try {
      const res = await matchApi.getCalculatorRecommendList()
      const rawRecords = res.data || res || []

      // 按用户ID分组，统计用户战绩
      const userStats = {}
      rawRecords.forEach(item => {
        const userId = item.userId
        if (!userStats[userId]) {
          userStats[userId] = {
            userName: item.userName || `用户${userId}`,
            avatar: item.avatar || '',
            totalRecords: 0,
            winRecords: 0,
            loseRecords: 0,
            pendingRecords: 0
          }
        }
      
        if (item.status === 1) {
          userStats[userId].winRecords++
          userStats[userId].totalRecords++
        } else if (item.status === 2) {
          userStats[userId].loseRecords++
          userStats[userId].totalRecords++
        } else {
          userStats[userId].pendingRecords++
        }
      })

      const recommendations = rawRecords.map(item => ({
        ...item,
        matchCount: item.matchDetails ? item.matchDetails.length : 0,
        passTypesStr: this.formatPassTypes(item.passTypes),
        createTimeStr: this.formatTime(item.createTime),
        // 添加用户统计信息
        userStats: userStats[item.userId],
        winRate: this.calculateWinRate(userStats[item.userId])
      }))

      // 计算胜率排行榜前三
      const rankList = Object.values(userStats)
        .filter(u => u.totalRecords >= 1) // 至少有1条已开奖记录
        .map(u => ({
          ...u,
          winRate: u.totalRecords > 0 ? Math.round((u.winRecords / u.totalRecords) * 100) : 0
        }))
        .sort((a, b) => {
          // 先按胜率排序，胜率相同按中奖数排序
          if (b.winRate !== a.winRate) return b.winRate - a.winRate
          return b.winRecords - a.winRecords
        })
        .slice(0, 3)

      this.setData({ recommendations, rankList, loading: false, error: null })
    } catch (error) {
      console.error('加载推荐列表失败:', error)
      this.setData({ loading: false, error: '加载失败，请重试' })
    }
  },

  // 计算胜率
  calculateWinRate(userStat) {
    if (!userStat || userStat.totalRecords === 0) return 0
    return ((userStat.winRecords / userStat.totalRecords) * 100).toFixed(0)
  },

  // 格式化时间
  formatTime(timeStr) {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hour}:${minute}`
  },

  // 格式化过关方式
  formatPassTypes(passTypes) {
    if (!passTypes || !Array.isArray(passTypes)) return ''
    const map = {
      'single': '单关',
      '2_1': '2串1',
      '3_1': '3串1',
      '4_1': '4串1',
      '5_1': '5串1',
      '6_1': '6串1'
    }
    return passTypes.map(p => map[p] || p).join('/')
  },

  // 点击记录进入详情
  onRecordTap(e) {
    const record = e.currentTarget.dataset.record
    if (!record || !record.id) return
    wx.navigateTo({
      url: `/pages/calculator-detail/index?id=${record.id}&from=hall`
    })
  },

  // 重试加载
  onRetry() {
    this.loadRecommendations()
  },

  // 分享给好友
  onShareAppMessage() {
    return {
      title: '推荐大厅 - 查看高手的中奖方案',
      path: '/pages/calculator-hall/index'
    }
  }
})
