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
          previewText: this.getPreviewText(record.aiAnalysis || ''),
          resultTag: this.getResultTag(record)
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

    // 获取比赛结果标签
    getResultTag(record) {
      if (!record.matchResult) return ''

      // 有赛后分析表示比赛已结束
      if (record.afterMatchAnalysis) {
        return 'finished'
      }
      return 'pending'
    },

    onTap() {
      this.triggerEvent('tap', { record: this.properties.record })
    },

    onDelete(e) {
      e.stopPropagation()
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这条历史记录吗？',
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('delete', { record: this.properties.record })
          }
        }
      })
    }
  }
})
