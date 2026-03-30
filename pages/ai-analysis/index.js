// pages/ai-analysis/index.js - AI 分析结果页面
const { post } = require('../../api/index')
const userStore = require('../../store/user')
const userApi = require('../../api/user')
const analysisApi = require('../../api/analysis')

Page({
  data: {
    matchId: null,
    matchInfo: null,
    loading: true,
    error: null,
    analysisResult: '',
    parsedContent: [],
    pointsPerAnalysis: 1, // 每次分析消耗积分
    isAdmin: false // 是否是管理员
  },

  onLoad(options) {
    const { matchId, matchInfo } = options

    if (!matchId) {
      this.setData({ loading: false, error: '缺少比赛ID' })
      return
    }

    this.setData({ matchId })

    if (matchInfo) {
      try {
        const info = JSON.parse(decodeURIComponent(matchInfo))
        this.setData({ matchInfo: info })
        wx.setNavigationBarTitle({
          title: `${info.homeTeam} vs ${info.awayTeam}`
        })
      } catch (e) {
        console.error('解析比赛信息失败:', e)
      }
    }

    // 检查登录状态
    if (!userStore.isLoggedIn()) {
      this.setData({ loading: false })
      wx.showModal({
        title: '请先登录',
        content: '使用AI分析功能需要先登录',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.redirectTo({ url: '/pages/login/index' })
          } else {
            wx.navigateBack()
          }
        }
      })
      return
    }

    // 检查管理员状态
    this.checkAdminStatus()

    // 直接加载分析（在match-card组件中已经检查和扣减积分）
    this.loadAnalysis(matchId)
  },

  // 检查管理员状态
  checkAdminStatus() {
    const userInfo = userStore.getUserInfo()
    if (userInfo && userInfo.isAdmin) {
      this.setData({ isAdmin: true })
    }
  },

  async loadAnalysis(matchId) {
  
    this.setData({ loading: true, error: null })
   
    try {
      const result = await post(`/api/match/analysis/${matchId}`, {}, { showLoading: false })

      // 解析返回数据
      const analysisText = result.aiAnalysis || result.content || result.analysis || ''

      if (!analysisText) {
        this.setData({ loading: false, error: '暂无分析结果' })
        return
      }

      // 解析 markdown 为结构化内容
      const parsedContent = this.parseMarkdown(analysisText)

      this.setData({
        loading: false,
        analysisResult: analysisText,
        parsedContent
      })
    } catch (e) {
      console.error('加载分析失败:', e)
      this.setData({
        loading: false,
        error: e.message || '加载分析失败'
      })
    }
  },

  // 简单解析 markdown
  parseMarkdown(text) {
    const lines = text.split('\n')
    const result = []

    lines.forEach(line => {
      const trimmed = line.trim()
      if (!trimmed) {
        result.push({ type: 'space' })
        return
      }

      // 标题
      if (trimmed.startsWith('### ')) {
        result.push({ type: 'h3', text: this.parseInline(trimmed.slice(4)) })
      } else if (trimmed.startsWith('## ')) {
        result.push({ type: 'h2', text: this.parseInline(trimmed.slice(3)) })
      } else if (trimmed.startsWith('# ')) {
        result.push({ type: 'h1', text: this.parseInline(trimmed.slice(2)) })
      }
      // 列表（支持多级缩进）
      else if (/^[\-\*]\s+/.test(trimmed)) {
        result.push({ type: 'list', text: this.parseInline(trimmed.replace(/^[\-\*]\s+/, '')) })
      }
      // 数字列表
      else if (/^\d+\.\s+/.test(trimmed)) {
        const listText = trimmed.replace(/^\d+\.\s+/, '')
        result.push({ type: 'list', text: this.parseInline(listText) })
      }
      // 分隔线
      else if (trimmed === '---' || trimmed === '***') {
        result.push({ type: 'hr' })
      }
      // 普通段落
      else {
        result.push({ type: 'p', text: this.parseInline(trimmed) })
      }
    })

    return result
  },

  // 解析行内样式
  parseInline(text) {
    // 处理加粗 **text**
    text = text.replace(/\*\*([^*]+)\*\*/g, '【$1】')
    // 处理代码 `text`
    text = text.replace(/`([^`]+)`/g, '「$1」')
    // 处理 {1:3} 比分格式
    text = text.replace(/\{(\d+:\d+)\}/g, '[$1]')
    return text
  },

  onRetry() {
    const { matchId } = this.data
    if (matchId) {
      this.loadAnalysis(matchId)
    }
  },

  onCopy() {
    const { analysisResult } = this.data
    wx.setClipboardData({
      data: analysisResult,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  onDelete() {
    const { matchId, matchInfo } = this.data

    wx.showModal({
      title: '确认删除',
      content: matchInfo
        ? `确定要删除 ${matchInfo.homeTeam} vs ${matchInfo.awayTeam} 的分析结果吗？`
        : '确定要删除此分析结果吗？',
      confirmText: '删除',
      confirmColor: '#ff4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            await analysisApi.deleteAnalysis(matchId)
            wx.hideLoading()

            wx.showToast({
              title: '删除成功',
              icon: 'success',
              duration: 2000
            })

            // 延迟返回上一页
            setTimeout(() => {
              wx.navigateBack()
            }, 1000)
          } catch (error) {
            wx.hideLoading()
            console.error('删除失败:', error)
            wx.showToast({
              title: error.message || '删除失败',
              icon: 'none',
              duration: 2000
            })
          }
        }
      }
    })
  },

  onShareAppMessage() {
    const { matchInfo, matchId } = this.data
    return {
      title: matchInfo ? `${matchInfo.homeTeam} vs ${matchInfo.awayTeam} AI分析` : 'AI比赛分析',
      path: `/pages/ai-analysis/index?matchId=${matchId}`
    }
  }
})
