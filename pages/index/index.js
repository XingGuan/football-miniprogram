// pages/index/index.js - 首页（比赛列表）
const matchApi = require('../../api/match')
const dateUtils = require('../../utils/date')
const matchUtils = require('../../utils/match')

Page({
  data: {
    matches: [],
    groupedMatches: [],
    loading: false,
    refreshing: false,
    error: null,
    collapsedGroups: {},
    currentStatus: '',
    statusList: [
      { value: '', label: '全部' },
      { value: '2', label: '开放' },
      { value: '4', label: '进行中' },
      { value: '5', label: '已完成' }
    ]
  },

  onLoad() {
    this.loadMatches()
  },

  onShow() {
    // 每次显示时刷新
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },

  onPullDownRefresh() {
    this.loadMatches().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载比赛列表
  async loadMatches() {
    const { currentStatus } = this.data

    this.setData({ loading: true, error: null })

    try {
      const params = {}
      if (currentStatus) params.status = currentStatus

      const res = await matchApi.getMatchList(params)

      // 兼容分页结构和数组结构
      const rawMatches = Array.isArray(res) ? res : (res && res.list ? res.list : [])

      // 字段映射转换
      const matches = rawMatches.map(item => ({
        id: item.matchId,
        matchNumStr: item.matchNumStr,
        matchNum: item.matchNum,
        league: item.leagueAbbName,
        leagueId: item.leagueId,
        homeTeam: item.homeTeamAbbName,
        homeTeamFull: item.homeTeamAllName,
        homeTeamId: item.homeTeamId,
        homeTeamRank: item.homeTeamRank,
        awayTeam: item.awayTeamAbbName,
        awayTeamFull: item.awayTeamAllName,
        awayTeamId: item.awayTeamId,
        awayTeamRank: item.awayTeamRank,
        status: item.matchStatus,
        statusName: item.matchStatusName,
        matchDate: item.matchDate,
        matchTime: item.matchTime,
        fullMatchTime: `${item.matchDate} ${item.matchTime}`,
        isSingleMatch: item.isSingleMatch,
        odds: {
          home: item.homeWin,
          draw: item.draw,
          away: item.awayWin,
          hhome: item.hhomeWin,
          haway: item.hawayWin,
          hdraw: item.hdraw,
          goalLine: item.goalLine
        }
      }))

      // 按周几分组
      const groupedMatches = this.groupMatchesByWeekday(matches)

      this.setData({
        matches,
        groupedMatches,
        loading: false
      })
    } catch (e) {
      console.error('加载比赛失败:', e)
      this.setData({
        loading: false,
        error: e.message || '加载失败'
      })
    }
  },

  // 切换分组折叠
  onToggleGroup(e) {
    const index = e.currentTarget.dataset.index
    const key = `collapsedGroups.${index}`
    this.setData({
      [key]: !this.data.collapsedGroups[index]
    })
  },

  // 切换状态筛选
  onStatusChange(e) {
    const status = e.currentTarget.dataset.status
    if (status === this.data.currentStatus) return

    this.setData({ currentStatus: status })
    this.loadMatches()
  },

  // 点击比赛卡片
  onMatchTap(e) {
    const { match } = e.detail
    wx.navigateTo({
      url: `/pages/analysis/index?matchId=${match.id}`
    })
  },

  // 点击 AI 分析
  onAnalyze(e) {
   
    const match = e.detail && e.detail.match
    if (!match) {
      console.error('AI分析: match 数据为空', e)
      return
    }
    const matchInfo = JSON.stringify({
      league: match.league,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam
    })
    wx.navigateTo({
      url: `/pages/ai-chat/index?matchId=${match.id}&matchInfo=${encodeURIComponent(matchInfo)}`
    })
  },

  // 重试加载
  onRetry() {
    this.loadMatches()
  },

  // 按周几分组比赛
  groupMatchesByWeekday(matches) {
    const groups = {}

    matches.forEach(match => {
      // 从 matchNumStr 提取周几，如 "周二004" -> "周二"
      const weekday = match.matchNumStr ? match.matchNumStr.replace(/\d+/g, '') : '其他'
      if (!groups[weekday]) {
        groups[weekday] = []
      }
      groups[weekday].push(match)
    })

    // 按周几顺序排序
    const weekOrder = ['周一', '周二', '周三', '周四', '周五', '周六', '周日', '其他']
    return Object.keys(groups)
      .sort((a, b) => weekOrder.indexOf(a) - weekOrder.indexOf(b))
      .map(weekday => ({
        league: weekday,
        matches: groups[weekday].sort((a, b) => a.matchNum - b.matchNum)
      }))
  }
})
