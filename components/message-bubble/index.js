// components/message-bubble/index.js
Component({
  properties: {
    // 消息类型: user | assistant
    type: {
      type: String,
      value: 'user'
    },
    // 消息内容
    content: {
      type: String,
      value: ''
    },
    // 是否正在打字
    typing: {
      type: Boolean,
      value: false
    },
    // 是否显示头像
    showAvatar: {
      type: Boolean,
      value: true
    },
    // 时间戳
    timestamp: {
      type: String,
      value: ''
    },
    // 是否显示 Markdown
    markdown: {
      type: Boolean,
      value: false
    }
  },

  data: {
    avatarUrl: ''
  },

  lifetimes: {
    attached() {
      this.updateAvatar()
    }
  },

  observers: {
    'type': function() {
      this.updateAvatar()
    }
  },

  methods: {
    updateAvatar() {
      const type = this.properties.type
      if (type === 'user') {
        // 用户头像
        const app = getApp()
        const userInfo = app.globalData.userInfo
        this.setData({
          avatarUrl: (userInfo && userInfo.avatar) || '/images/icons/user-avatar.png'
        })
      } else {
        // AI 头像
        this.setData({
          avatarUrl: '/images/icons/ai-avatar.png'
        })
      }
    },

    // 复制消息内容
    onLongPress() {
      wx.showActionSheet({
        itemList: ['复制内容'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.copyContent()
          }
        }
      })
    },

    copyContent() {
      wx.setClipboardData({
        data: this.properties.content,
        success: () => {
          wx.showToast({
            title: '已复制',
            icon: 'success',
            duration: 1500
          })
        }
      })
    },

    // 打字完成
    onTypingComplete() {
      this.triggerEvent('typingComplete')
    }
  }
})
