// pages/calculator-detail/index.js - 模拟试玩记录详情
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
    console.log('loadRecord 开始, id:', id)

    const userInfo = userStore.getUserInfo()
    console.log('userInfo:', userInfo)

    // 兼容 id 和 userId 字段
    const userId = userInfo && (userInfo.id || userInfo.userId)
    console.log('userId:', userId)

    if (!userId) {
      this.setData({ loading: false, error: '请先登录' })
      return
    }

    this.setData({ loading: true })

    try {
      console.log('开始调用API, userId:', userId)
      const res = await matchApi.getCalculatorRecords(userId)
      console.log('API返回:', res)
      const records = res.data || res || []
      console.log('记录列表:', records)
      console.log('查找ID:', id, typeof id)

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
          displayValue: this.getValueName(opt.optionType, opt.optionValue)
        }))
      }))
    }

    this.setData({ record: data, loading: false })
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
  }
})
