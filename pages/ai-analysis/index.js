// pages/ai-analysis/index.js - AI 分析结果页面
const { post } = require('../../api/index')
const userStore = require('../../store/user')

Page({
  data: {
    matchId: null,
    matchInfo: null,
    loading: true,
    error: null,
    analysisResult: '',
    parsedContent: []
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

    this.loadAnalysis(matchId)
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

  onShareAppMessage() {
    const { matchInfo, matchId } = this.data
    return {
      title: matchInfo ? `${matchInfo.homeTeam} vs ${matchInfo.awayTeam} AI分析` : 'AI比赛分析',
      path: `/pages/ai-analysis/index?matchId=${matchId}`
    }
  }
})
