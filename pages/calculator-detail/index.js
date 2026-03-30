// pages/calculator-detail/index.js - 模拟选号记录详情
const matchApi = require('../../api/match')
const userStore = require('../../store/user')

Page({
  data: {
    recordId: null,
    record: null,
    loading: true,
    error: null,
    recommending: false,
    isFromHall: false // 是否从大厅来
  },

  onLoad(options) {
    console.log('详情页 onLoad, options:', options)
    const id = options.id
    const from = options.from
    if (!id) {
      this.setData({ loading: false, error: '参数错误' })
      return
    }
    this.setData({
      recordId: id,
      isFromHall: from === 'hall'
    })
   
    this.loadRecord(id)
  },

  // 直接调用API获取记录
  async loadRecord(id) {
    try {
      const res = await matchApi.getCalculatorRecords(id)
      const records = res.data || res || []
      

      const record = records.find(r => String(r.id) === String(id))
      console.log('找到记录:', record)

      if (record) {
        this.processRecord(record)
      } else {
        this.setData({ loading: false, error: '记录不存在' })
      }
    } catch (err) {
      console.error('加载记录失败:', err)
      this.setData({ loading: false, error: '加载失败' })
    }
  },

  // 处理记录数据
  processRecord(record) {
    // 深拷贝，避免修改原数据
    const data = JSON.parse(JSON.stringify(record))

    // 格式化过关方式
    data.passTypesStr = this.formatPassTypes(data.passTypes)
    // 格式化时间
    data.createTimeStr = this.formatTime(data.createTime)
    // 计算预计奖金范围
    data.bonusRange = this.calculateBonusRange(data)

    // 处理比赛详情中的选项显示
    if (data.matchDetails) {
      data.matchDetails = data.matchDetails.map(match => ({
        ...match,
        options: (match.options || []).map(opt => ({
          ...opt,
          displayValue: this.getValueName(opt.optionType, opt.optionValue),
          isHit: opt.isHit === 1
        })),
      }))
    }

    // 计算实际中奖金额
    data.actualBonus = this.calculateActualBonus(data)

    this.setData({ record: data, loading: false })
  },

// 计算实际中奖金额
  calculateActualBonus(record) {
    if (record.status !== 1) return 0
    if (!record.matchDetails || record.matchDetails.length === 0) return 0

    const multiple = record.multiple || 1
    const passTypes = record.passTypes || []

    // 收集所有命中的选项
    let hitOptions = []
    for (const match of record.matchDetails) {
      if (!match.options) continue
      for (const opt of match.options) {
        if (opt.isHit === true) {
          hitOptions.push(opt.odds || 1)
        }
      }
    }
    if (hitOptions.length === 0) return 0

    let totalBonus = 0

    // 如果包含单关，每个命中选项单独计算
    if (passTypes.includes('single')) {
      for (const odds of hitOptions) {
        totalBonus += odds * 2 * multiple
      }
    } else {
      // 串关：所有命中赔率相乘
      let totalOdds = 1
      for (const odds of hitOptions) {
        totalOdds *= odds
      }
      totalBonus = totalOdds * 2 * multiple
    }

    return totalBonus.toFixed(2)
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
    return passTypes.map(p => map[p] || p).join(' / ')
  },

  // 格式化时间
  formatTime(timeStr) {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  // 计算预计奖金范围（参考选号页面的计算逻辑）
  // 最大奖金考虑互斥：同一场比赛同一玩法类型只能命中一个结果
  calculateBonusRange(record) {
    if (!record.matchDetails || record.matchDetails.length === 0) return ''

    const multiple = record.multiple || 1
    const passTypes = record.passTypes || []
    const matchDetails = record.matchDetails

    if (passTypes.length === 0) return ''

    // 构建选项数据
    const selections = {}
    const matchIds = []

    matchDetails.forEach(match => {
      const matchId = String(match.matchId)
      matchIds.push(matchId)
      selections[matchId] = (match.options || []).map(opt => ({
        type: opt.optionType,
        value: opt.optionValue,
        odds: opt.odds || 1
      }))
    })

    // 计算最小奖金：所有单注组合中最小的
    let allBonusResults = []
    passTypes.forEach(passType => {
      const bonusResults = this.calculatePassTypeBonusResults(passType, matchIds, selections)
      allBonusResults = allBonusResults.concat(bonusResults)
    })

    if (allBonusResults.length === 0) return ''
    const validResults = allBonusResults.filter(r => r > 0)
    if (validResults.length === 0) return ''

    const minBonus = (Math.min(...validResults) * 2 * multiple).toFixed(2)

    // 计算最大奖金：
    // 1. 确定最优命中选项：每场比赛取赔率最高的选项作为"命中选项"
    // 2. 对于每张票（每条玩法路径），计算在这种命中情况下的奖金
    //    - 票上包含命中选项的组合才算中奖
    // 3. 所有票的奖金加起来

    // 确定每场的最优命中选项
    const hitSelections = {}
    matchIds.forEach(matchId => {
      const allOpts = selections[matchId] || []
      if (allOpts.length === 0) return
      const maxOddsOpt = allOpts.reduce((max, opt) => opt.odds > max.odds ? opt : max, allOpts[0])
      hitSelections[matchId] = maxOddsOpt
    })

    // 计算所有票在最优命中情况下的奖金
    let maxTotalBonus = 0
    passTypes.forEach(passType => {
      const bonus = this.calculateMaxBonusForPassType(passType, matchIds, selections, hitSelections)
      maxTotalBonus += bonus
    })

    const maxBonus = (maxTotalBonus * 2 * multiple).toFixed(2)

    return `${minBonus} ~ ${maxBonus}`
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

  // 计算某种过关方式的奖金结果
  calculatePassTypeBonusResults(passType, matchIds, selections) {
    if (passType === 'single') {
      // 单关：每个选项独立计算
      let bonusResults = []
      matchIds.forEach(matchId => {
        const matchSelections = selections[matchId] || []
        matchSelections.forEach(sel => {
          if (sel.odds > 0) bonusResults.push(sel.odds)
        })
      })
      return bonusResults
    }

    // 串关计算
    const [m] = passType.split('_').map(Number)
    if (matchIds.length < m) return []

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

    // 获取所有可能的"玩法路径"
    const playTypePaths = this.getPlayTypePaths(matchIds, matchPlayTypes)

    let bonusResults = []

    playTypePaths.forEach(path => {
      const pathSelections = {}
      matchIds.forEach(matchId => {
        const playType = path[matchId]
        pathSelections[matchId] = matchPlayTypes[matchId][playType]
      })

      // 获取m场组合
      const matchCombinations = this.getCombinations(matchIds, m)

      matchCombinations.forEach(combo => {
        const oddsComboList = this.getOddsCombinationsForPath(combo, pathSelections)
        oddsComboList.forEach(oddsList => {
          const product = oddsList.reduce((p, o) => p * o, 1)
          if (product > 0) bonusResults.push(product)
        })
      })
    })

    return bonusResults
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

  // 获取选项值显示名称
  getValueName(type, value) {
    // 胜平负、让球胜平负
    if (type === 'had' || type === 'hhad') {
      const map = { 'H': '主胜', 'D': '平局', 'A': '客胜' }
      return map[value] || value
    }
    // 总进球
    if (type === 'ttg') {
      return value === '7' ? '7+球' : `${value}球`
    }
    // 半全场
    if (type === 'hafu') {
      const map = {
        'HH': '胜-胜', 'HD': '胜-平', 'HA': '胜-负',
        'DH': '平-胜', 'DD': '平-平', 'DA': '平-负',
        'AH': '负-胜', 'AD': '负-平', 'AA': '负-负'
      }
      return map[value] || value
    }
    // 比分直接返回
    return value
  },

  // 推荐方案
  async onRecommend() {
    const { record } = this.data
    if (!record) {
      wx.showToast({
        title: '记录不存在',
        icon: 'error'
      })
      return
    }

    this.setData({ recommending: true })

    try {
      const res = await matchApi.recommendCalculatorRecord(record.id)
      this.setData({ recommending: false })

      wx.showToast({
        title: '推荐成功',
        icon: 'success'
      })
    } catch (err) {
      console.error('推荐失败:', err)
      this.setData({ recommending: false })

      wx.showToast({
        title: err.message || '推荐失败',
        icon: 'error'
      })
    }
  },

  // 分享给好友
  onShareAppMessage() {
    const { record } = this.data
    if (!record) {
      return {
        title: '我的模拟选号方案',
        path: '/pages/calculator/index'
      }
    }

    const matchCount = record.matchDetails ? record.matchDetails.length : 0
    const statusText = record.status === 1 ? '中奖啦！' : record.status === 2 ? '未中奖' : '待开奖'

    return {
      title: `${statusText} ${matchCount}场比赛 ${record.passTypesStr}`,
      path: `/pages/calculator-detail/index?id=${record.id}`
    }
  }
})
