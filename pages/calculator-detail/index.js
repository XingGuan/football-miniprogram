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
    isFromHall: false, // 是否从大厅来
    exporting: false // 是否正在导出图片
  },

  onLoad(options) {
   //('详情页 onLoad, options:', options)
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
     //('找到记录:', record)

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
      data.matchDetails = data.matchDetails.map(match => {
        const options = (match.options || []).map(opt => ({
          ...opt,
          displayValue: this.getValueName(opt.optionType, opt.optionValue),
          isHit: opt.isHit === 1
        }))

        // 按玩法类型分组
        const optionGroups = this.groupOptionsByType(options)

        return {
          ...match,
          options,
          optionGroups
        }
      })
    }

    // 计算实际中奖金额
    data.actualBonus = this.calculateActualBonus(data)

    this.setData({ record: data, loading: false })
  },

// 计算实际中奖金额（只计算 checked=true 的选项）
  calculateActualBonus(record) {
    if (record.status !== 1) return 0
    if (!record.matchDetails || record.matchDetails.length === 0) return 0

    const multiple = record.multiple || 1
    const passTypes = record.passTypes || []

    // 收集所有选中且命中的选项
    let hitOptions = []
    for (const match of record.matchDetails) {
      if (!match.options) continue
      for (const opt of match.options) {
        // 只计算 checked=true 且命中的选项
        if (opt.checked !== false && opt.isHit === true) {
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

    // 构建选项数据（只计算 checked=true 的选项）
    const selections = {}
    const matchIds = []

    matchDetails.forEach(match => {
      const matchId = String(match.matchId)
      matchIds.push(matchId)
      // 只筛选 checked=true 的选项
      selections[matchId] = (match.options || [])
        .filter(opt => opt.checked !== false)
        .map(opt => ({
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

  // 按玩法类型分组选项
  groupOptionsByType(options) {
    const typeMap = {}
    const typeDescMap = {
      'had': '胜平负',
      'hhad': '让球胜平负',
      'crs': '比分',
      'ttg': '总进球',
      'hafu': '半全场'
    }

    options.forEach(opt => {
      const type = opt.optionType
      if (!typeMap[type]) {
        typeMap[type] = {
          type,
          typeDesc: opt.optionTypeDesc || typeDescMap[type] || type,
          goalLine: opt.goalLine,
          matchResultDesc: opt.matchResultDesc,
          checkTime: opt.checkTime,
          isHit: false,
          options: []
        }
      }
      typeMap[type].options.push({
        value: opt.optionValue,
        displayValue: opt.displayValue,
        odds: opt.odds,
        checked: opt.checked !== false, // 默认为true（兼容旧数据）
        isHit: opt.isHit,
        checkTime: opt.checkTime
      })
      // 更新开奖结果和命中状态
      if (opt.matchResultDesc) {
        typeMap[type].matchResultDesc = opt.matchResultDesc
      }
      if (opt.checkTime) {
        typeMap[type].checkTime = opt.checkTime
      }
      // 只要有一个选中的选项命中，该分组就算命中
      if (opt.checked !== false && opt.isHit) {
        typeMap[type].isHit = true
      }
    })

    return Object.values(typeMap)
  },

  // 获取选项值显示名称
  getValueName(type, value) {
    // 胜平负、让球胜平负
    if (type === 'had' || type === 'hhad') {
      const map = { 'H': '胜', 'D': '平', 'A': '负' }
      return map[value] || value
    }
    // 总进球
    if (type === 'ttg') {
      return value === '7' ? '7+球' : `${value}球`
    }
    // 半全场
    if (type === 'hafu') {
      const map = {
        'HH': '胜胜', 'HD': '胜平', 'HA': '胜负',
        'DH': '平胜', 'DD': '平平', 'DA': '平负',
        'AH': '负胜', 'AD': '负平', 'AA': '负负'
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
  },

  // 导出为图片
  async onExportImage() {
    const { record } = this.data
    if (!record) {
      wx.showToast({ title: '记录不存在', icon: 'error' })
      return
    }

    this.setData({ exporting: true })

    try {
      // 请求用户授权保存到相册
      const authResult = await wx.getSetting()
      if (!authResult.authSetting['scope.writePhotosAlbum']) {
        await wx.authorize({ scope: 'scope.writePhotosAlbum' })
      }

      wx.showLoading({ title: '生成图片中...', mask: true })

      // 创建 canvas
      const query = wx.createSelectorQuery()
      query.select('#shareCanvas')
        .fields({ node: true, size: true })
        .exec(async (res) => {
          if (!res || !res[0]) {
            wx.hideLoading()
            wx.showToast({ title: '生成失败', icon: 'error' })
            this.setData({ exporting: false })
            return
          }

          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = wx.getSystemInfoSync().pixelRatio

          // 设置 canvas 尺寸
          const canvasWidth = 750
          const canvasHeight = await this.calculateCanvasHeight()

          canvas.width = canvasWidth * dpr
          canvas.height = canvasHeight * dpr
          ctx.scale(dpr, dpr)

          // 绘制内容
          await this.drawContent(ctx, canvasWidth, canvasHeight)

          // 导出图片
          wx.canvasToTempFilePath({
            canvas: canvas,
            success: (result) => {
              wx.hideLoading()
              // 保存到相册
              wx.saveImageToPhotosAlbum({
                filePath: result.tempFilePath,
                success: () => {
                  wx.showToast({ title: '已保存到相册', icon: 'success' })
                  this.setData({ exporting: false })
                },
                fail: (err) => {
                  console.error('保存失败:', err)
                  wx.showToast({ title: '保存失败', icon: 'error' })
                  this.setData({ exporting: false })
                }
              })
            },
            fail: (err) => {
              wx.hideLoading()
              console.error('生成图片失败:', err)
              wx.showToast({ title: '生成失败', icon: 'error' })
              this.setData({ exporting: false })
            }
          })
        })
    } catch (error) {
      wx.hideLoading()
      console.error('导出失败:', error)
      if (error.errMsg && error.errMsg.includes('auth')) {
        wx.showModal({
          title: '提示',
          content: '需要授权保存到相册',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting()
            }
          }
        })
      } else {
        wx.showToast({ title: '导出失败', icon: 'error' })
      }
      this.setData({ exporting: false })
    }
  },

  // 计算 canvas 高度
  async calculateCanvasHeight() {
    const { record } = this.data
    let height = 300 // 基础高度（状态卡片 + 投注信息）

    // 计算比赛详情的高度
    if (record.matchDetails) {
      record.matchDetails.forEach(match => {
        height += 200 // 每场比赛基础高度
        if (match.optionGroups) {
          height += match.optionGroups.length * 80 // 每个玩法组
        }
      })
    }

    return Math.min(height, 10000) // 限制最大高度
  },

  // 绘制内容到 canvas
  async drawContent(ctx, width, height) {
    const { record } = this.data

    // 设置背景色
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, width, height)

    let y = 20

    // 绘制状态卡片
    y = this.drawStatusCard(ctx, record, 20, y, width - 40)

    y += 20

    // 绘制投注信息
    y = this.drawBetInfo(ctx, record, 20, y, width - 40)

    y += 20

    // 绘制比赛详情
    y = this.drawMatchDetails(ctx, record, 20, y, width - 40)

    // 绘制底部水印
    ctx.fillStyle = '#999'
    ctx.font = '24px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('足球小程序', width / 2, height - 30)
  },

  // 绘制状态卡片
  drawStatusCard(ctx, record, x, y, cardWidth) {
    const cardHeight = 100

    // 卡片背景
    const bgColor = record.status === 1 ? '#4CAF50' : record.status === 2 ? '#F44336' : '#FF9800'
    ctx.fillStyle = bgColor
    this.roundRect(ctx, x, y, cardWidth, cardHeight, 10)
    ctx.fill()

    // 状态文字
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 32px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(record.statusDesc || '待开奖', x + cardWidth / 2, y + 50)

    // 方案编号
    ctx.font = '24px sans-serif'
    ctx.fillText(`方案编号: ${record.schemeNo || ''}`, x + cardWidth / 2, y + 80)

    return y + cardHeight
  },

  // 绘制投注信息
  drawBetInfo(ctx, record, x, y, cardWidth) {
    const cardHeight = 200

    // 卡片背景
    ctx.fillStyle = '#fff'
    this.roundRect(ctx, x, y, cardWidth, cardHeight, 10)
    ctx.fill()

    // 标题
    ctx.fillStyle = '#333'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('投注信息', x + 20, y + 40)

    // 信息网格
    const infoY = y + 70
    const col1X = x + 20
    const col2X = x + cardWidth / 2 + 10

    ctx.font = '24px sans-serif'
    ctx.fillStyle = '#666'

    ctx.fillText('过关方式:', col1X, infoY)
    ctx.fillStyle = '#333'
    ctx.fillText(record.passTypesStr || '', col1X + 120, infoY)

    ctx.fillStyle = '#666'
    ctx.fillText('投注倍数:', col2X, infoY)
    ctx.fillStyle = '#333'
    ctx.fillText(`${record.multiple || 1}倍`, col2X + 120, infoY)

    ctx.fillStyle = '#666'
    ctx.fillText('总注数:', col1X, infoY + 35)
    ctx.fillStyle = '#333'
    ctx.fillText(`${record.totalBets || 0}注`, col1X + 120, infoY + 35)

    ctx.fillStyle = '#666'
    ctx.fillText('投注金额:', col2X, infoY + 35)
    ctx.fillStyle = '#f44336'
    ctx.fillText(`¥${record.totalAmount || 0}`, col2X + 120, infoY + 35)

    // 中奖金额或预计奖金
    if (record.status === 1) {
      ctx.fillStyle = '#666'
      ctx.fillText('中奖金额:', col1X, infoY + 70)
      ctx.fillStyle = '#4CAF50'
      ctx.font = 'bold 28px sans-serif'
      ctx.fillText(`¥${record.actualBonus || 0}`, col1X + 120, infoY + 70)
    } else if (record.bonusRange) {
      ctx.fillStyle = '#666'
      ctx.font = '24px sans-serif'
      ctx.fillText('预计奖金:', col1X, infoY + 70)
      ctx.fillStyle = '#FF9800'
      ctx.fillText(`¥${record.bonusRange}`, col1X + 120, infoY + 70)
    }

    return y + cardHeight
  },

  // 绘制比赛详情
  drawMatchDetails(ctx, record, x, y, cardWidth) {
    if (!record.matchDetails || record.matchDetails.length === 0) {
      return y
    }

    // 标题
    ctx.fillStyle = '#333'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`比赛详情 (${record.matchDetails.length}场)`, x, y + 30)

    let currentY = y + 60

    record.matchDetails.forEach((match, index) => {
      currentY = this.drawMatchItem(ctx, match, x, currentY, cardWidth, index + 1)
      currentY += 20
    })

    return currentY
  },

  // 绘制单场比赛
  drawMatchItem(ctx, match, x, y, cardWidth, index) {
    const cardHeight = 150 + (match.optionGroups ? match.optionGroups.length * 60 : 0)

    // 卡片背景
    ctx.fillStyle = '#fff'
    this.roundRect(ctx, x, y, cardWidth, cardHeight, 10)
    ctx.fill()

    // 比赛序号和时间
    ctx.fillStyle = '#666'
    ctx.font = '24px sans-serif'
    ctx.fillText(`${match.matchNumStr || ''}`, x + 20, y + 35)
    ctx.fillText(match.matchTime || '', x + cardWidth - 150, y + 35)

    // 队伍名称
    ctx.fillStyle = '#333'
    ctx.font = 'bold 26px sans-serif'
    const teamsText = `${match.homeTeamName || ''} VS ${match.awayTeamName || ''}`
    ctx.fillText(teamsText, x + 20, y + 70)

    // 绘制选项
    let optionY = y + 100
    if (match.optionGroups) {
      match.optionGroups.forEach(group => {
        optionY = this.drawOptionGroup(ctx, group, x + 20, optionY, cardWidth - 40)
      })
    }

    return y + cardHeight
  },

  // 绘制选项组
  drawOptionGroup(ctx, group, x, y, width) {
    ctx.font = '22px sans-serif'

    // 玩法名称
    ctx.fillStyle = '#666'
    const typeText = group.typeDesc + (group.goalLine ? `(${group.goalLine})` : '')
    ctx.fillText(typeText, x, y + 20)

    // 选项
    let optionX = x + 150
    group.options.forEach(opt => {
      if (opt.checked) {
        // 选中的选项
        const bgColor = opt.isHit ? '#4CAF50' : '#FF9800'
        ctx.fillStyle = bgColor
        ctx.fillRect(optionX, y, 80, 30)

        ctx.fillStyle = '#fff'
        ctx.fillText(opt.displayValue, optionX + 10, y + 22)

        optionX += 90
      }
    })

    // 开奖结果
    if (group.matchResultDesc) {
      ctx.fillStyle = group.isHit ? '#4CAF50' : '#F44336'
      ctx.fillText(group.matchResultDesc, x + width - 100, y + 20)
    }

    return y + 40
  },

  // 绘制圆角矩形
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
})
