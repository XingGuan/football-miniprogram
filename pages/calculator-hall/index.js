// pages/calculator-hall/index.js - 推荐方案大厅
const matchApi = require('../../api/match')

Page({
  data: {
    recommendations: [],
    loading: true,
    error: null,
    // 左滑删除相关
    touchStartX: 0,
    touchStartY: 0,
    currentSwipeIndex: -1
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
      const recommendations = rawRecords.map(item => ({
        ...item,
        matchCount: item.matchDetails ? item.matchDetails.length : 0,
        passTypesStr: this.formatPassTypes(item.passTypes),
        createTimeStr: this.formatTime(item.createTime)
      }))
      this.setData({ recommendations, loading: false, error: null })
    } catch (error) {
      console.error('加载推荐列表失败:', error)
      this.setData({ loading: false, error: '加载失败，请重试' })
    }
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
    // 如果正在滑动状态，不跳转
    if (record && record.swiped) {
      this.resetAllSwipe()
      return
    }
    if (!record || !record.id) return
    wx.navigateTo({
      url: `/pages/calculator-detail/index?id=${record.id}`
    })
  },

  // 触摸开始
  onTouchStart(e) {
    this.touchStartX = e.touches[0].clientX
    this.touchStartY = e.touches[0].clientY
    this.touchStartTime = Date.now()
  },

  // 触摸移动
  onTouchMove(e) {
    const touchX = e.touches[0].clientX
    const touchY = e.touches[0].clientY
    const deltaX = touchX - this.touchStartX
    const deltaY = touchY - this.touchStartY

    // 判断是否为水平滑动
    if (Math.abs(deltaX) < Math.abs(deltaY)) return

    const index = e.currentTarget.dataset.index
    const recommendations = this.data.recommendations

    // 重置其他卡片
    if (this.data.currentSwipeIndex !== -1 && this.data.currentSwipeIndex !== index) {
      recommendations[this.data.currentSwipeIndex].swiped = false
    }

    // 左滑显示删除按钮
    if (deltaX < -20) {
      recommendations[index].swiped = true
      this.setData({ recommendations, currentSwipeIndex: index })
    } else if (deltaX > 20) {
      // 右滑隐藏删除按钮
      recommendations[index].swiped = false
      this.setData({ recommendations, currentSwipeIndex: -1 })
    }
  },

  // 触摸结束
  onTouchEnd(e) {
    // 处理逻辑在 onTouchMove 中完成
  },

  // 重置所有滑动状态
  resetAllSwipe() {
    const recommendations = this.data.recommendations
    if (this.data.currentSwipeIndex !== -1) {
      recommendations[this.data.currentSwipeIndex].swiped = false
      this.setData({ recommendations, currentSwipeIndex: -1 })
    }
  },

  // 重试加载
  onRetry() {
    this.loadRecommendations()
  }
})
