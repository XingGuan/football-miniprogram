// pages/calculator/index.js - 混合过关计算器
const matchApi = require('../../api/match')
const userStore = require('../../store/user')

Page({
  data: {
    currentTab: 'play', // play: 模拟选号, records: 我的记录
    matches: [],
    loading: true,
    error: null,
    selections: {},
    selectedMap: {},
    selectedCount: 0,
    // 所有过关方式定义
    allPassTypes: [
      { value: 'single', label: '单关', min: 1, max: 1 },
      { value: '2_1', label: '2串1', min: 2, max: 8 },
      { value: '3_1', label: '3串1', min: 3, max: 8 },
      { value: '4_1', label: '4串1', min: 4, max: 8 },
      { value: '5_1', label: '5串1', min: 5, max: 8 },
      { value: '6_1', label: '6串1', min: 6, max: 8 },
      { value: '7_1', label: '7串1', min: 7, max: 8 },
      { value: '8_1', label: '8串1', min: 8, max: 8 }
    ],
    // 动态可用的过关方式
    availablePassTypes: [],
    selectedPassTypes: [],
    selectedPassTypesMap: {},  // 用于模板中判断选中状态
    multiple: 1,
    multipleInput: '1',
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
  },

  onShow() {
    // 每次显示时，如果已经在记录tab，则刷新记录
    if (this.data.currentTab === 'records') {
      this.loadRecords()
    }
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
      const records = rawRecords.map(item => {
        const timeInfo = this.formatTimeInfo(item.createTime)
        return {
          ...item,
          matchCount: item.matchDetails ? item.matchDetails.length : 0,
          passTypesStr: this.formatPassTypes(item.passTypes),
          createTimeStr: this.formatTime(item.createTime),
          monthDay: timeInfo.monthDay,
          hourMinute: timeInfo.hourMinute
        }
      })
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

  // 格式化时间信息（拆分月日和时分）
  formatTimeInfo(timeStr) {
    if (!timeStr) return { monthDay: '', hourMinute: '' }
    const date = new Date(timeStr)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return {
      monthDay: `${month}-${day}`,
      hourMinute: `${hour}:${minute}`
    }
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

  // 检查是否支持单关
  // 规则：只有当所有选中的选项都支持单关时，才能选择单关
  // had需要bettingSingle，hhad需要bettingAllUp，crs/ttg/hafu默认支持
  checkSingleAvailable() {
    const { matches, selections } = this.data
    const matchIds = Object.keys(selections)

    if (matchIds.length === 0) return false

    // 检查所有选中的选项是否都支持单关
    for (const matchId of matchIds) {
      const match = matches.find(m => String(m.matchId) === String(matchId))
      const matchSelections = selections[matchId] || []

      for (const sel of matchSelections) {
        // 检查这个选项是否支持单关
        if (!this.canOptionSingleBet(match, sel)) {
          // 只要有一个选项不支持单关，就不能选择单关
          return false
        }
      }
    }
    // 所有选项都支持单关
    return true
  },

  // 检查单个选项是否支持单关
  canOptionSingleBet(match, sel) {
    if (!match) return false

    // crs、ttg、hafu 默认支持单关
    if (sel.type === 'crs' || sel.type === 'ttg' || sel.type === 'hafu') {
      return true
    }
    // had需要bettingSingle
    if (sel.type === 'had') {
      return match.bettingSingle == 1 || match.bettingSingle === true
    }
    // hhad需要bettingAllUp
    if (sel.type === 'hhad') {
      return match.bettingAllUp == 1 || match.bettingAllUp === true
    }
    return false
  },

  // 更新可用的过关方式
  updateAvailablePassTypes() {
    const { selections, allPassTypes, selectedPassTypes } = this.data
    const matchIds = Object.keys(selections)
    const matchCount = matchIds.length

    if (matchCount === 0) {
      this.setData({ availablePassTypes: [], selectedPassTypes: [] })
      return
    }

    const singleAvailable = this.checkSingleAvailable()
    const availablePassTypes = []

    allPassTypes.forEach(pt => {
      if (pt.value === 'single') {
        // 单关：需要检查是否有支持单关的选项
        if (singleAvailable) {
          availablePassTypes.push(pt)
        }
      } else {
        // 串关：场次数需要满足最小要求
        if (matchCount >= pt.min) {
          availablePassTypes.push(pt)
        }
      }
    })

    // 过滤掉已选但现在不可用的过关方式
    const validSelectedPassTypes = selectedPassTypes.filter(pt =>
      availablePassTypes.some(apt => apt.value === pt)
    )

    // 更新选中状态的 map
    const selectedPassTypesMap = {}
    validSelectedPassTypes.forEach(pt => {
      selectedPassTypesMap[pt] = true
    })

    this.setData({ availablePassTypes, selectedPassTypes: validSelectedPassTypes, selectedPassTypesMap })
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

    this.setData({ selections, selectedMap, selectedCount })
    // 更新可用的过关方式
    this.updateAvailablePassTypes()
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
    const { value } = e.currentTarget.dataset
    const { selectedPassTypes, selectedPassTypesMap } = this.data

    const index = selectedPassTypes.indexOf(value)
    if (index > -1) {
      selectedPassTypes.splice(index, 1)
      delete selectedPassTypesMap[value]
    } else {
      selectedPassTypes.push(value)
      selectedPassTypesMap[value] = true
    }

    this.setData({ selectedPassTypes, selectedPassTypesMap })
    this.calculateBets()
  },

  // 输入倍数时，允许临时为空
  onMultipleInput(e) {
    const value = e.detail.value
    this.setData({ multipleInput: value })
    // 如果输入有效数字，实时计算
    const num = parseInt(value)
    if (num > 0) {
      this.setData({ multiple: Math.min(5000, num) })
      this.calculateBets()
    }
  },

  // 失焦时校验，确保有效值
  onMultipleBlur(e) {
    const value = e.detail.value
    let multiple = parseInt(value) || 1
    multiple = Math.max(1, Math.min(5000, multiple))
    this.setData({ multiple, multipleInput: String(multiple) })
    this.calculateBets()
  },

  onMultipleMinus() {
    const multiple = Math.max(1, this.data.multiple - 1)
    this.setData({ multiple, multipleInput: String(multiple) })
    this.calculateBets()
  },

  onMultiplePlus() {
    const multiple = Math.min(5000, this.data.multiple + 1)
    this.setData({ multiple, multipleInput: String(multiple) })
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
    let allBonusResults = [] // 存储所有可能的奖金组合

    // 打印计算过程
  //  console.log('=== 注数计算 ===')
  //  console.log(`场次数: ${matchIds.length}`)
    matchIds.forEach(matchId => {
      const types = selections[matchId].map(s => s.type + ':' + s.value)
   //   console.log(`  场次${matchId}: ${types.join(', ')}`)
    })

    selectedPassTypes.forEach(passType => {
      const bets = this.calculatePassTypeBets(passType, matchIds, selections)
   //   console.log(`${passType}: ${bets.count}注`)
      totalBets += bets.count
      allBonusResults = allBonusResults.concat(bets.bonusResults)
    })
   //(`总计: ${totalBets}注, ${totalBets * 2 * multiple}元`)

    // 计算最小奖金：所有单注中最小的
    let minBonus = 0
    if (allBonusResults.length > 0) {
      const validResults = allBonusResults.filter(r => r > 0)
      if (validResults.length > 0) {
        minBonus = Math.min(...validResults) * 2 * multiple
      }
    }

    // 计算最大奖金：
    // 1. 确定最优命中选项：每场比赛取赔率最高的选项作为"命中选项"
    // 2. 对于每张票（每条玩法路径），计算在这种命中情况下的奖金
    // 3. 所有票的奖金加起来
    let maxBonus = 0
    const hitSelections = {}
    matchIds.forEach(matchId => {
      const allOpts = selections[matchId] || []
      if (allOpts.length === 0) return
      const maxOddsOpt = allOpts.reduce((max, opt) => opt.odds > max.odds ? opt : max, allOpts[0])
      hitSelections[matchId] = maxOddsOpt
    })

    // 计算所有票在最优命中情况下的奖金
    selectedPassTypes.forEach(passType => {
      const bonus = this.calculateMaxBonusForPassType(passType, matchIds, selections, hitSelections)
      maxBonus += bonus * 2 * multiple
    })

    const totalAmount = totalBets * multiple * 2

    this.setData({
      totalBets,
      totalAmount,
      minBonus: minBonus.toFixed(2),
      maxBonus: maxBonus.toFixed(2)
    })
  },

  // 检查某个选项是否支持单关（用于单关注数计算）
  canSingleBet(matchId, sel) {
    const { matches } = this.data
    const match = matches.find(m => String(m.matchId) === String(matchId))
    return this.canOptionSingleBet(match, sel)
  },

  calculatePassTypeBets(passType, matchIds, selections) {
    if (passType === 'single') {
      // 单关计算：每个支持单关的选项算1注
      let count = 0
      let bonusResults = []

      matchIds.forEach(matchId => {
        const matchSelections = selections[matchId] || []
        matchSelections.forEach(sel => {
          if (this.canSingleBet(matchId, sel)) {
            count++
            if (sel.odds > 0) bonusResults.push(sel.odds)
          }
        })
      })

      return { count, bonusResults }
    }

    // 串关计算（按实际打印彩票方式计算）
    const [m] = passType.split('_').map(Number)
    if (matchIds.length < m) return { count: 0, bonusResults: [] }

    // 按玩法类型分组每场的选项
    const matchPlayTypes = {}
    matchIds.forEach(matchId => {
      matchPlayTypes[matchId] = {}
      const matchSelections = selections[matchId] || []
      matchSelections.forEach(sel => {
        if (!matchPlayTypes[matchId][sel.type]) {
          matchPlayTypes[matchId][sel.type] = []
        }
        matchPlayTypes[matchId][sel.type].push(sel)
      })
    })

    // 获取所有可能的"玩法路径"（每场选择一种玩法类型）
    const playTypePaths = this.getPlayTypePaths(matchIds, matchPlayTypes)

    let totalCount = 0
    let bonusResults = []

    // 对每种玩法路径计算注数
    playTypePaths.forEach(path => {
      // path: { matchId1: 'had', matchId2: 'hhad', ... }

      // 计算这条路径下每场的选项数
      const pathSelections = {}
      matchIds.forEach(matchId => {
        const playType = path[matchId]
        pathSelections[matchId] = matchPlayTypes[matchId][playType]
      })

      // 计算这条路径的注数（同一玩法内的多选项用乘法）
      const matchCombinations = this.getCombinations(matchIds, m)

      matchCombinations.forEach(combo => {
        let comboCount = 1
        combo.forEach(matchId => {
          comboCount *= pathSelections[matchId].length
        })
        totalCount += comboCount

        // 计算赔率组合
        const oddsComboList = this.getOddsCombinationsForPath(combo, pathSelections)
        oddsComboList.forEach(oddsList => {
          const product = oddsList.reduce((p, o) => p * o, 1)
          if (product > 0) bonusResults.push(product)
        })
      })
    })

    return { count: totalCount, bonusResults }
  },

  // 获取所有玩法路径组合
  getPlayTypePaths(matchIds, matchPlayTypes) {
    if (matchIds.length === 0) return [{}]

    const [first, ...rest] = matchIds
    const firstPlayTypes = Object.keys(matchPlayTypes[first])
    const restPaths = this.getPlayTypePaths(rest, matchPlayTypes)

    const result = []
    firstPlayTypes.forEach(playType => {
      restPaths.forEach(restPath => {
        result.push({
          ...restPath,
          [first]: playType
        })
      })
    })

    return result
  },

  // 获取某条路径下的赔率组合
  getOddsCombinationsForPath(matchIds, pathSelections) {
    if (matchIds.length === 0) return [[]]

    const [first, ...rest] = matchIds
    const firstOdds = pathSelections[first].map(s => s.odds).filter(o => o > 0)
    if (firstOdds.length === 0) firstOdds.push(1)

    const restCombinations = this.getOddsCombinationsForPath(rest, pathSelections)

    const result = []
    firstOdds.forEach(odds => {
      restCombinations.forEach(restOdds => {
        result.push([odds, ...restOdds])
      })
    })

    return result
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

  // 计算某种过关方式在最优命中情况下的最大奖金
  calculateMaxBonusForPassType(passType, matchIds, selections, hitSelections) {
    if (passType === 'single') {
      // 单关：只有命中选项的那一注中奖，但每场都有一注
      let bonus = 0
      matchIds.forEach(matchId => {
        const hitOpt = hitSelections[matchId]
        if (hitOpt && hitOpt.odds > 0) {
          bonus += hitOpt.odds
        }
      })
      return bonus
    }

    // 串关计算
    const [m] = passType.split('_').map(Number)
    if (matchIds.length < m) return 0

    // 按玩法类型分组每场的选项
    const matchPlayTypes = {}
    matchIds.forEach(matchId => {
      matchPlayTypes[matchId] = {}
      const matchSelections = selections[matchId] || []
      matchSelections.forEach(sel => {
        if (!matchPlayTypes[matchId][sel.type]) {
          matchPlayTypes[matchId][sel.type] = []
        }
        matchPlayTypes[matchId][sel.type].push(sel)
      })
    })

    // 获取所有玩法路径（每条路径代表一张票）
    const playTypePaths = this.getPlayTypePaths(matchIds, matchPlayTypes)

    let totalBonus = 0

    // 对于每张票，计算在最优命中情况下的奖金
    playTypePaths.forEach(path => {
      // 获取这张票上每场的选项
      const pathSelections = {}
      matchIds.forEach(matchId => {
        const playType = path[matchId]
        pathSelections[matchId] = matchPlayTypes[matchId][playType]
      })

      // 判断这张票上每场是否命中（票上的选项是否包含命中选项）
      const matchHitStatus = {}
      matchIds.forEach(matchId => {
        const hitOpt = hitSelections[matchId]
        const ticketOpts = pathSelections[matchId] || []
        // 检查票上的选项是否包含命中选项
        matchHitStatus[matchId] = ticketOpts.some(opt =>
          opt.type === hitOpt.type && opt.value === hitOpt.value
        )
      })

      // 获取m场组合
      const matchCombinations = this.getCombinations(matchIds, m)

      matchCombinations.forEach(combo => {
        // 检查这个组合中的所有场次是否都命中
        const allHit = combo.every(matchId => matchHitStatus[matchId])
        if (!allHit) return

        // 这个组合命中，计算奖金（使用命中选项的赔率）
        let product = 1
        combo.forEach(matchId => {
          product *= hitSelections[matchId].odds
        })
        totalBonus += product
      })
    })

    return totalBonus
  },

  // 构建完整的玩法选项（胜平负、让球胜平负包含所有选项及checked状态）
  buildFullOptions(matchId, selectedOptions) {
    const { matches } = this.data
    const match = matches.find(m => String(m.matchId) === String(matchId))
    if (!match) return selectedOptions.map(opt => ({ ...opt, checked: true }))

    const result = []
    const hasHad = selectedOptions.some(opt => opt.type === 'had')
    const hasHhad = selectedOptions.some(opt => opt.type === 'hhad')

    // 胜平负(had)：补全胜、平、负三个选项
    if (hasHad) {
      result.push(
        { type: 'had', value: 'H', odds: match.hadH, checked: selectedOptions.some(s => s.type === 'had' && s.value === 'H') },
        { type: 'had', value: 'D', odds: match.hadD, checked: selectedOptions.some(s => s.type === 'had' && s.value === 'D') },
        { type: 'had', value: 'A', odds: match.hadA, checked: selectedOptions.some(s => s.type === 'had' && s.value === 'A') }
      )
    }

    // 让球胜平负(hhad)：补全让球胜、让球平、让球负三个选项
    if (hasHhad) {
      result.push(
        { type: 'hhad', value: 'H', odds: match.hhadH, goalLine: match.hhadGoalLine, checked: selectedOptions.some(s => s.type === 'hhad' && s.value === 'H') },
        { type: 'hhad', value: 'D', odds: match.hhadD, goalLine: match.hhadGoalLine, checked: selectedOptions.some(s => s.type === 'hhad' && s.value === 'D') },
        { type: 'hhad', value: 'A', odds: match.hhadA, goalLine: match.hhadGoalLine, checked: selectedOptions.some(s => s.type === 'hhad' && s.value === 'A') }
      )
    }

    // 其他玩法保持原样，添加 checked: true
    selectedOptions.forEach(opt => {
      if (opt.type !== 'had' && opt.type !== 'hhad') {
        result.push({ ...opt, checked: true })
      }
    })

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
        options: this.buildFullOptions(matchId, selections[matchId])
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
        selectedPassTypesMap: {},
        availablePassTypes: [],
        selectedCount: 0,
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
