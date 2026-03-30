// components/history-card/index.js
const dateUtils = require('../../utils/date')

Component({
  properties: {
    record: {
      type: Object,
      value: {}
    }
  },

  data: {
    relativeTime: '',
    matchTimeStr: '',
    previewText: '',
    resultTag: ''
  },

  observers: {
    'record': function(record) {
      if (record) {
        this.setData({
          relativeTime: record.createTime ? dateUtils.getRelativeTime(record.createTime) : '',
          matchTimeStr: record.matchTime ? dateUtils.formatDateTime(record.matchTime) : '',
          previewText: this.getPreviewText(record.aiAnalysis || '')
        })
      }
    }
  },

  methods: {
    getPreviewText(content) {
      if (!content) return '暂无分析内容'
      // 移除 markdown 标记并截取
      const text = content
        .replace(/[#*`>\[\]()]/g, '')
        .replace(/\n/g, ' ')
        .trim()
      return text.length > 60 ? text.substring(0, 60) + '...' : text
    },

    

    onTap() {
      this.triggerEvent('tap', { record: this.properties.record })
    },

    
  }
})
