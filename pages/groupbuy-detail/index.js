// pages/groupbuy-detail/index.js - 拼团详情
const groupbuyApi = require('../../api/groupbuy')
const userStore = require('../../store/user')

Page({
  data: {
    groupId: null,
    group: null,
    loading: true,
    error: null,
    joining: false,
    claiming: false,
    isLeader: false,
    isJoined: false,
    canJoin: false,
    remainingTime: '',
    isCompleted: false
  },

  onLoad(options) {
    const id = options.id
    if (!id) {
      this.setData({ loading: false, error: '参数错误' })
      return
    }
    this.setData({ groupId: id })
    this.loadGroupDetail(id)
  },

  // 加载拼团详情
  async loadGroupDetail(id) {
    this.setData({ loading: true, error: null })

    try {
      const result = await groupbuyApi.getGroupDetail(id)

      // 处理不同的返回格式
      let group = result
      if (result.data) {
        group = result.data
      }

      if (!group) {
        throw new Error('获取拼团详情失败')
      }

      const userInfo = userStore.getUserInfo()
      const isLeader = group.leaderId === userInfo?.id
      let isJoined = isLeader

      if (!isJoined && group.members && Array.isArray(group.members)) {
        isJoined = group.members.some(m => m.userId === userInfo?.id)
      }

      const canJoin = group.currentSize < group.groupSize && group.status === 0 && !isJoined

      // 检查拼团是否已完成
      const isCompleted = group.currentSize >= group.groupSize

      this.setData({
        group,
        isLeader,
        isJoined,
        canJoin,
        isCompleted,
        remainingTime: '',
        loading: false
      })

      // 启动倒计时
      this.startCountdown()
    } catch (err) {
      console.error('加载拼团详情失败:', err)
      this.setData({
        loading: false,
        error: err.message || '加载失败'
      })
    }
  },

  // 加入拼团
  async onJoinGroup() {
    const { joining, group, canJoin } = this.data
    const userInfo = userStore.getUserInfo()

    if (joining) return

    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    if (!canJoin) {
      wx.showToast({
        title: '无法加入此拼团',
        icon: 'none'
      })
      return
    }

    this.setData({ joining: true })

    try {
      wx.showLoading({ title: '加入中...' })
      await groupbuyApi.joinGroup(group.id, userInfo.id)
      wx.hideLoading()

      wx.showToast({
        title: '加入成功',
        icon: 'success',
        duration: 1500
      })

      // 重新加载详情
      setTimeout(() => {
        this.loadGroupDetail(group.id)
      }, 1000)
    } catch (err) {
      wx.hideLoading()
      console.error('加入拼团失败:', err)
      wx.showToast({
        title: err.message || '加入失败',
        icon: 'none'
      })
    } finally {
      this.setData({ joining: false })
    }
  },

  // 启动倒计时
  startCountdown() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer)
    }

    const updateCountdown = () => {
      const { group } = this.data
      if (!group || !group.expireTime) {
        console.warn('缺少 expireTime 数据', group)
        return
      }

      try {
        const now = new Date().getTime()
        // 处理时间戳格式（秒级或毫秒级）
        let expireTime = typeof group.expireTime === 'number'
          ? group.expireTime
          : new Date(group.expireTime).getTime()

        // 如果 expireTime 看起来是秒级时间戳（小于 10000000000），转换为毫秒
        if (expireTime < 10000000000) {
          expireTime = expireTime * 1000
        }

        let remaining = expireTime - now

        if (remaining <= 0) {
          clearInterval(this._countdownTimer)
          this.setData({ remainingTime: '已过期' })
          return
        }

        const hours = Math.floor(remaining / (1000 * 60 * 60))
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

        this.setData({
          remainingTime: `${hours}时${minutes}分${seconds}秒`
        })
      } catch (err) {
        console.error('倒计时计算失败:', err, group.expireTime)
      }
    }

    updateCountdown()
    this._countdownTimer = setInterval(updateCountdown, 1000)
  },

  // 领取拼团奖励
  async onClaimReward() {
    const { claiming, group, isLeader, isCompleted } = this.data
    const userInfo = userStore.getUserInfo()

    if (claiming) return

    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    if (!isLeader) {
      wx.showToast({
        title: '只有团长可以领取奖励',
        icon: 'none'
      })
      return
    }

    if (!isCompleted) {
      wx.showToast({
        title: '拼团未满人，无法领取',
        icon: 'none'
      })
      return
    }

    this.setData({ claiming: true })

    try {
      wx.showLoading({ title: '领取中...' })
      await groupbuyApi.claimReward(userInfo.id, group.id)
      wx.hideLoading()

      wx.showToast({
        title: `成功领取${group.groupSize}积分`,
        icon: 'success',
        duration: 2000
      })

      // 重新加载详情
      setTimeout(() => {
        this.loadGroupDetail(group.id)
      }, 2000)
    } catch (err) {
      wx.hideLoading()
      console.error('领取奖励失败:', err)
      wx.showToast({
        title: err.message || '领取失败',
        icon: 'none'
      })
    } finally {
      this.setData({ claiming: false })
    }
  },

  // 重试加载
  onRetry() {
    if (this.data.groupId) {
      this.loadGroupDetail(this.data.groupId)
    }
  },

  // 分享给好友
  onShareAppMessage() {
    const { group } = this.data
    if (!group) {
      return {
        title: '拼团得积分',
        path: '/pages/activity/index'
      }
    }

    return {
      title: `快来加入${group.leaderName}的${group.groupSize}人拼团，完成可获得${group.groupSize}积分！`,
      path: `/pages/groupbuy-detail/index?id=${group.id}`
    }
  },

  onUnload() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer)
    }
  }
})
