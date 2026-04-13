// pages/calculator-hall/index.js - 推荐方案大厅
const matchApi = require('../../api/match')
const userStore = require('../../store/user')

Page({
  data: {
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
    showDragon: false // 是否显示斩龙按钮
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
      rawRecords.forEach(item => {
        const userId = item.userId
        if (!userStats[userId]) {
          userStats[userId] = {
            userName: item.userName || `用户${userId}`,
            avatar: item.avatar || '',
            totalRecords: 0,
            winRecords: 0,
            loseRecords: 0,
            pendingRecords: 0,
            totalBonus: 0 // 总中奖金额
          }
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
        } else if (item.status === 2) {
          userStats[userId].loseRecords++
          userStats[userId].totalRecords++
        } else {
          userStats[userId].pendingRecords++
        }
      })

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

      console.log('中奖金额排行榜数据:', bonusRankList)
      console.log('用户统计:', userStats)
      this.setData({ recommendations, rankList, bonusRankList, loading: false, error: null })
    } catch (error) {
      console.error('加载推荐列表失败:', error)
      this.setData({ loading: false, error: '加载失败，请重试' })
    }
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
  }
})
