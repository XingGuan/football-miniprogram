// pages/calculator-hall/index.js - 推荐方案大厅
const matchApi = require('../../api/match')
const userApi = require('../../api/user')
const userStore = require('../../store/user')

Page({
  data: {
    // Tab相关
    currentTab: 'hall', // 'hall' 分享大厅 | 'discovery' 数据发现

    // 分享大厅数据
    recommendations: [],
    rankList: [], // 胜率排行榜前三
    bonusRankList: [], // 中奖金额排行榜前三
    loading: true,
    error: null,
    rankExpanded: true, // 排行榜是否展开
    rankType: 'winRate', // 排行榜类型：winRate（胜率）、bonus（中奖金额）
    // 浮动按钮拖动相关
    dragX: 0,
    dragY: 0,
    dragStartX: 0,
    dragStartY: 0,
    isDragging: false,
    // 功能开关
    showDragon: false, // 是否显示斩龙按钮

    // 数据发现相关
    leagues: [],           // 联赛列表
    hotLeagues: [],        // 热门联赛
    otherLeagues: [],      // 其他联赛
    leaguesLoading: false, // 联赛加载中
    leaguesError: null,    // 联赛加载错误
    otherLeaguesExpanded: false, // 全部联赛是否展开
    selectedLeague: null,  // 选中的联赛
    seasons: [],           // 赛季列表
    seasonsLoading: false, // 赛季加载中
    selectedSeason: null,  // 选中的赛季
    allStandings: [],      // 所有排名数据（缓存）
    standings: [],         // 当前显示的排名数据
    standingsLoading: false, // 排名加载中
    standingType: 'total'  // 排名类型: total/home/away
  },

  onLoad() {
    // 初始化浮动按钮位置（右下角）
    const windowWidth = wx.getSystemInfoSync().windowWidth
    const windowHeight = wx.getSystemInfoSync().windowHeight
    const btnWidth = 80 // rpx转换为px需要乘以系数，这里使用相对值
    const btnHeight = 80

    this.setData({
      dragX: windowWidth - btnWidth - 20, // 右边距20px
      dragY: windowHeight - btnHeight - 100 // 上面预留100px空间给底部
    })

    this.checkFeatures()
    this.loadRecommendations()
  },

  onShow() {
    // 每次显示时刷新列表和功能开关
    this.checkFeatures()
    this.loadRecommendations()
  },

  // 检查功能开关
  async checkFeatures() {
    try {
      const result = await matchApi.checkFeatures()
      const showDragon = result=== true
      this.setData({ showDragon })
    } catch (error) {
      console.error('检查功能开关失败:', error)
      // 失败时默认隐藏
      this.setData({ showDragon: false })
    }
  },

  // 加载推荐方案列表
  async loadRecommendations() {
    this.setData({ loading: true })
    try {
      const res = await matchApi.getCalculatorRecommendList()
      const rawRecords = res.data || res || []

      // 按用户ID分组，统计用户战绩和中奖金额
      const userStats = {}
      // 存储每个用户的中奖记录列表，用于上报
      const userBonusList = {}

      rawRecords.forEach(item => {
        const userId = item.userId
        if (!userStats[userId]) {
          userStats[userId] = {
            oduserId: userId,
            userName: item.userName || `用户${userId}`,
            avatar: item.avatar || '',
            totalRecords: 0,
            winRecords: 0,
            loseRecords: 0,
            pendingRecords: 0,
            totalBonus: 0, // 总中奖金额
            medals: [] // 用户勋章
          }
          userBonusList[userId] = []
        }

        if (item.status === 1) {
          userStats[userId].winRecords++
          userStats[userId].totalRecords++
          // 累计中奖金额（如果API没有返回actualBonus，则在前端计算）
          let bonus = parseFloat(item.actualBonus) || 0
          if (bonus === 0 && item.matchDetails) {
            bonus = this.calculateActualBonus(item)
          }
          userStats[userId].totalBonus += bonus

          // 记录中奖明细
          userBonusList[userId].push({
            amount: bonus,
            schemeNo: item.schemeNo || item.id
          })
        } else if (item.status === 2) {
          userStats[userId].loseRecords++
          userStats[userId].totalRecords++
        } else {
          userStats[userId].pendingRecords++
        }
      })

      // 上报中奖统计数据到后端
      this.reportBonusStats(userStats, userBonusList)

      // 获取每个用户的勋章数据
      await this.loadUserMedals(userStats)

      const recommendations = rawRecords.map(item => ({
        ...item,
        matchCount: item.matchDetails ? item.matchDetails.length : 0,
        passTypesStr: this.formatPassTypes(item.passTypes),
        createTimeStr: this.formatTime(item.createTime),
        // 添加用户统计信息
        userStats: userStats[item.userId],
        winRate: this.calculateWinRate(userStats[item.userId])
      }))

      // 计算胜率排行榜前三
      const rankList = Object.values(userStats)
        .filter(u => u.totalRecords >= 1) // 至少有1条已开奖记录
        .map(u => ({
          ...u,
          winRate: u.totalRecords > 0 ? Math.round((u.winRecords / u.totalRecords) * 100) : 0
        }))
        .sort((a, b) => {
          // 先按胜率排序，胜率相同按中奖数排序
          if (b.winRate !== a.winRate) return b.winRate - a.winRate
          return b.winRecords - a.winRecords
        })
        .slice(0, 3)

      // 计算中奖金额排行榜前三
      const bonusRankList = Object.values(userStats)
        .filter(u => u.totalBonus > 0) // 有中奖记录
        .map(u => ({
          ...u,
          totalBonusStr: this.formatBonus(u.totalBonus)
        }))
        .sort((a, b) => b.totalBonus - a.totalBonus) // 按金额从高到低
        .slice(0, 3)

      this.setData({ recommendations, rankList, bonusRankList, loading: false, error: null })
    } catch (error) {
      console.error('加载推荐列表失败:', error)
      this.setData({ loading: false, error: '加载失败，请重试' })
    }
  },

  // 上报中奖统计数据到后端
  async reportBonusStats(userStats, userBonusList) {
    try {
      // 遍历所有有中奖记录的用户，上报数据
      for (const userId of Object.keys(userStats)) {
        const stats = userStats[userId]
        const bonusList = userBonusList[userId] || []

        // 只上报有中奖记录的用户
        if (stats.totalBonus > 0 && bonusList.length > 0) {
          await matchApi.saveBonusStats({
            userId: userId,
            bonusList: bonusList,
            totalBonus: stats.totalBonus
          })
        }
      }
    } catch (error) {
      // 上报失败不影响页面展示，静默处理
      console.error('上报中奖统计失败:', error)
    }
  },

  // 加载用户勋章数据
  async loadUserMedals(userStats) {
    const userIds = Object.keys(userStats)

    // 并行获取所有用户的勋章
    const medalPromises = userIds.map(async (userId) => {
      try {
        const medals = await userApi.getUserMedals(userId)
        const medalList = Array.isArray(medals) ? medals : ((medals && medals.data) || [])

        // 筛选已获得的勋章（acquireTime 有值），按等级降序排序，取最高等级的一个
        const acquiredMedals = medalList
          .filter(m => m.acquireTime && m.acquireTime !== 'null' && m.acquireTime !== '')
          .sort((a, b) => (b.level || 0) - (a.level || 0))

        // 只保留最高等级的勋章
        const topMedal = acquiredMedals.length > 0 ? acquiredMedals[0] : null
        userStats[userId].topMedal = topMedal ? {
          ...topMedal,
          icon: this.getMedalIcon(topMedal.level),
          colorClass: this.getMedalColorClass(topMedal.level)
        } : null
      } catch (e) {
        console.error(`获取用户${userId}勋章失败:`, e)
        userStats[userId].topMedal = null
      }
    })

    await Promise.all(medalPromises)
  },

  // 获取勋章图标
  getMedalIcon(level) {
    const iconMap = {
      1: '🌱', 2: '🎊', 3: '💎', 4: '🎁', 5: '☀️', 6: '🏆', 7: '👑'
    }
    return iconMap[level] || '🏅'
  },

  // 获取勋章颜色样式类
  getMedalColorClass(level) {
    const colorMap = {
      1: 'medal-green', 2: 'medal-blue', 3: 'medal-purple',
      4: 'medal-pink', 5: 'medal-orange', 6: 'medal-gold', 7: 'medal-rainbow'
    }
    return colorMap[level] || 'medal-default'
  },

  // 计算胜率
  calculateWinRate(userStat) {
    if (!userStat || userStat.totalRecords === 0) return 0
    return ((userStat.winRecords / userStat.totalRecords) * 100).toFixed(0)
  },

  // 格式化中奖金额
  formatBonus(bonus) {
    if (bonus >= 10000) {
      return (bonus / 10000).toFixed(2) + '万'
    }
    return bonus.toFixed(2)
  },

  /**
   * 计算实际中奖金额
   * 简化版本，用于列表页快速计算
   */
  calculateActualBonus(record) {
    if (record.status !== 1) return 0
    if (!record.matchDetails || record.matchDetails.length === 0) return 0

    const multiple = record.multiple || 1
    const passTypes = record.passTypes || []
    const matchDetails = record.matchDetails

    // 收集每场比赛的命中选项（按玩法类型分组）
    const hitOptionsByMatch = {}
    const matchPlayTypes = {}
    const matchIds = []

    for (const match of matchDetails) {
      if (!match.options) continue
      const matchId = String(match.matchId)
      matchIds.push(matchId)
      hitOptionsByMatch[matchId] = {}
      matchPlayTypes[matchId] = {}

      for (const opt of match.options || []) {
        // 处理isHit可能是1或true的情况
        const isHit = opt.isHit === 1 || opt.isHit === true
        const checked = opt.checked !== false

        if (!checked) continue

        const playType = opt.optionType
        if (!matchPlayTypes[matchId][playType]) {
          matchPlayTypes[matchId][playType] = []
        }
        matchPlayTypes[matchId][playType].push({
          value: opt.optionValue,
          odds: opt.odds || 1,
          isHit: isHit
        })

        if (checked && isHit) {
          hitOptionsByMatch[matchId][playType] = {
            value: opt.optionValue,
            odds: opt.odds || 1
          }
        }
      }
    }

    // 生成玩法路径
    const playTypePaths = this.generatePlayTypePaths(matchIds, matchPlayTypes)

    let totalBonus = 0

    for (const passType of passTypes) {
      if (passType === 'single') {
        // 单关计算
        for (const matchId of matchIds) {
          const hitOptions = hitOptionsByMatch[matchId] || {}
          for (const playType of Object.keys(hitOptions)) {
            const hitOdds = hitOptions[playType].odds
            totalBonus += 2 * hitOdds * multiple
          }
        }
      } else {
        // 串关计算
        const [m] = passType.split('_').map(Number)
        if (matchIds.length < m) continue

        const matchCombinations = this.getCombinations(matchIds, m)

        for (const path of playTypePaths) {
          for (const combo of matchCombinations) {
            let allHit = true
            let oddsProduct = 1

            for (const matchId of combo) {
              const playType = path[matchId]
              if (!playType) {
                allHit = false
                break
              }

              const hitOptions = hitOptionsByMatch[matchId] || {}
              const hitForType = hitOptions[playType]
              if (!hitForType) {
                allHit = false
                break
              }

              // 检查该玩法下是否有命中的选项
              const selectedOptions = (matchPlayTypes[matchId] || {})[playType] || []
              const hitSelected = selectedOptions.find(opt => opt.isHit === true)
              if (!hitSelected) {
                allHit = false
                break
              }

              oddsProduct *= hitSelected.odds
            }

            if (allHit) {
              totalBonus += 2 * oddsProduct * multiple
            }
          }
        }
      }
    }

    return totalBonus
  },

  // 生成玩法路径组合
  generatePlayTypePaths(matchIds, matchPlayTypes) {
    if (matchIds.length === 0) return [{}]

    const [firstMatchId, ...restMatchIds] = matchIds
    const firstPlayTypes = Object.keys(matchPlayTypes[firstMatchId] || {})

    if (firstPlayTypes.length === 0) {
      return this.generatePlayTypePaths(restMatchIds, matchPlayTypes)
    }

    const restPaths = this.generatePlayTypePaths(restMatchIds, matchPlayTypes)
    const result = []

    for (const playType of firstPlayTypes) {
      for (const restPath of restPaths) {
        result.push({
          ...restPath,
          [firstMatchId]: playType
        })
      }
    }

    return result
  },

  // 获取组合
  getCombinations(arr, m) {
    if (m === 1) return arr.map(item => [item])
    if (m === arr.length) return [arr]

    const result = []
    for (let i = 0; i <= arr.length - m; i++) {
      const first = arr[i]
      const rest = arr.slice(i + 1)
      const subCombos = this.getCombinations(rest, m - 1)
      subCombos.forEach(combo => { result.push([first, ...combo]) })
    }
    return result
  },

  // 格式化时间
  formatTime(timeStr) {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hour}:${minute}`
  },

  // 格式化过关方式
  formatPassTypes(passTypes) {
    if (!passTypes || !Array.isArray(passTypes)) return ''
    const map = {
      'single': '单关',
      '2_1': '2串1',
      '3_1': '3串1',
      '4_1': '4串1',
      '5_1': '5串1',
      '6_1': '6串1'
    }
    return passTypes.map(p => map[p] || p).join('/')
  },

  // 点击记录进入详情
  onRecordTap(e) {
    const record = e.currentTarget.dataset.record
    if (!record || !record.id) return

    // 登录拦截
    if (!userStore.isLoggedIn()) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return
    }

    wx.navigateTo({
      url: `/pages/calculator-detail/index?id=${record.id}&from=hall`
    })
  },

  // 重试加载
  onRetry() {
    this.loadRecommendations()
  },

  // 切换排行榜展开/折叠
  onToggleRank() {
    this.setData({
      rankExpanded: !this.data.rankExpanded
    })
  },

  // 切换排行榜类型
  onSwitchRankType(e) {
    const type = e.currentTarget.dataset.type
    if (type !== this.data.rankType) {
      this.setData({ rankType: type })
    }
  },

  // 分享给好友
  onShareAppMessage() {
    return {
      title: '分享大厅 - 查看高手的中奖方案',
      path: '/pages/calculator-hall/index'
    }
  },

  // 跳转单关斩龙计划
  onDragonAnalysis() {
    // 如果是在拖动，则不跳转
    if (this.data.isDragging) return

    // 登录拦截
    if (!userStore.isLoggedIn()) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return
    }

    wx.navigateTo({
      url: '/pages/dragon-analysis/index'
    })
  },

  // 浮动按钮 - 触摸开始
  onDragonBtnTouchStart(e) {
    const touch = e.touches[0]
    this.setData({
      dragStartX: touch.clientX - this.data.dragX,
      dragStartY: touch.clientY - this.data.dragY,
      isDragging: true
    })
  },

  // 浮动按钮 - 触摸移动
  onDragonBtnTouchMove(e) {
    if (!this.data.isDragging) return

    const touch = e.touches[0]
    const windowWidth = wx.getSystemInfoSync().windowWidth
    const windowHeight = wx.getSystemInfoSync().windowHeight
    const btnWidth = 80 // 浮动按钮宽度
    const btnHeight = 80 // 浮动按钮高度

    let newX = touch.clientX - this.data.dragStartX
    let newY = touch.clientY - this.data.dragStartY

    // 限制边界
    newX = Math.max(0, Math.min(newX, windowWidth - btnWidth))
    newY = Math.max(0, Math.min(newY, windowHeight - btnHeight))

    this.setData({
      dragX: newX,
      dragY: newY
    })
  },

  // 浮动按钮 - 触摸结束
  onDragonBtnTouchEnd(e) {
    this.setData({
      isDragging: false
    })
  },

  // ========== Tab 切换 ==========
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.currentTab) return

    this.setData({ currentTab: tab })

    // 切换到数据发现时加载联赛列表
    if (tab === 'discovery' && this.data.leagues.length === 0) {
      this.loadLeagues()
    }
  },

  // ========== 数据发现相关方法 ==========

  // 加载联赛列表
  async loadLeagues() {
    this.setData({ leaguesLoading: true, leaguesError: null })

    try {
      const leagueApi = require('../../api/league')
      const leagues = await leagueApi.getLeagueList()
      // 过滤启用的联赛，并添加首字母
      const activeLeagues = (leagues || [])
        .filter(item => item.status === 1)
        .map(item => ({
          ...item,
          firstChar: (item.leagueAbbrCnName || item.leagueName || '').substring(0, 1)
        }))

      // 分类：热门联赛和其他联赛
      const hotLeagues = activeLeagues
        .filter(item => item.leagueCategory === 'hot')
        .sort((a, b) => (a.displaySort || 999) - (b.displaySort || 999))

      const otherLeagues = activeLeagues
        .filter(item => item.leagueCategory !== 'hot')
        .sort((a, b) => (a.displaySort || 999) - (b.displaySort || 999))

      this.setData({
        leagues: activeLeagues,
        hotLeagues,
        otherLeagues,
        leaguesLoading: false
      })
    } catch (e) {
      console.error('加载联赛列表失败:', e)
      this.setData({
        leaguesLoading: false,
        leaguesError: e.message || '加载失败'
      })
    }
  },

  // 选择联赛
  async onSelectLeague(e) {
    const league = e.currentTarget.dataset.league
    if (!league) return

    // 如果点击的是已选中的联赛，取消选中
    if (this.data.selectedLeague && this.data.selectedLeague.id === league.id) {
      this.setData({
        selectedLeague: null,
        seasons: [],
        selectedSeason: null,
        standings: []
      })
      return
    }

    this.setData({
      selectedLeague: league,
      seasons: [],
      selectedSeason: null,
      standings: [],
      seasonsLoading: true
    })

    try {
      const leagueApi = require('../../api/league')
      const seasons = await leagueApi.getSeasonList(league.id)
      // 按年份倒序排列
      const sortedSeasons = (seasons || [])
        .filter(item => item.status === 1)
        .sort((a, b) => (b.seasonYear || 0) - (a.seasonYear || 0))

      this.setData({
        seasons: sortedSeasons,
        seasonsLoading: false
      })

      // 默认选中第一个赛季
      if (sortedSeasons.length > 0) {
        this.onSelectSeason({ currentTarget: { dataset: { season: sortedSeasons[0] } } })
      }
    } catch (e) {
      console.error('加载赛季列表失败:', e)
      this.setData({ seasonsLoading: false })
      wx.showToast({ title: '加载赛季失败', icon: 'none' })
    }
  },

  // 选择赛季
  async onSelectSeason(e) {
    const season = e.currentTarget.dataset.season
    if (!season) return

    const { selectedLeague, standingType } = this.data

    this.setData({
      selectedSeason: season,
      allStandings: [],
      standings: [],
      standingsLoading: true
    })

    try {
      const leagueApi = require('../../api/league')
      const standings = await leagueApi.getStanding(selectedLeague.id, season.id)
      // 缓存所有数据
      const allStandings = (standings || []).filter(item => item.status === 1)
      // 过滤出当前排名类型的数据
      const filteredStandings = this.filterStandings(allStandings, standingType)

      this.setData({
        allStandings,
        standings: filteredStandings,
        standingsLoading: false
      })
    } catch (e) {
      console.error('加载排名数据失败:', e)
      this.setData({ standingsLoading: false })
      wx.showToast({ title: '加载排名失败', icon: 'none' })
    }
  },

  // 过滤排名数据
  filterStandings(allStandings, type) {
    return allStandings
      .filter(item => item.tableType === type)
      .sort((a, b) => (a.ranking || 999) - (b.ranking || 999))
  },

  // 切换排名类型（本地过滤，无需请求）
  onStandingTypeChange(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.standingType) return

    const { allStandings } = this.data
    const filteredStandings = this.filterStandings(allStandings, type)

    this.setData({
      standingType: type,
      standings: filteredStandings
    })
  },

  // 重试加载联赛
  onRetryLeagues() {
    this.loadLeagues()
  },

  // 切换全部联赛展开/折叠
  onToggleOtherLeagues() {
    this.setData({
      otherLeaguesExpanded: !this.data.otherLeaguesExpanded
    })
  }
})
