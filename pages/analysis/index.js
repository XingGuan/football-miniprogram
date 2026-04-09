// pages/analysis/index.js - 比赛分析页面
const matchApi = require('../../api/match')
const analysisApi = require('../../api/analysis')
const userApi = require('../../api/user')
const matchUtils = require('../../utils/match')
const dateUtils = require('../../utils/date')
const userStore = require('../../store/user')

const app = getApp()

Page({
  data: {
    matchId: null,
    match: null,
    loading: true,
    error: null,
    // 标签页
    tabs: [
      { key: 'recent', name: '战绩' },
      { key: 'table', name: '排名' },
      { key: 'history', name: '交锋' },
      { key: 'information', name: '情报' },
      { key: 'xg', name: 'XG' },
      { key: 'similar', name: '同赔' },
      { key: 'odds', name: '指数' }
    ],
    activeTab: 'recent',
    loadedTabs: {},
    // 各标签页数据
    recentData: null,
    historyData: [],
    tableData: { total: [], home: [], away: [] },
    tableType: 'total', // 排名类型：total（全部）/home（主）/away（客）
    xgData: null,
    informationData: null,
    similarData: [],
    oddsData: [],
    // 各标签页加载状态
    tabLoading: {},
    // 情报解锁相关
    informationUnlocked: false,
    userPoints: 0
  },

  onLoad(options) {
    const { matchId } = options
    if (matchId) {
      this.setData({ matchId })
      this.loadMatchDetail(matchId)
      this.loadTabData('recent')
      this.loadUserPoints()
      this.checkInformationUnlockStatus(matchId)
    } else {
      this.setData({
        loading: false,
        error: '缺少比赛 ID'
      })
    }
  },

  onShow() {
    // 页面显示时刷新积分
    this.loadUserPoints()
  },

  // 加载用户积分
  loadUserPoints() {
    const userInfo = userStore.getUserInfo()
    this.setData({
      userPoints: userInfo?.point || 0
    })
  },

  // 检查情报解锁状态
  async checkInformationUnlockStatus(matchId) {
    if (!userStore.isLoggedIn()) {
      this.setData({ informationUnlocked: false })
      return
    }

    const userInfo = userStore.getUserInfo()
    if (!userInfo || !userInfo.id) {
      this.setData({ informationUnlocked: false })
      return
    }

    try {
      const result = await userApi.checkInformationUnlock(matchId, userInfo.id)
      this.setData({
        informationUnlocked: result?.unlocked || result === true
      })
    } catch (e) {
      console.error('检查情报解锁状态失败:', e)
      this.setData({ informationUnlocked: false })
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
        case 'recent':
          data = await analysisApi.getRecentMatches(matchId)
          this.setData({ recentData: data || null })
          break

        case 'table':
          await this.loadTableData(matchId)
          break

        case 'history':
          data = await analysisApi.getHistoryData(matchId)
          this.setData({ historyData: data || [] })
          break

        case 'xg':
          const xgResult = await analysisApi.getXgData(matchId)
          this.setData({ xgData: xgResult?.data || xgResult })
          break
        case 'information':
          const informationResult = await analysisApi.getInformationData(matchId)
          this.setData({ informationData: informationResult })
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



  // 加载排名数据
  async loadTableData(matchId) {
    try {
      const tableData = {
        total: [],
        home: [],
        away: []
      }

      // 调用API获取排名数据
      const result = await matchApi.getTableData(matchId)

      if (result && Array.isArray(result)) {
        // 按tableType准确分组排名数据
        // total: tableType 为 'total' 的数据
        tableData.total = result.filter(item => item.tableType === 'total')
        // home: tableType 为 'home' 的数据
        tableData.home = result.filter(item => item.tableType === 'home')
        // away: tableType 为 'away' 的数据
        tableData.away = result.filter(item => item.tableType === 'away')

        // 每种类型的数据按排名排序
        tableData.total.sort((a, b) => (a.ranking || 999) - (b.ranking || 999))
        tableData.home.sort((a, b) => (a.ranking || 999) - (b.ranking || 999))
        tableData.away.sort((a, b) => (a.ranking || 999) - (b.ranking || 999))

        console.log('排名数据分组结果:', {
          total: tableData.total.length,
          home: tableData.home.length,
          away: tableData.away.length
        })
      }

      this.setData({
        tableData,
        tableType: 'total'
      })
    } catch (e) {
      console.error('加载排名数据失败:', e)
    }
  },

  // 切换排名类型
  onTableTypeChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ tableType: type })
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

  // 点击比赛卡片，跳转到分析页面
  onMatchTap(e) {
    const { match } = e.currentTarget.dataset

    if (!match) return

    // 跳转到分析页面
    wx.navigateTo({
      url: `/pages/analysis/index?matchId=${match.matchId}`
    })
  },

  // 重试
  onRetry() {
    const { matchId } = this.data
    if (matchId) {
      this.loadMatchDetail(matchId)
    }
  },

  // 解锁情报
  async onUnlockInformation() {
    // 检查登录状态
    if (!userStore.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再解锁情报',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/index' })
          }
        }
      })
      return
    }

    const userInfo = userStore.getUserInfo()
    const userPoints = userInfo?.point || 0
    const pointsNeeded = 1

    // 检查积分是否充足
    if (userPoints < pointsNeeded) {
      wx.showModal({
        title: '积分不足',
        content: `解锁情报需要消耗 ${pointsNeeded} 积分，您当前积分为 ${userPoints}，请先获取更多积分`,
        confirmText: '我知道了',
        showCancel: false
      })
      return
    }

    // 弹窗确认解锁
    wx.showModal({
      title: '解锁情报',
      content: `本次解锁将消耗 ${pointsNeeded} 积分，是否继续？`,
      confirmText: '确认',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          await this.doUnlockInformation(userInfo.id, pointsNeeded)
        }
      }
    })
  },

  // 执行解锁情报
  async doUnlockInformation(userId, points) {
    const { matchId } = this.data

    try {
      wx.showLoading({
        title: `消耗${points}积分中...`,
        mask: true
      })

      // 调用扣减积分接口
      await userApi.deductPointForInformation(userId, points, matchId)

      // 重新拉取用户信息更新积分
      const latestUserInfo = await userApi.getUserInfoById(userId)
      if (latestUserInfo) {
        app.globalData.userInfo = latestUserInfo
        wx.setStorageSync('userInfo', latestUserInfo)
      }

      wx.hideLoading()

      // 更新本地状态
      this.setData({
        informationUnlocked: true,
        userPoints: latestUserInfo?.point || 0
      })

      // 显示成功提示
      wx.showToast({
        title: '解锁成功',
        icon: 'success',
        duration: 1500
      })
    } catch (e) {
      wx.hideLoading()
      console.error('解锁情报失败:', e)
      wx.showToast({
        title: '解锁失败，请重试',
        icon: 'error',
        duration: 2000
      })
    }
  }
})
