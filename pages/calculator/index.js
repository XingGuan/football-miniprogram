// pages/calculator/index.js - 混合过关计算器
const matchApi = require('../../api/match')
const userStore = require('../../store/user')

Page({
  data: {
    currentTab: 'play', // play: 模拟投注, records: 我的记录
    matches: [],
    loading: true,
    error: null,
    selections: {},
    selectedMap: {},
    selectedCount: 0,
    singleAvailable: false,
    passTypes: [
      { value: 'single', label: '单关', min: 1 },
      { value: '2_1', label: '2串1', min: 2 },
      { value: '3_1', label: '3串1', min: 3 },
      { value: '4_1', label: '4串1', min: 4 },
      { value: '5_1', label: '5串1', min: 5 },
      { value: '6_1', label: '6串1', min: 6 }
    ],
    selectedPassTypes: [],
    multiple: 1,
    totalBets: 0,
    totalAmount: 0,
    minBonus: 0,
    maxBonus: 0,
    showMorePlays: false,
    currentMatch: null,
    // 记录相关
    records: [],
    recordsLoading: false,
    // 左滑删除相关
    touchStartX: 0,
    touchStartY: 0,
    currentSwipeIndex: -1
  },

  onLoad() {
    this.loadMatches()
    this.loadRecords()
  },

  onShow() {
    // 每次显示时刷新记录
    this.loadRecords()
  },

  // 切换Tab
  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.currentTab) return
    this.setData({ currentTab: tab })
    if (tab === 'records') {
      this.loadRecords()
    }
  },

  // 加载用户记录
  async loadRecords() {
    const userInfo = userStore.getUserInfo()
    if (!userInfo || !userInfo.id) {
      this.setData({ records: [] })
      return
    }

    this.setData({ recordsLoading: true })
    try {
      const res = await matchApi.getCalculatorRecords(userInfo.id)
      const rawRecords = res.data || res || []
      const records = rawRecords.map(item => ({
        ...item,
        matchCount: item.matchDetails ? item.matchDetails.length : 0,
        passTypesStr: this.formatPassTypes(item.passTypes),
        createTimeStr: this.formatTime(item.createTime)
      }))
      this.setData({ records, recordsLoading: false })
    } catch (error) {
      console.error('加载记录失败:', error)
      this.setData({ records: [], recordsLoading: false })
    }
  },

  // 格式化时间
  formatTime(timeStr) {
    if (!timeStr) return ''
    // 处理ISO格式时间 "2026-03-24T18:40:12"
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
    // 如果正在滑动状态，不跳转
    if (record && record.swiped) {
      this.resetAllSwipe()
      return
    }
    if (!record || !record.id) return
    wx.navigateTo({
      url: `/pages/calculator-detail/index?id=${record.id}`
    })
  },

  // 触摸开始
  onTouchStart(e) {
    this.touchStartX = e.touches[0].clientX
    this.touchStartY = e.touches[0].clientY
    this.touchStartTime = Date.now()
  },

  // 触摸移动
  onTouchMove(e) {
    const touchX = e.touches[0].clientX
    const touchY = e.touches[0].clientY
    const deltaX = touchX - this.touchStartX
    const deltaY = touchY - this.touchStartY

    // 判断是否为水平滑动
    if (Math.abs(deltaX) < Math.abs(deltaY)) return

    const index = e.currentTarget.dataset.index
    const records = this.data.records

    // 先重置其他项的滑动状态
    records.forEach((item, i) => {
      if (i !== index && item.swiped) {
        item.swiped = false
      }
    })

    // 左滑显示删除按钮
    if (deltaX < -50) {
      records[index].swiped = true
    } else if (deltaX > 50) {
      records[index].swiped = false
    }

    this.setData({ records })
  },

  // 触摸结束
  onTouchEnd(e) {
    // 处理点击事件（快速触摸）
    const duration = Date.now() - this.touchStartTime
    if (duration < 200) {
      const touchX = e.changedTouches[0].clientX
      const deltaX = Math.abs(touchX - this.touchStartX)
      if (deltaX < 10) {
        // 这是点击，不是滑动
        return
      }
    }
  },

  // 重置所有滑动状态
  resetAllSwipe() {
    const records = this.data.records.map(item => ({
      ...item,
      swiped: false
    }))
    this.setData({ records })
  },

  // 删除记录
  async onDeleteRecord(e) {
    const { id, index } = e.currentTarget.dataset

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...', mask: true })
            await matchApi.deleteCalculatorRecord(id)
            wx.hideLoading()

            // 从列表中移除
            const records = this.data.records.filter((_, i) => i !== index)
            this.setData({ records })

            wx.showToast({ title: '删除成功', icon: 'success' })
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  async loadMatches() {
    this.setData({ loading: true, error: null })
    try {
      const res = await matchApi.getCalculatorMatches()
      const matches = res.data || res || []
      this.setData({ matches, loading: false })
    } catch (error) {
      console.error('加载比赛数据失败:', error)
      this.setData({ loading: false, error: error.message || '加载失败' })
    }
  },

  onSelectOption(e) {
    const { matchid, type, value, odds } = e.currentTarget.dataset
    this.toggleSelection(matchid, type, value, this.parseOdds(odds))
  },

  // 解析赔率（处理字符串格式）
  parseOdds(odds) {
    if (typeof odds === 'number') return odds
    if (typeof odds === 'string') return parseFloat(odds) || 0
    return 0
  },

  // 检查选中的比赛中是否有支持单关的（只有had和hhad需要检查bettingSingle）
  checkSingleAvailable(selectedMatchIds) {
    const { matches, selections } = this.data

    for (const matchId of selectedMatchIds) {
      const match = matches.find(m => String(m.matchId) === String(matchId))
      const matchSelections = selections[matchId] || []

      for (const sel of matchSelections) {
        // had和hhad需要检查bettingSingle
        if (sel.type === 'had' || sel.type === 'hhad') {
          if (match && match.bettingSingle == 1) {
            return true
          }
        } else {
          // 其他玩法（crs、ttg、hafu）不受bettingSingle限制，直接支持单关
          return true
        }
      }
    }
    return false
  },

  toggleSelection(matchId, type, value, odds) {
    const { selections, selectedMap } = this.data
    if (!selections[matchId]) selections[matchId] = []

    const key = `${matchId}_${type}_${value}`
    const index = selections[matchId].findIndex(item => item.type === type && item.value === value)

    if (index > -1) {
      selections[matchId].splice(index, 1)
      if (selections[matchId].length === 0) delete selections[matchId]
      delete selectedMap[key]
    } else {
      selections[matchId].push({ type, value, odds })
      selectedMap[key] = true
    }

    const selectedCount = Object.keys(selections).length

    // 检查是否有支持单关的比赛被选中
    const singleAvailable = this.checkSingleAvailable(Object.keys(selections))

    this.setData({ selections, selectedMap, selectedCount, singleAvailable })
    this.calculateBets()
  },

  onMorePlays(e) {
    const match = e.currentTarget.dataset.match
    if (!match) return
    this.setData({ showMorePlays: true, currentMatch: match })
  },

  onCloseMorePlays() {
    this.setData({ showMorePlays: false, currentMatch: null })
  },

  onPreventTap() {},

  onSelectScore(e) {
    const { score, odds } = e.currentTarget.dataset
    const matchId = this.data.currentMatch.matchId
    this.toggleSelection(matchId, 'crs', score, this.parseOdds(odds))
  },

  onSelectGoal(e) {
    const { goal, odds } = e.currentTarget.dataset
    const matchId = this.data.currentMatch.matchId
    this.toggleSelection(matchId, 'ttg', goal, this.parseOdds(odds))
  },

  onSelectHafu(e) {
    const { hafu, odds } = e.currentTarget.dataset
    const matchId = this.data.currentMatch.matchId
    this.toggleSelection(matchId, 'hafu', hafu, this.parseOdds(odds))
  },

  onSelectPassType(e) {
    const { value, min } = e.currentTarget.dataset
    const { selectedPassTypes, selectedCount, singleAvailable } = this.data

    // 单关需要检查是否有支持单关的比赛被选中
    if (value === 'single') {
      if (!singleAvailable) {
        wx.showToast({ title: '当前选中的比赛不支持单关', icon: 'none' })
        return
      }
    } else if (selectedCount < min) {
      wx.showToast({ title: `需要至少选择${min}场比赛`, icon: 'none' })
      return
    }

    const index = selectedPassTypes.indexOf(value)
    if (index > -1) {
      selectedPassTypes.splice(index, 1)
    } else {
      selectedPassTypes.push(value)
    }

    this.setData({ selectedPassTypes })
    this.calculateBets()
  },

  onMultipleChange(e) {
    const multiple = parseInt(e.detail.value) || 1
    this.setData({ multiple: Math.max(1, Math.min(99, multiple)) })
    this.calculateBets()
  },

  onMultipleMinus() {
    const multiple = Math.max(1, this.data.multiple - 1)
    this.setData({ multiple })
    this.calculateBets()
  },

  onMultiplePlus() {
    const multiple = Math.min(99, this.data.multiple + 1)
    this.setData({ multiple })
    this.calculateBets()
  },

  calculateBets() {
    const { selections, selectedPassTypes, multiple } = this.data
    const matchIds = Object.keys(selections)
    const selectedCount = matchIds.length

    if (selectedCount === 0 || selectedPassTypes.length === 0) {
      this.setData({ totalBets: 0, totalAmount: 0, minBonus: 0, maxBonus: 0 })
      return
    }

    let totalBets = 0
    let minOdds = []
    let maxOdds = []

    selectedPassTypes.forEach(passType => {
      const bets = this.calculatePassTypeBets(passType, matchIds, selections)
      totalBets += bets.count
      minOdds = minOdds.concat(bets.minOdds)
      maxOdds = maxOdds.concat(bets.maxOdds)
    })

    // 过滤掉无效的赔率值
    minOdds = minOdds.filter(o => o > 0)
    maxOdds = maxOdds.filter(o => o > 0)

    const minBonus = minOdds.length > 0 ? Math.min(...minOdds) * 2 * multiple : 0
    const maxBonus = maxOdds.length > 0 ? Math.max(...maxOdds) * 2 * multiple : 0
    const totalAmount = totalBets * multiple * 2

    this.setData({
      totalBets,
      totalAmount,
      minBonus: minBonus.toFixed(2),
      maxBonus: maxBonus.toFixed(2)
    })
  },

  calculatePassTypeBets(passType, matchIds, selections) {
    if (passType === 'single') {
      // 单关计算：had/hhad需要检查bettingSingle，其他玩法直接支持
      const { matches } = this.data
      let count = 0
      let allOdds = []

      matchIds.forEach(matchId => {
        const match = matches.find(m => String(m.matchId) === String(matchId))
        const matchSelections = selections[matchId] || []

        matchSelections.forEach(sel => {
          // had和hhad需要bettingSingle==1才能单关
          if (sel.type === 'had' || sel.type === 'hhad') {
            if (match && match.bettingSingle == 1) {
              count++
              if (sel.odds > 0) allOdds.push(sel.odds)
            }
          } else {
            // 其他玩法（crs、ttg、hafu）不受限制
            count++
            if (sel.odds > 0) allOdds.push(sel.odds)
          }
        })
      })

      if (count === 0) return { count: 0, minOdds: [0], maxOdds: [0] }
      if (allOdds.length === 0) return { count, minOdds: [0], maxOdds: [0] }
      return { count, minOdds: [Math.min(...allOdds)], maxOdds: [Math.max(...allOdds)] }
    }

    const [m] = passType.split('_').map(Number)
    if (matchIds.length < m) return { count: 0, minOdds: [0], maxOdds: [0] }

    const combinations = this.getCombinations(matchIds, m)
    let totalCount = 0
    let allMinOdds = []
    let allMaxOdds = []

    combinations.forEach(combo => {
      let comboCount = 1
      combo.forEach(matchId => { comboCount *= selections[matchId].length })

      const comboOdds = combo.map(matchId => {
        const odds = selections[matchId].map(s => s.odds).filter(o => o > 0)
        return odds.length > 0 ? odds : [1]
      })

      const minOddsProduct = comboOdds.reduce((product, odds) => product * Math.min(...odds), 1)
      const maxOddsProduct = comboOdds.reduce((product, odds) => product * Math.max(...odds), 1)

      totalCount += comboCount
      allMinOdds.push(minOddsProduct)
      allMaxOdds.push(maxOddsProduct)
    })

    return { count: totalCount, minOdds: allMinOdds, maxOdds: allMaxOdds }
  },

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

  async onSubmit() {
    const { selections, selectedPassTypes, multiple, totalBets } = this.data

    if (Object.keys(selections).length === 0) {
      wx.showToast({ title: '请至少选择一场比赛', icon: 'none' })
      return
    }
    if (selectedPassTypes.length === 0) {
      wx.showToast({ title: '请选择过关方式', icon: 'none' })
      return
    }

    // 获取用户ID
    const userInfo = userStore.getUserInfo()
    if (!userInfo || !userInfo.id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const saveData = {
      userId: userInfo.id,
      selections: Object.keys(selections).map(matchId => ({
        matchId: parseInt(matchId),
        options: selections[matchId]
      })),
      passTypes: selectedPassTypes,
      multiple,
      totalBets
    }

    try {
      wx.showLoading({ title: '提交中...' })
      await matchApi.saveCalculatorSelection(saveData)
      wx.hideLoading()

      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 1500
      })

      // 清空选择
      this.setData({
        selections: {},
        selectedMap: {},
        selectedPassTypes: [],
        selectedCount: 0,
        singleAvailable: false,
        multiple: 1,
        totalBets: 0,
        totalAmount: 0,
        minBonus: 0,
        maxBonus: 0
      })

      // 刷新记录列表并切换到记录tab
      await this.loadRecords()
      this.setData({ currentTab: 'records' })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: error.message || '提交失败', icon: 'none' })
    }
  },

  onRetry() {
    this.loadMatches()
  }
})
