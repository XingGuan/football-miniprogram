// components/match-card/index.js
const dateUtils = require('../../utils/date')
const matchUtils = require('../../utils/match')
const userStore = require('../../store/user')

Component({
  properties: {
    match: {
      type: Object,
      value: {}
    },
    showOdds: {
      type: Boolean,
      value: true
    },
    clickable: {
      type: Boolean,
      value: true
    }
  },

  data: {
    formattedTime: '',
    statusInfo: null
  },

  observers: {
    'match': function(match) {
      if (match && match.fullMatchTime) {
        this.setData({
          formattedTime: dateUtils.formatShortDateTime(match.fullMatchTime),
          statusInfo: matchUtils.getMatchStatus(match.status)
        })
      }
    }
  },

  methods: {
    onTap() {
      if (!this.properties.clickable) return

      // 登录拦截
      if (!userStore.isLoggedIn()) {
        wx.navigateTo({ url: '/pages/login/index' })
        return
      }

      const match = this.properties.match
      if (!match || !match.id) return

      wx.navigateTo({
        url: `/pages/analysis/index?matchId=${match.id}`
      })
    },

    onAnalyze() {
      // 登录拦截
      if (!userStore.isLoggedIn()) {
        wx.navigateTo({ url: '/pages/login/index' })
        return
      }

      const match = this.properties.match
      if (!match || !match.id) {
        console.error('match 数据无效')
        return
      }

      const matchInfo = encodeURIComponent(JSON.stringify({
        league: match.league,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam
      }))

      wx.navigateTo({
        url: `/pages/ai-analysis/index?matchId=${match.id}&matchInfo=${matchInfo}`
      })
    },

    formatOdds(odds) {
      return matchUtils.formatOdds(odds)
    },

    formatGoalLine(goalLine) {
      return matchUtils.formatGoalLine(goalLine)
    }
  }
})
