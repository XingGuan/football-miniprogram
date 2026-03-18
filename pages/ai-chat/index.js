// pages/ai-chat/index.js - AI 对话页面（核心功能）
const streamApi = require('../../api/stream')
const userStore = require('../../store/user')

Page({
  data: {
    messages: [],
    inputText: '',
    sending: false,
    typing: false,
    matchInfo: null,
    showQuickQuestions: true,
    scrollToView: '',
    keyboardHeight: 0,
    deepThinking: false
  },

  // 流式请求控制器
  _streamController: null,

  onLoad(options) {
    // 获取比赛信息
    if (options.matchInfo) {
      try {
        const matchInfo = JSON.parse(decodeURIComponent(options.matchInfo))
        this.setData({ matchInfo })
      } catch (e) {
        console.error('解析比赛信息失败:', e)
      }
    }

    // 加载历史消息
    this.loadMessages()

    // 监听键盘高度变化
    wx.onKeyboardHeightChange((res) => {
      this.setData({ keyboardHeight: res.height })
      this.scrollToBottom()
    })
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }

    // 检查是否有从比赛页面传来的数据
    const app = getApp()
    if (app.globalData.pendingMatch) {
      const match = app.globalData.pendingMatch
      this.setData({
        matchInfo: {
          league: match.league,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam
        },
        inputText: `请帮我分析 ${match.league} ${match.homeTeam} vs ${match.awayTeam} 这场比赛`
      })
      // 清除数据，避免重复使用
      app.globalData.pendingMatch = null
    }
  },

  onUnload() {
    // 停止流式请求
    this.abortStream()
    // 保存消息
    this.saveMessages()
  },

  // 加载历史消息
  loadMessages() {
    try {
      const messages = wx.getStorageSync('ai-chat-messages') || []
      this.setData({
        messages,
        showQuickQuestions: messages.length === 0
      })

      if (messages.length > 0) {
        this.scrollToBottom()
      }
    } catch (e) {
      console.error('加载消息失败:', e)
    }
  },

  // 保存消息到本地
  saveMessages() {
    try {
      // 只保存最近 50 条消息
      const messages = this.data.messages.slice(-50)
      wx.setStorageSync('ai-chat-messages', messages)
    } catch (e) {
      console.error('保存消息失败:', e)
    }
  },

  // 输入框内容变化
  onInputChange(e) {
    this.setData({ inputText: e.detail.value })
  },

  // 发送消息
  async onSend() {
    const { inputText, sending, messages } = this.data

    if (sending || !inputText.trim()) return

    // 检查登录状态
    if (!userStore.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString()
    }

    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      typing: true
    }

    // 更新 UI
    this.setData({
      messages: [...messages, userMessage, assistantMessage],
      inputText: '',
      sending: true,
      typing: true,
      showQuickQuestions: false
    })

    this.scrollToBottom()

    // 构建消息历史
    const chatMessages = this.buildChatMessages(userMessage)

    // 开始流式请求
    this.startStream(chatMessages, assistantMessage.id)
  },

  // 构建聊天消息
  buildChatMessages(userMessage) {
    const { messages, matchInfo } = this.data
    const chatMessages = []

    // 如果有比赛信息，添加系统提示
    if (matchInfo) {
      chatMessages.push({
        role: 'system',
        content: `用户正在查看一场足球比赛：${matchInfo.league} ${matchInfo.homeTeam} vs ${matchInfo.awayTeam}。请基于这场比赛提供分析和建议。`
      })
    }

    // 添加历史消息（最近 10 条）
    const recentMessages = messages.slice(-10).filter(m => m.content)
    recentMessages.forEach(msg => {
      chatMessages.push({
        role: msg.role,
        content: msg.content
      })
    })

    // 添加当前用户消息
    chatMessages.push({
      role: 'user',
      content: userMessage.content
    })

    return chatMessages
  },

  // 开始流式请求
  startStream(chatMessages, messageId) {
    const { deepThinking } = this.data

    this._streamController = streamApi.smartStreamChat({
      messages: chatMessages,
      deepThinking,
      onMessage: (text) => {
        this.appendMessage(messageId, text)
      },
      onComplete: () => {
        this.finishMessage(messageId)
      },
      onError: (err) => {
        console.error('流式请求错误:', err)
        this.handleStreamError(messageId, err)
      }
    })
  },

  // 追加消息内容
  appendMessage(messageId, text) {
    const { messages } = this.data
    const index = messages.findIndex(m => m.id === messageId)

    if (index !== -1) {
      const message = messages[index]
      message.content += text

      this.setData({
        [`messages[${index}].content`]: message.content
      })

      // 节流滚动，避免频繁调用
      this.throttleScrollToBottom()
    }
  },

  // 节流滚动到底部
  throttleScrollToBottom() {
    if (this._scrollTimer) return
    this._scrollTimer = setTimeout(() => {
      this.scrollToBottom()
      this._scrollTimer = null
    }, 150)
  },

  // 完成消息
  finishMessage(messageId) {
    const { messages } = this.data
    const index = messages.findIndex(m => m.id === messageId)

    if (index !== -1) {
      this.setData({
        [`messages[${index}].typing`]: false,
        sending: false,
        typing: false,
        showQuickQuestions: true
      })

      this.saveMessages()
      this.scrollToBottom()
    }
  },

  // 处理流式错误
  handleStreamError(messageId, err) {
    const { messages } = this.data
    const index = messages.findIndex(m => m.id === messageId)

    if (index !== -1) {
      const errorText = messages[index].content || '抱歉，发生了一些错误，请稍后重试。'

      this.setData({
        [`messages[${index}].content`]: errorText,
        [`messages[${index}].typing`]: false,
        [`messages[${index}].error`]: true,
        sending: false,
        typing: false
      })
    }

    wx.showToast({
      title: err.message || '请求失败',
      icon: 'none'
    })
  },

  // 中止流式请求
  abortStream() {
    if (this._streamController) {
      this._streamController.abort()
      this._streamController = null
    }
  },

  // 停止生成
  onStopGenerate() {
    this.abortStream()

    const { messages } = this.data
    const lastIndex = messages.length - 1

    if (lastIndex >= 0 && messages[lastIndex].typing) {
      this.setData({
        [`messages[${lastIndex}].typing`]: false,
        sending: false,
        typing: false
      })

      this.saveMessages()
    }
  },

  // 选择快速问题
  onQuestionSelect(e) {
    const { question } = e.detail
    this.setData({ inputText: question })
    this.onSend()
  },

  // 切换深度思考模式
  onToggleDeepThinking() {
    const { deepThinking } = this.data
    this.setData({ deepThinking: !deepThinking })

    wx.showToast({
      title: !deepThinking ? '已开启深度思考' : '已关闭深度思考',
      icon: 'none'
    })
  },

  // 清空对话
  onClearChat() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有对话记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            messages: [],
            showQuickQuestions: true
          })
          wx.removeStorageSync('ai-chat-messages')

          wx.showToast({
            title: '已清空',
            icon: 'success'
          })
        }
      }
    })
  },

  // 滚动到底部
  scrollToBottom() {
    setTimeout(() => {
      this.setData({
        scrollToView: `msg-${this.data.messages.length - 1}`
      })
    }, 100)
  },

  // 打字完成回调
  onTypingComplete() {
    this.setData({ typing: false })
  }
})
