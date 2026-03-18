// components/typing-text/index.js
Component({
  properties: {
    // 完整文本内容
    text: {
      type: String,
      value: ''
    },
    // 是否启用打字机效果
    typing: {
      type: Boolean,
      value: true
    },
    // 打字速度 (毫秒/字符)
    speed: {
      type: Number,
      value: 30
    },
    // 是否显示光标
    showCursor: {
      type: Boolean,
      value: true
    }
  },

  data: {
    displayText: '',
    isTyping: false,
    cursorVisible: true
  },

  lifetimes: {
    attached() {
      // 启动光标闪烁
      if (this.properties.showCursor) {
        this.startCursorBlink()
      }
    },

    detached() {
      this.stopTyping()
      this.stopCursorBlink()
    }
  },

  observers: {
    'text': function(newText) {
      if (this.properties.typing) {
        this.startTyping(newText)
      } else {
        this.setData({ displayText: newText })
      }
    }
  },

  methods: {
    // 开始打字效果
    startTyping(text) {
      this.stopTyping()

      if (!text) {
        this.setData({ displayText: '', isTyping: false })
        return
      }

      const currentLength = this.data.displayText.length

      // 如果新文本是当前文本的延续，继续打字
      if (text.startsWith(this.data.displayText)) {
        this.typeFromIndex(text, currentLength)
      } else {
        // 否则重新开始
        this.setData({ displayText: '' })
        this.typeFromIndex(text, 0)
      }
    },

    // 从指定位置开始打字
    typeFromIndex(text, startIndex) {
      if (startIndex >= text.length) {
        this.setData({ isTyping: false })
        this.triggerEvent('complete')
        return
      }

      this.setData({ isTyping: true })

      let index = startIndex
      const typingQueue = []
      let chunkSize = 1

      // 预处理：根据字符类型决定一次显示多少
      while (index < text.length) {
        const char = text[index]

        // 中文标点符号后稍作停顿
        if ('。！？；：'.includes(char)) {
          typingQueue.push({ text: text.substring(0, index + 1), delay: this.properties.speed * 3 })
          index++
        }
        // 英文单词连续显示
        else if (/[a-zA-Z]/.test(char)) {
          let wordEnd = index
          while (wordEnd < text.length && /[a-zA-Z]/.test(text[wordEnd])) {
            wordEnd++
          }
          typingQueue.push({ text: text.substring(0, wordEnd), delay: this.properties.speed })
          index = wordEnd
        }
        // 数字连续显示
        else if (/[0-9]/.test(char)) {
          let numEnd = index
          while (numEnd < text.length && /[0-9.]/.test(text[numEnd])) {
            numEnd++
          }
          typingQueue.push({ text: text.substring(0, numEnd), delay: this.properties.speed })
          index = numEnd
        }
        // 其他字符逐个显示
        else {
          typingQueue.push({ text: text.substring(0, index + 1), delay: this.properties.speed })
          index++
        }
      }

      // 执行打字队列
      this.processTypingQueue(typingQueue, 0)
    },

    // 处理打字队列
    processTypingQueue(queue, index) {
      if (index >= queue.length) {
        this.setData({ isTyping: false })
        this.triggerEvent('complete')
        return
      }

      const item = queue[index]

      this._typingTimer = setTimeout(() => {
        this.setData({ displayText: item.text })
        this.triggerEvent('typing', { text: item.text, progress: (index + 1) / queue.length })
        this.processTypingQueue(queue, index + 1)
      }, item.delay)
    },

    // 停止打字
    stopTyping() {
      if (this._typingTimer) {
        clearTimeout(this._typingTimer)
        this._typingTimer = null
      }
    },

    // 立即显示全部文本
    showAll() {
      this.stopTyping()
      this.setData({
        displayText: this.properties.text,
        isTyping: false
      })
      this.triggerEvent('complete')
    },

    // 开始光标闪烁
    startCursorBlink() {
      this._cursorTimer = setInterval(() => {
        this.setData({
          cursorVisible: !this.data.cursorVisible
        })
      }, 500)
    },

    // 停止光标闪烁
    stopCursorBlink() {
      if (this._cursorTimer) {
        clearInterval(this._cursorTimer)
        this._cursorTimer = null
      }
    },

    // 追加文本 (用于流式输入)
    appendText(newText) {
      const currentText = this.data.displayText
      const fullText = currentText + newText

      if (this.properties.typing) {
        this.typeFromIndex(fullText, currentText.length)
      } else {
        this.setData({ displayText: fullText })
      }
    }
  }
})
