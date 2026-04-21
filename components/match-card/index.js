// components/match-card/index.js
const dateUtils = require('../../utils/date')
const matchUtils = require('../../utils/match')
const userStore = require('../../store/user')
const userApi = require('../../api/user')

Component({
  properties: {
    match: {
      type: Object,
      value: {}
    },
    showOdds: {
      type: Boolean,
      value: true
    },
    clickable: {
      type: Boolean,
      value: true
    }
  },

  data: {
    formattedTime: '',
    statusInfo: null,
    isUnlocked: false, // 是否已解锁
    isVip: false // 是否是VIP用户
  },

  lifetimes: {
    attached() {
      // 检查用户VIP状态
      this.checkVipStatus()
    }
  },

  observers: {
    'match': function(match) {
      if (match && match.fullMatchTime) {
        const userInfo = userStore.getUserInfo()
        const isVip = userInfo && userInfo.isVip === true

        this.setData({
          formattedTime: dateUtils.formatShortDateTime(match.fullMatchTime),
          statusInfo: matchUtils.getMatchStatus(match.status),
          // VIP用户默认解锁，否则从match对象中获取解锁状态
          isUnlocked: isVip || match.isUnlocked || false,
          isVip: isVip
        })
      }
    }
  },

  methods: {
    onTap() {
      if (!this.properties.clickable) return

      // 登录拦截
      if (!userStore.isLoggedIn()) {
        wx.navigateTo({ url: '/pages/login/index' })
        return
      }

      const match = this.properties.match
      if (!match || !match.id) return

      wx.navigateTo({
        url: `/pages/analysis/index?matchId=${match.id}`
      })
    },

    // 检查VIP状态
    checkVipStatus() {
      const userInfo = userStore.getUserInfo()
      const isVip = userInfo && userInfo.isVip === true
      this.setData({ isVip })
    },

    async onAnalyze() {
      const match = this.properties.match
      if (!match || !match.id) {
        console.error('match 数据无效')
        return
      }

      // 登录拦截 - 优先去登录
      if (!userStore.isLoggedIn()) {
        // 保存当前比赛信息，登录后返回
        const app = getApp()
        app.globalData.pendingAnalysisMatch = match
        wx.navigateTo({
          url: '/pages/login/index',
          success: () => {
            wx.showToast({
              title: '请先登录',
              icon: 'none',
              duration: 2000
            })
          }
        })
        return
      }

      const { isUnlocked, isVip } = this.data

      // VIP用户直接跳转，无需解锁
      if (isVip) {
        this.navigateToAnalysis(match)
        return
      }

      // 如果未解锁，先弹窗确认扣减积分
      if (!isUnlocked) {
        const userInfo = userStore.getUserInfo()
        const userPoints = (userInfo && userInfo.point) || 0
        const pointsNeeded = 1 // 需要的积分

        if (userPoints < pointsNeeded) {
          wx.showModal({
            title: '积分不足',
            content: `AI分析需要消耗 ${pointsNeeded} 积分，您当前积分为 ${userPoints}。\n\n开通会员可免费查看所有分析！`,
            confirmText: '开通会员',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                wx.navigateTo({ url: '/pages/vip/index' })
              }
            }
          })
          return
        }

        // 弹窗确认扣减积分
        wx.showModal({
          title: '解锁AI分析',
          content: `本次分析将消耗 ${pointsNeeded} 积分，是否继续？\n\n提示：开通会员可免费查看所有分析`,
          confirmText: '确认',
          cancelText: '取消',
          success: async (res) => {
            if (res.confirm) {
              await this.unlockAndNavigate(match, userInfo.id, pointsNeeded)
            }
          }
        })
      } else {
        // 已解锁，直接跳转
        this.navigateToAnalysis(match)
      }
    },

    // 解锁并跳转
    async unlockAndNavigate(match, userId, points) {
      try {
        wx.showLoading({
          title: `消耗${points}积分中...`,
          mask: true
        })

        // 调用扣减积分接口（包含matchId）
        await userApi.deductPoint(userId, points, match.id)

        // 重新拉取用户信息
        const latestUserInfo = await userApi.getUserInfoById(userId)
        if (latestUserInfo) {
          const app = getApp()
          app.globalData.userInfo = latestUserInfo
          wx.setStorageSync('userInfo', latestUserInfo)
        }

        wx.hideLoading()

        // 更新解锁状态
        this.setData({ isUnlocked: true })

        // 显示成功提示
        wx.showToast({
          title: `消耗${points}积分`,
          icon: 'success',
          duration: 1500
        })

        // 延迟跳转
        setTimeout(() => {
          this.navigateToAnalysis(match)
        }, 1500)
      } catch (e) {
        wx.hideLoading()
        console.error('解锁失败:', e)
        wx.showToast({
          title: '解锁失败',
          icon: 'error',
          duration: 2000
        })
      }
    },

    // 跳转到AI分析页面
    navigateToAnalysis(match) {
      const matchInfo = encodeURIComponent(JSON.stringify({
        league: match.league,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam
      }))

      wx.navigateTo({
        url: `/pages/ai-analysis/index?matchId=${match.id}&matchInfo=${matchInfo}`
      })
    },

    formatOdds(odds) {
      return matchUtils.formatOdds(odds)
    },

    formatGoalLine(goalLine) {
      return matchUtils.formatGoalLine(goalLine)
    }
  }
})
