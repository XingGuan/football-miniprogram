// pages/analysis/index.js - 比赛分析页面
const matchApi = require('../../api/match')
const analysisApi = require('../../api/analysis')
const matchUtils = require('../../utils/match')
const dateUtils = require('../../utils/date')
const userStore = require('../../store/user')

Page({
  data: {
    matchId: null,
    match: null,
    loading: true,
    error: null,
    // 标签页
    tabs: [
      { key: 'history', name: '历史交锋' },
      { key: 'xg', name: 'xG数据' },
      { key: 'similar', name: '相似比赛' },
      { key: 'odds', name: '赔率变化' }
    ],
    activeTab: 'history',
    loadedTabs: {},
    // 各标签页数据
    historyData: [],
    xgData: null,
    similarData: [],
    oddsData: [],
    // 各标签页加载状态
    tabLoading: {}
  },

  onLoad(options) {
    const { matchId } = options
    if (matchId) {
      this.setData({ matchId })
      this.loadMatchDetail(matchId)
      this.loadTabData('history')
    } else {
      this.setData({
        loading: false,
        error: '缺少比赛 ID'
      })
    }
  },

  // 加载比赛详情
  async loadMatchDetail(matchId) {
    this.setData({ loading: true })

    try {
      const res = await matchApi.getMatchDetail(matchId)

      // 字段映射
      const match = res ? {
        id: res.matchId || res.id,
        matchNumStr: res.matchNumStr,
        league: res.leagueAbbName || res.league,
        homeTeam: res.homeTeamAbbName || res.homeTeam,
        homeTeamFull: res.homeTeamAllName,
        homeTeamRank: res.homeTeamRank,
        awayTeam: res.awayTeamAbbName || res.awayTeam,
        awayTeamFull: res.awayTeamAllName,
        awayTeamRank: res.awayTeamRank,
        status: res.matchStatus || res.status,
        fullMatchTime: res.fullMatchTime || `${res.matchDate} ${res.matchTime}`,
        odds: res.odds || {
          home: res.homeWin,
          draw: res.draw,
          away: res.awayWin,
          hhome: res.hhomeWin,
          haway: res.hawayWin,
          goalLine: res.goalLine
        }
      } : null

      this.setData({
        match,
        loading: false
      })

      // 设置导航标题
      if (match) {
        wx.setNavigationBarTitle({
          title: `${match.homeTeam} vs ${match.awayTeam}`
        })
      }
    } catch (e) {
      console.error('加载比赛详情失败:', e)
      this.setData({
        loading: false,
        error: e.message || '加载失败'
      })
    }
  },

  // 切换标签页
  onTabChange(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeTab) return

    this.setData({ activeTab: key })

    // 懒加载数据
    if (!this.data.loadedTabs[key]) {
      this.loadTabData(key)
    }
  },

  // 加载标签页数据
  async loadTabData(key) {
    const { matchId, loadedTabs, tabLoading } = this.data

    if (loadedTabs[key] || tabLoading[key]) return

    this.setData({
      [`tabLoading.${key}`]: true
    })

    try {
      let data = null

      switch (key) {
        case 'history':
          data = await analysisApi.getHistoryData(matchId)
          this.setData({ historyData: data || [] })
          break

        case 'xg':
          const xgResult = await analysisApi.getXgData(matchId)
          this.setData({ xgData: xgResult?.data || xgResult })
          break

        case 'similar':
          data = await analysisApi.getSimilarData(matchId)
          this.setData({ similarData: data || [] })
          break

        case 'odds':
          const oddsResult = await analysisApi.getOddsData(matchId)
          this.setData({ oddsData: oddsResult?.history || oddsResult || [] })
          break
      }

      this.setData({
        [`loadedTabs.${key}`]: true,
        [`tabLoading.${key}`]: false
      })
    } catch (e) {
      console.error(`加载 ${key} 数据失败:`, e)
      this.setData({
        [`tabLoading.${key}`]: false
      })
    }
  },

  // 跳转 AI 分析
  onAiAnalyze() {
    const { match } = this.data
    if (!match) return

    wx.navigateTo({
      url: `/pages/ai-chat/index?matchId=${match.id}&matchInfo=${encodeURIComponent(JSON.stringify({
        league: match.league,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam
      }))}`
    })
  },

  // 格式化日期
  formatDate(date) {
    return dateUtils.formatShortDateTime(date)
  },

  // 获取比赛结果样式
  getResultClass(result) {
    return matchUtils.getResultClass(result)
  },

  // 计算 xG 百分比
  calculateXgPercent(homeXg, awayXg) {
    return matchUtils.calculateXgPercent(homeXg, awayXg)
  },

  // 获取赔率变化标识
  getOddsChangeFlag(hf) {
    return matchUtils.getOddsChangeFlag(hf)
  },

  // 重试
  onRetry() {
    const { matchId } = this.data
    if (matchId) {
      this.loadMatchDetail(matchId)
    }
  }
})
