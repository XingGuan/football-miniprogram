// pages/tool/index.js - 数据同步工具页面
const userStore = require('../../store/user')

Page({
  data: {
    syncStatus: 'idle', // idle, syncing, success, error
    lastSyncTime: null,
    dataInfo: {
      messages: 0,
      history: 0,
      settings: 0
    }
  },

  onLoad() {
    this.loadDataInfo()
    this.loadLastSyncTime()
  },

  // 加载数据信息
  loadDataInfo() {
    try {
      const messages = wx.getStorageSync('ai-chat-messages') || []
      const settings = wx.getStorageSync('user-settings') || {}

      this.setData({
        dataInfo: {
          messages: messages.length,
          history: 0, // 历史记录存在云端
          settings: Object.keys(settings).length
        }
      })
    } catch (e) {
      console.error('加载数据信息失败:', e)
    }
  },

  // 加载上次同步时间
  loadLastSyncTime() {
    try {
      const lastSyncTime = wx.getStorageSync('last-sync-time')
      if (lastSyncTime) {
        this.setData({ lastSyncTime })
      }
    } catch (e) {
      console.error('加载同步时间失败:', e)
    }
  },

  // 开始同步
  async onSync() {
    if (!userStore.isLoggedIn()) {
      wx.showModal({
        title: '未登录',
        content: '请先登录后再进行数据同步',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/index' })
          }
        }
      })
      return
    }

    this.setData({ syncStatus: 'syncing' })

    try {
      // 模拟同步过程
      await this.simulateSync()

      const now = new Date().toLocaleString()
      wx.setStorageSync('last-sync-time', now)

      this.setData({
        syncStatus: 'success',
        lastSyncTime: now
      })

      wx.showToast({
        title: '同步成功',
        icon: 'success'
      })

      // 3秒后重置状态
      setTimeout(() => {
        this.setData({ syncStatus: 'idle' })
      }, 3000)
    } catch (e) {
      console.error('同步失败:', e)
      this.setData({ syncStatus: 'error' })

      wx.showToast({
        title: '同步失败',
        icon: 'none'
      })

      setTimeout(() => {
        this.setData({ syncStatus: 'idle' })
      }, 3000)
    }
  },

  // 模拟同步
  simulateSync() {
    return new Promise((resolve) => {
      setTimeout(resolve, 2000)
    })
  },

  // 导出数据
  onExport() {
    try {
      const messages = wx.getStorageSync('ai-chat-messages') || []
      const settings = wx.getStorageSync('user-settings') || {}

      const exportData = {
        version: '1.0.0',
        exportTime: new Date().toISOString(),
        data: {
          messages,
          settings
        }
      }

      // 复制到剪贴板
      wx.setClipboardData({
        data: JSON.stringify(exportData),
        success: () => {
          wx.showToast({
            title: '数据已复制到剪贴板',
            icon: 'none',
            duration: 2000
          })
        }
      })
    } catch (e) {
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      })
    }
  },

  // 导入数据
  onImport() {
    wx.showModal({
      title: '导入数据',
      content: '请将导出的数据粘贴到剪贴板，然后点击确认',
      success: (res) => {
        if (res.confirm) {
          this.doImport()
        }
      }
    })
  },

  // 执行导入
  async doImport() {
    try {
      const { data } = await new Promise((resolve, reject) => {
        wx.getClipboardData({
          success: resolve,
          fail: reject
        })
      })

      const importData = JSON.parse(data)

      if (!importData.version || !importData.data) {
        throw new Error('数据格式不正确')
      }

      // 导入消息
      if (importData.data.messages) {
        wx.setStorageSync('ai-chat-messages', importData.data.messages)
      }

      // 导入设置
      if (importData.data.settings) {
        wx.setStorageSync('user-settings', importData.data.settings)
      }

      this.loadDataInfo()

      wx.showToast({
        title: '导入成功',
        icon: 'success'
      })
    } catch (e) {
      wx.showToast({
        title: '导入失败：数据格式不正确',
        icon: 'none'
      })
    }
  },

  // 清除本地数据
  onClearLocal() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有本地数据吗？此操作不可恢复。',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          // 保留登录信息
          const token = wx.getStorageSync('token')
          const userInfo = wx.getStorageSync('userInfo')

          wx.clearStorageSync()

          if (token) wx.setStorageSync('token', token)
          if (userInfo) wx.setStorageSync('userInfo', userInfo)

          this.loadDataInfo()

          wx.showToast({
            title: '已清除',
            icon: 'success'
          })
        }
      }
    })
  }
})
