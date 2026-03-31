// pages/activity/index.js - 活动中心
const groupbuyApi = require('../../api/groupbuy')
const userStore = require('../../store/user')

Page({
  data: {
    activeTab: 'created', // created: 我发起的, joined: 我加入的
    groups: [],
    loading: true,
    error: null,
    showCreateModal: false,
    selectedGroupSize: 3,
    groupSizeOptions: [2,3, 5, 10],
    groupSizeRewardMap: {
      2: 2,
      3: 3,
      5: 5,
      10: 10
    },
    creating: false
  },

  onLoad() {
    this.loadGroups()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 })
    }
  },

  // 加载拼团列表
  async loadGroups() {
    const userInfo = userStore.getUserInfo()

    if (!userInfo || !userInfo.id) {
      this.setData({ loading: false, error: '请先登录' })
      return
    }

    this.setData({ loading: true, error: null })

    try {
      const res = await groupbuyApi.getMyGroupList(userInfo.id, 1, 50)
      console.log(res)
      // 处理不同的返回格式
      let allGroups = []
      if (Array.isArray(res)) {
        allGroups = res
      } else if (Array.isArray(res.records)) {
        allGroups = res.records
      } 

      this.setData({
        groups: allGroups,
        loading: false,
        error: null
      })

      this.updateGroupDisplay()
    } catch (err) {
      console.error('加载拼团列表失败:', err)
      this.setData({
        loading: false,
        error: err.message || '加载失败'
      })
    }
  },

  // 更新显示的拼团列表
  updateGroupDisplay() {
    const { groups, activeTab } = this.data
    const userInfo = userStore.getUserInfo()

    let displayGroups = []
    if (activeTab === 'created') {
      // 我发起的拼团
      displayGroups = groups.filter(g => g.leaderId === userInfo?.id)
    } else {
      // 我加入的拼团
      displayGroups = groups.filter(g => {
        if (g.leaderId === userInfo?.id) return false
        return g.members && Array.isArray(g.members) && g.members.some(m => m.userId === userInfo?.id)
      })
    }

    // 添加其他信息
    displayGroups = displayGroups.map(g => ({
      ...g,
      isLeader: g.leaderId === userInfo?.id,
      progressPercent: Math.round((g.currentSize / g.groupSize) * 100),
      remainMembers: g.groupSize - g.currentSize
    }))

    this.setData({
      displayGroups
    })
  },

  // 切换标签
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    this.updateGroupDisplay()
  },

  // 打开创建拼团弹窗
  onOpenCreateModal() {
    const userInfo = userStore.getUserInfo()
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    this.setData({
      showCreateModal: true,
      selectedGroupSize: 3 // 重置为默认值
    })
  },

  // 关闭创建弹窗
  onCloseCreateModal() {
    this.setData({
      showCreateModal: false,
      selectedGroupSize: 2,
      creating: false
    })
  },

  // 选择拼团人数
  onSelectGroupSize(e) {
    const size = e.currentTarget.dataset.size
    this.setData({ selectedGroupSize: size })
  },

  // 确认创建拼团
  async onConfirmCreate() {
    const { selectedGroupSize, creating } = this.data
    const userInfo = userStore.getUserInfo()

    if (creating) return

    if (!userInfo || !userInfo.id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    this.setData({ creating: true })

    try {
      wx.showLoading({ title: '发起中...' })
      const result = await groupbuyApi.createGroup(userInfo.id, selectedGroupSize)
      wx.hideLoading()

      wx.showToast({
        title: '发起成功',
        icon: 'success',
        duration: 1500
      })

      this.onCloseCreateModal()

      // 刷新拼团列表
      this.loadGroups()

      // 延迟跳转到详情页
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/groupbuy-detail/index?id=${result.data.id}`
        })
      }, 1500)
    } catch (err) {
      wx.hideLoading()
      console.error('发起拼团失败:', err)
      wx.showToast({
        title: err.message || '发起失败',
        icon: 'none'
      })
    } finally {
      this.setData({ creating: false })
    }
  },

  // 点击拼团卡片进入详情
  onGroupTap(e) {
    const groupId = e.currentTarget.dataset.id
    if (groupId) {
      wx.navigateTo({
        url: `/pages/groupbuy-detail/index?id=${groupId}`
      })
    }
  },

  // 重试加载
  onRetry() {
    this.loadGroups()
  },

  // 分享给好友
  onShareAppMessage() {
    return {
      title: '拼团得积分 - 邀请好友一起参与',
      path: '/pages/activity/index'
    }
  }
})
