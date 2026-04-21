// pages/dragon-analysis/index.js - 单关斩龙计划
const matchApi = require('../../api/match')
const userStore = require('../../store/user')

Page({
  data: {
    // 样本大小选项
    sampleSizes: [20, 30, 50],
    selectedSize: 20,
    // 加载和错误状态
    loading: false,
    error: null,
    // 分析结果
    analysisData: null,
    // 分享和复制
    showCopyTip: false,
    copyContent: ''
  },

  onLoad() {
    this.loadAnalysis(10)
  },

  // 切换样本大小
  onSampleSizeChange(e) {
    const size = e.currentTarget.dataset.size
    if (size === this.data.selectedSize) return
    this.setData({ selectedSize: size })
    this.loadAnalysis(size)
  },

  // 加载分析数据
  async loadAnalysis(sampleSize) {
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

    this.setData({ loading: true, error: null })

    try {
      const data = await matchApi.getDragonAnalysis(sampleSize)
      const analysisData = data.data || data || {}

      // 对关联比赛按照最新优先排序
      if (analysisData.matchDetails && Array.isArray(analysisData.matchDetails)) {
        analysisData.matchDetails.sort((a, b) => {
          // 按照 gapFromNow 从小到大排序（最小值在前，即最新的比赛）
          return (a.gapFromNow || 0) - (b.gapFromNow || 0)
        })
      }

      this.setData({ analysisData, loading: false })
    } catch (error) {
      console.error('加载分析数据失败:', error)
      this.setData({ loading: false, error: error.message || '加载失败' })
    }
  },

  // 生成可复制的文本
  generateCopyText() {
    const data = this.data.analysisData
    if (!data) return ''

    let currentDragonsText = `【当前龙位】\n` +
      `主胜: 已${data.gapsSinceLastHomeWin}场未出`
   
    currentDragonsText += `\n平局: 已${data.gapsSinceLastDraw}场未出`
    
    currentDragonsText += `\n客胜: 已${data.gapsSinceLastAwayWin}场未出`
    

    const text = `【单关斩龙计划】${this.data.selectedSize}期分析\n\n` +
      `总场次: ${data.totalMatches}\n\n` +
      currentDragonsText + `\n\n` +
      `【赔率龙位】\n` +
      `最高赔率龙: 已${data.gapsSinceLastMaxOdds}场未出 (${data.maxOddsWinRate}%)\n` +
      `最低赔率龙: 已${data.gapsSinceLastMinOdds}场未出 (${data.minOddsWinRate}%)\n\n` +
      `【历史龙纪录】\n` +
      `主胜最长: ${data.maxHomeWinDragon}场\n` +
      `平局最长: ${data.maxDrawDragon}场\n` +
      `客胜最长: ${data.maxAwayWinDragon}场\n\n` +
      `【出现率】\n` +
      `主胜: ${Math.round(data.homeWinRate * 100) / 100}%\n` +
      `平局: ${Math.round(data.drawRate * 100) / 100}%\n` +
      `客胜: ${Math.round(data.awayWinRate * 100) / 100}%`

    return text
  },

  // 复制内容
  onCopy() {
    const copyContent = this.generateCopyText()
    wx.setClipboardData({
      data: copyContent,
      success: () => {
        this.setData({ showCopyTip: true })
        setTimeout(() => {
          this.setData({ showCopyTip: false })
        }, 2000)
      }
    })
  },

  // 分享给好友
  onShareAppMessage() {
    const data = this.data.analysisData
    let title = '🐉 单关斩龙计划分析报告'
    if (data) {
      const homeGap = data.gapsSinceLastHomeWin
      const drawGap = data.gapsSinceLastDraw
      const awayGap = data.gapsSinceLastAwayWin
      title = `🐉 龙位分析 | 主${homeGap}场 平${drawGap}场 客${awayGap}场未出`
    }

    return {
      title: title,
      path: '/pages/dragon-analysis/index',
      imageUrl: ''
    }
  },

  // 重试
  onRetry() {
    this.loadAnalysis(this.data.selectedSize)
  },

  // 分享给好友
  onShareAppMessage() {
    const text = this.generateCopyText()
    return {
      title: '🐉 单关斩龙计划分析报告',
      path: '/pages/dragon-analysis/index',
      imageUrl: '/images/share/dragon.png'
    }
  }
})
