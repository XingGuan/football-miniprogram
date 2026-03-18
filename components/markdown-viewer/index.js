// components/markdown-viewer/index.js
const markdownUtils = require('../../utils/markdown')

Component({
  properties: {
    content: {
      type: String,
      value: ''
    },
    selectable: {
      type: Boolean,
      value: true
    }
  },

  data: {
    nodes: [],
    parsedNodes: []
  },

  observers: {
    'content': function(content) {
      if (content) {
        this.parseContent(content)
      } else {
        this.setData({ nodes: [], parsedNodes: [] })
      }
    }
  },

  methods: {
    parseContent(content) {
      try {
        // 解析 Markdown
        const parsedNodes = markdownUtils.parseMarkdown(content)
        const richTextNodes = markdownUtils.toRichTextNodes(parsedNodes)

        this.setData({
          parsedNodes,
          nodes: richTextNodes
        })
      } catch (e) {
        console.error('Markdown 解析失败:', e)
        // 降级为纯文本
        this.setData({
          parsedNodes: [{ type: 'paragraph', children: [{ type: 'text', text: content }] }],
          nodes: [{
            name: 'p',
            children: [{ type: 'text', text: content }]
          }]
        })
      }
    },

    // 复制代码块
    copyCode(e) {
      const index = e.currentTarget.dataset.index
      const node = this.data.parsedNodes[index]

      if (node && node.type === 'code') {
        wx.setClipboardData({
          data: node.content,
          success: () => {
            wx.showToast({
              title: '已复制',
              icon: 'success',
              duration: 1500
            })
          }
        })
      }
    },

    // 处理链接点击
    onLinkTap(e) {
      const url = e.currentTarget.dataset.url
      if (url) {
        // 复制链接
        wx.setClipboardData({
          data: url,
          success: () => {
            wx.showToast({
              title: '链接已复制',
              icon: 'success',
              duration: 1500
            })
          }
        })
      }
    }
  }
})
