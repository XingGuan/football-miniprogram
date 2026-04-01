// pages/point-detail/index.js - 积分明细
const userApi = require('../../api/user')
const userStore = require('../../store/user')

Page({
  data: {
    details: [],
    loading: true,
    error: null,
    pageNum: 1,
    pageSize: 20,
    hasMore: true,
    selectedType: '',
    typeOptions: [
      { label: '全部', value: '' },
      { label: '签到', value: 'SIGN' },
      { label: '赛事解锁', value: 'DEDUCT_MATCH' },
      { label: '情报解锁', value: 'DEDUCT_INFO' },
      { label: '注册赠送', value: 'REGISTER' },
      { label: '绑定手机', value: 'BIND_PHONE' },
      { label: '团长奖励', value: 'GROUP_BUY_LEADER' },
      { label: '团员奖励', value: 'GROUP_BUY_MEMBER' }
    ],
    typeMap: {
      'DEDUCT_MATCH': '赛事扣除',
      'DEDUCT_INFO': '情报扣除',
      'SIGN': '签到',
      'REGISTER': '注册赠送',
      'BIND_PHONE': '绑定手机',
      'GROUP_BUY_LEADER':"拼团团长奖励",
      'GROUP_BUY_MEMBER':"拼团团员奖励",

    }
  },

  onLoad() {
    this.loadDetails()
  },

  // 加载积分明细
  async loadDetails(isLoadMore = false) {
    const { pageNum, details, selectedType } = this.data
    const userInfo = userStore.getUserInfo()

    if (!userInfo || !userInfo.id) {
      this.setData({ loading: false, error: '请先登录' })
      return
    }

    if (!isLoadMore) {
      this.setData({ loading: true, pageNum: 1 })
    }

    try {
      const currentPageNum = isLoadMore ? pageNum + 1 : 1
      const timestamp = Date.now()
      const res = await userApi.getPointDetailList(userInfo.id, selectedType, currentPageNum, this.data.pageSize, timestamp)
    //  console.log(res)
      const newDetails = res || []

      // 处理数据格式
      const processedDetails = newDetails.map(item => ({
        ...item,
        changeTypeDesc: this.data.typeMap[item.changeType] || item.changeType,
        displayTime: this.formatTime(item.createTime),
        displayChange: item.pointChange > 0 ? `+${item.pointChange}` : String(item.pointChange),
        changeClass: item.pointChange > 0 ? 'gain' : 'loss'
      }))

      this.setData({
        details: isLoadMore ? [...details, ...processedDetails] : processedDetails,
        loading: false,
        error: null,
        pageNum: isLoadMore ? pageNum + 1 : 1,
        hasMore: processedDetails.length === this.data.pageSize
      })
    } catch (err) {
      console.error('加载积分明细失败:', err)
      this.setData({
        loading: false,
        error: err.message || '加载失败'
      })
    }
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

  // 筛选类型改变
  onTypeChange(e) {
    const selectedType = e.currentTarget.dataset.type
    this.setData({ selectedType, pageNum: 1, details: [] })
    this.loadDetails()
  },

  // 加载更多
  onLoadMore() {
    const { hasMore, loading } = this.data
    if (hasMore && !loading) {
      this.loadDetails(true)
    }
  },

  // 重试
  onRetry() {
    this.loadDetails()
  }
})
