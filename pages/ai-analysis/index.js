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
    pointsPerAnalysis: 1, // 每次分析消耗积分
    isAdmin: false, // 是否是管理员
    isVip: false, // 是否是VIP
    generateTime: '', // 生成时间
    streaming: false // 是否正在流式获取
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

  // 检查管理员状态和VIP状态
  checkAdminStatus() {
    const userInfo = userStore.getUserInfo()
    if (userInfo) {
      this.setData({
        isAdmin: userInfo.isAdmin === true,
        isVip: userInfo.isVip === true
      })
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

      // 格式化生成时间
      let generateTime = ''
      if (result.timestamp) {
        generateTime = this.formatTimestamp(result.timestamp)
      }

      this.setData({
        loading: false,
        analysisResult: analysisText,
        generateTime
      })
    } catch (e) {
      console.error('加载分析失败:', e)
      this.setData({
        loading: false,
        error: e.message || '加载分析失败'
      })
    }
  },

  // 格式化时间戳
  formatTimestamp(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
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

  // 获取最新分析（流式接口）
  onGetLatestAnalysis() {
    const { isVip, matchId, streaming } = this.data

    // 非VIP不可用
    if (!isVip) {
      wx.showModal({
        title: '会员专属',
        content: '获取最新AI分析是VIP会员专属功能，开通会员即可使用',
        confirmText: '开通会员',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/vip/index' })
          }
        }
      })
      return
    }

    // 防止重复点击
    if (streaming) return

    this.setData({
      streaming: true,
      analysisResult: '',
      generateTime: '',
      error: null
    })

    // 调用流式接口
    this.requestStreamAnalysis(matchId)
  },

  // 请求流式分析
  requestStreamAnalysis(matchId) {
    const that = this
    let fullText = ''
    const baseUrl = getApp().globalData.baseUrl || ''

    const requestTask = wx.request({
      url: `${baseUrl}/api/match/stream/analysis/${matchId}`,
      method: 'POST',
      enableChunked: true,
      header: {
        'content-type': 'application/json',
        'Authorization': wx.getStorageSync('token') || ''
      },
      success: (res) => {
        console.log('流式请求完成', res)
        // 请求完成时确保结束streaming状态
        if (that.data.streaming) {
          that.onStreamComplete(fullText)
        }
      },
      fail: (err) => {
        console.error('流式请求失败:', err)
        that.setData({
          streaming: false,
          error: '获取分析失败，请重试'
        })
        wx.showToast({
          title: '获取失败',
          icon: 'error'
        })
      },
      complete: () => {
        // 确保streaming状态被重置
        if (that.data.streaming) {
          that.onStreamComplete(fullText)
        }
      }
    })

    // 监听分块数据
    requestTask.onChunkReceived((res) => {
      try {
        // 将 ArrayBuffer 转为字符串
        const text = that.arrayBufferToString(res.data)

        // 检查是否是结束标记
        if (text.includes('[DONE]')) {
          that.onStreamComplete(fullText)
          return
        }

        // 解析 SSE 格式，直接拼接内容
        const lines = text.split('\n')
        lines.forEach(line => {
          if (!line) return
          if (line.startsWith('event:') || line.startsWith('id:')) return
          if (line.trim() === '[DONE]') return

          let content = line
          if (line.startsWith('data:')) {
            content = line.substring(5)
          }

          // 直接拼接，不处理换行
          fullText += content
        })

        // 格式化文本后再显示
        const formattedText = that.formatStreamText(fullText)
        that.setData({
          analysisResult: formattedText
        })
      } catch (e) {
        console.error('解析分块数据失败:', e)
      }
    })
  },

  // 格式化流式文本，智能添加换行
  formatStreamText(text) {
    if (!text) return ''

    let result = text

    // 在标题前添加换行 (#### ### ## #)
    result = result.split('####').join('\n####')
    result = result.split('###').join('\n###')
    // 避免重复处理，只处理独立的 ##
    result = result.replace(/([^#])(##)([^#])/g, '$1\n$2$3')

    // 在列表项前添加换行
    result = result.split('- **').join('\n- **')

    // 在分隔线前后添加换行
    result = result.split('---').join('\n---\n')

    // 清理开头的换行
    result = result.replace(/^\n+/, '')
    // 清理多余的连续换行
    result = result.replace(/\n{3,}/g, '\n\n')

    return result
  },

  // ArrayBuffer 转字符串
  arrayBufferToString(buffer) {
    const uint8Array = new Uint8Array(buffer)
    let str = ''
    for (let i = 0; i < uint8Array.length; i++) {
      str += String.fromCharCode(uint8Array[i])
    }
    try {
      return decodeURIComponent(escape(str))
    } catch (e) {
      return str
    }
  },

  // 流式传输完成
  onStreamComplete(fullText) {
    // 防止重复调用
    if (!this.data.streaming) return

    const now = new Date()
    const generateTime = this.formatTimestamp(now.getTime())

    // 使用格式化后的文本
    const formattedText = this.formatStreamText(fullText)

    this.setData({
      streaming: false,
      analysisResult: formattedText,
      generateTime: generateTime
    })

    if (fullText) {
      wx.showToast({
        title: '分析完成',
        icon: 'success'
      })
    }
  },

  onShareAppMessage() {
    const { matchInfo, matchId } = this.data
    return {
      title: matchInfo ? `${matchInfo.homeTeam} vs ${matchInfo.awayTeam} AI分析` : 'AI比赛分析',
      path: `/pages/ai-analysis/index?matchId=${matchId}`
    }
  }
})
