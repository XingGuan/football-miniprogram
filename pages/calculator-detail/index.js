// pages/calculator-detail/index.js - 模拟选号记录详情
const matchApi = require('../../api/match')
const userStore = require('../../store/user')

Page({
  data: {
    recordId: null,
    record: null,
    loading: true,
    error: null
  },

  onLoad(options) {
    console.log('详情页 onLoad, options:', options)
    const id = options.id
    if (!id) {
      this.setData({ loading: false, error: '参数错误' })
      return
    }
    this.setData({ recordId: id })
    this.loadRecord(id)
  },

  // 直接调用API获取记录
  async loadRecord(id) {

    const userInfo = userStore.getUserInfo()

    // 兼容 id 
    const userId = userInfo && (userInfo.id)
    console.log('userId:', userId)

    if (!userId) {
      this.setData({ loading: false, error: '请先登录' })
      return
    }

    this.setData({ loading: true })

    try {
      const res = await matchApi.getCalculatorRecords(userId)
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

  // 计算预计奖金范围
  calculateBonusRange(record) {
    if (!record.matchDetails || record.matchDetails.length === 0) return ''

    const multiple = record.multiple || 1
    let minOdds = 1
    let maxOdds = 1

    record.matchDetails.forEach(match => {
      if (match.options && match.options.length > 0) {
        const odds = match.options.map(o => o.odds || 1)
        minOdds *= Math.min(...odds)
        maxOdds *= Math.max(...odds)
      }
    })

    const minBonus = (minOdds * 2 * multiple).toFixed(2)
    const maxBonus = (maxOdds * 2 * multiple).toFixed(2)

    return `${minBonus} ~ ${maxBonus}`
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
