// pages/profile/index.js - 个人中心页面
const userStore = require('../../store/user')
const userApi = require('../../api/user')

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    menuList: [
      { icon: '👨‍💼', title: '联系客服', desc: '24小时在线客服', action: 'contact' },
      // { icon: '💬', title: '意见反馈', desc: '帮助我们改进产品', action: 'feedback' },
      // { icon: '⭐', title: '给我们评分', desc: '如果喜欢请给个好评', action: 'rate' },
      { icon: '📄', title: '用户协议', desc: '查看用户协议', action: 'agreement' },
      { icon: '🔒', title: '隐私政策', desc: '查看隐私政策', action: 'privacy' },
      { icon: 'ℹ️', title: '关于我们', desc: '了解AI足球智能体', action: 'about' }
    ],
    version: '1.0.0',
    // 绑定手机号相关
    showPhonePopup: false,
    bindPhone: '',
    bindCode: '',
    bindCountdown: 0,
    sendingBindCode: false,
    bindLoading: false,
    // 修改用户名相关
    showNamePopup: false,
    newUserName: '',
    updateNameLoading: false,
    // 勋章相关
    medals: [],
    wornMedals: [],
    acquiredMedals: [],
    acquiredCount: 0,
    topMedal: null, // 最高等级勋章
    medalsLoading: false,
    showMedalPopup: false
  },

  onLoad() {
    // 不在这里调用 updateUserState，避免与 onShow 重复调用
  },

  onShow() {
    this.updateUserState()
    this.loadUserMedals()

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  // 更新用户状态
  async updateUserState() {
    const isLoggedIn = userStore.isLoggedIn()
    let userInfo = userStore.getUserInfo()

    // 如果已登录，重新从服务器获取最新用户信息
    if (isLoggedIn && userInfo && userInfo.id) {
      try {
        const latestUserInfo = await userApi.getUserInfoById(userInfo.id)
        if (latestUserInfo) {
          // 更新本地存储
          wx.setStorageSync('userInfo', latestUserInfo)
          // 更新 app 全局数据
          const app = getApp()
          if (app && app.globalData) {
            app.globalData.userInfo = latestUserInfo
          }
          userInfo = latestUserInfo
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
        // 获取失败时使用本地缓存的用户信息
      }
    }

    this.setData({
      isLoggedIn,
      userInfo
    })
  },

  // 加载用户勋章
  async loadUserMedals() {
    const userInfo = userStore.getUserInfo()
    if (!userStore.isLoggedIn() || !userInfo || !userInfo.id) {
      this.setData({ medals: [], wornMedals: [], acquiredMedals: [], acquiredCount: 0 })
      return
    }

    this.setData({ medalsLoading: true })

    try {
      const medals = await userApi.getUserMedals(userInfo.id)
      const medalList = Array.isArray(medals) ? medals : ((medals && medals.data) || [])

      // 打印原始数据便于调试
      console.log('勋章原始数据:', JSON.stringify(medalList))

      // 处理勋章数据，添加图标和样式
      const processedMedals = medalList.map(medal => {
        // 判断是否已获得：acquireTime 有实际值（排除 null、undefined、空字符串、字符串"null"）
        const acquireTime = medal.acquireTime
        const isAcquired = acquireTime && acquireTime !== 'null' && acquireTime !== ''

        // 判断是否佩戴中
        const isCurrent = medal.isCurrent === 1 || medal.isCurrent === true || medal.isCurrent === '1' || medal.isCurrent === 'true'
        const isWorn = isAcquired && isCurrent

        const colorClass = isAcquired ? this.getMedalColorClass(medal.level) : 'medal-locked'
        console.log(`勋章[${medal.medalName}]: level=${medal.level}, colorClass=${colorClass}, isAcquired=${isAcquired}`)

        return {
          ...medal,
          icon: this.getMedalIcon(medal.level),
          colorClass,
          isAcquired,
          isWorn
        }
      })

      const wornMedals = processedMedals.filter(m => m.isWorn)
      const acquiredMedals = processedMedals.filter(m => m.isAcquired)

      // 获取最高等级的勋章
      const topMedal = acquiredMedals.length > 0
        ? acquiredMedals.reduce((max, m) => (m.level || 0) > (max.level || 0) ? m : max, acquiredMedals[0])
        : null

      // 为最高等级勋章添加累计中奖金额描述
      if (topMedal) {
        topMedal.bonusDesc = this.getMedalBonusDesc(topMedal.level)
      }

      this.setData({
        medals: processedMedals,
        wornMedals,
        acquiredMedals,
        acquiredCount: acquiredMedals.length,
        topMedal,
        medalsLoading: false
      })
    } catch (error) {
      console.error('获取用户勋章失败:', error)
      this.setData({
        medals: [],
        wornMedals: [],
        acquiredMedals: [],
        acquiredCount: 0,
        medalsLoading: false
      })
    }
  },

  // 获取勋章图标
  getMedalIcon(level) {
    const iconMap = {
      1: '🌱', // 百元 - 幸运萌芽
      2: '🎊', // 千元 - 千喜临门
      3: '💎', // 1万 - 万中无一
      4: '🎁', // 2万 - 双喜盈门
      5: '☀️', // 3万 - 三阳开泰
      6: '🏆', // 5万 - 五福聚宝
      7: '👑'  // 10万 - 十全鸿运
    }
    return iconMap[level] || '🏅'
  },

  // 获取勋章颜色样式类
  getMedalColorClass(level) {
    const colorMap = {
      1: 'medal-green',    // 百元 - 绿色
      2: 'medal-blue',     // 千元 - 蓝色
      3: 'medal-purple',   // 1万 - 紫色
      4: 'medal-pink',     // 2万 - 粉色
      5: 'medal-orange',   // 3万 - 橙色
      6: 'medal-gold',     // 5万 - 金色
      7: 'medal-rainbow'   // 10万 - 彩虹/红金
    }
    return colorMap[level] || 'medal-default'
  },

  // 获取勋章对应的累计中奖金额描述
  getMedalBonusDesc(level) {
    const bonusMap = {
      1: '100元',
      2: '1,000元',
      3: '10,000元',
      4: '20,000元',
      5: '30,000元',
      6: '50,000元',
      7: '100,000元'
    }
    return bonusMap[level] || ''
  },

  // 点击最高等级勋章显示累计中奖金额
  onTopMedalTap() {
    const { topMedal } = this.data
    if (!topMedal) return

    wx.showToast({
      title: `累计中奖${topMedal.bonusDesc}`,
      icon: 'none',
      duration: 2000
    })
  },

  // 打开勋章弹窗
  onOpenMedalPopup() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    this.setData({ showMedalPopup: true })
    // 每次打开弹窗时刷新勋章数据
    this.loadUserMedals()
  },

  // 关闭勋章弹窗
  onCloseMedalPopup() {
    this.setData({ showMedalPopup: false })
  },

  // 点击勋章查看详情
  onMedalTap(e) {
    const medal = e.currentTarget.dataset.medal
    if (!medal) return

    if (!medal.isAcquired) {
      wx.showToast({ title: '勋章尚未解锁', icon: 'none' })
      return
    }

    wx.showModal({
      title: medal.medalName,
      content: `${medal.medalMeaning}\n\n获得时间: ${this.formatMedalTime(medal.acquireTime)}`,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 格式化勋章获得时间
  formatMedalTime(timeStr) {
    if (!timeStr) return '未知'
    const date = new Date(timeStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 跳转登录
  onLogin() {
    wx.navigateTo({
      url: '/pages/login/index'
    })
  },

  // 退出登录
  async onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '退出中...' })

          await userStore.logout()

          wx.hideLoading()
          this.updateUserState()

          wx.showToast({
            title: '已退出',
            icon: 'success'
          })
        }
      }
    })
  },

  // 签到
  async onSign() {
    const { userInfo, isLoggedIn } = this.data

    if (!isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    // 检查是否已签到
    if (userInfo && userInfo.signToday) {
      wx.showToast({
        title: '今日已签到',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '签到中...' })
      await userApi.userSign(userInfo.id)
      wx.hideLoading()

      wx.showToast({
        title: '签到成功，获得1积分',
        icon: 'success',
        duration: 2000
      })

      // 重新获取用户信息
      setTimeout(() => {
        this.updateUserState()
      }, 1500)
    } catch (error) {
      wx.hideLoading()
      console.error('签到失败:', error)
      wx.showToast({
        title: error.message || '签到失败',
        icon: 'none'
      })
    }
  },

  // 编辑用户信息（打开修改用户名弹窗）
  onEditProfile() {
    const { userInfo } = this.data
    if (!userInfo) return
    this.setData({
      showNamePopup: true,
      newUserName: userInfo.userName || ''
    })
  },

  // 查看积分明细
  onPointDetail() {
    wx.navigateTo({
      url: '/pages/point-detail/index'
    })
  },

  // 关闭修改用户名弹窗
  onCloseNamePopup() {
    this.setData({
      showNamePopup: false,
      newUserName: '',
      updateNameLoading: false
    })
  },

  // 阻止冒泡
  preventTap() {},

  // 用户名输入
  onUserNameInput(e) {
    this.setData({ newUserName: e.detail.value })
  },

  // 确认修改用户名
  async onConfirmUpdateName() {
    const { newUserName, userInfo, updateNameLoading } = this.data

    if (updateNameLoading) return

    // 验证用户名
    if (!newUserName || newUserName.trim() === '') {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      })
      return
    }

    if (newUserName.length > 20) {
      wx.showToast({
        title: '用户名不超过20个字符',
        icon: 'none'
      })
      return
    }

    // 检查是否与当前用户名相同
    if (newUserName === userInfo.userName) {
      wx.showToast({
        title: '新用户名与当前相同',
        icon: 'none'
      })
      return
    }

    this.setData({ updateNameLoading: true })

    try {
      // 调用修改用户名接口
      await userApi.updateUserName(userInfo.id, newUserName)

      wx.showToast({
        title: '修改成功',
        icon: 'success',
        duration: 2000
      })

      // 关闭弹窗
      this.onCloseNamePopup()

      // 刷新用户信息
      setTimeout(() => {
        this.updateUserState()
      }, 1500)
    } catch (e) {
      wx.showToast({
        title: e.message || '修改失败',
        icon: 'none'
      })
    } finally {
      this.setData({ updateNameLoading: false })
    }
  },

  // 菜单项点击
  onMenuTap(e) {
    const { path, action } = e.currentTarget.dataset

    if (path) {
      wx.navigateTo({ url: path })
      return
    }

    switch (action) {
      case 'feedback':
        this.openFeedback()
        break
      case 'rate':
        this.openRate()
        break
      case 'agreement':
        this.showAgreement()
        break
      case 'privacy':
        this.showPrivacy()
        break
      case 'about':
        this.showAbout()
        break
    }
  },

  // 打开意见反馈
  openFeedback() {
    // 小程序内置反馈入口
    wx.showToast({
      title: '请通过设置-关于-投诉与反馈进行反馈',
      icon: 'none',
      duration: 3000
    })
  },

  // 评分
  openRate() {
    wx.showToast({
      title: '感谢您的支持！',
      icon: 'success'
    })
  },

  // 用户协议
  showAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/index?type=user'
    })
  },

  // 隐私政策
  showPrivacy() {
    wx.navigateTo({
      url: '/pages/agreement/index?type=privacy'
    })
  },

  // 关于我们
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '足球分析助手是一款专业的足球比赛分析工具，为您提供智能 AI 分析、赛事数据、预测建议等服务。',
      showCancel: false
    })
  },

  // 打开活动中心
  onActivityCenter() {
    const { isLoggedIn } = this.data
    if (!isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/activity/index'
    })
  },

  // 清除缓存
  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存数据吗？',
      success: (res) => {
        if (res.confirm) {
          // 保留登录信息，只清除其他缓存
          const token = wx.getStorageSync('token')
          const userInfo = wx.getStorageSync('userInfo')

          wx.clearStorageSync()

          if (token) wx.setStorageSync('token', token)
          if (userInfo) wx.setStorageSync('userInfo', userInfo)

          wx.showToast({
            title: '缓存已清除',
            icon: 'success'
          })
        }
      }
    })
  },

  // ========== 绑定手机号相关 ==========

  // 点击绑定手机号任务
  onBindPhone() {
    const { userInfo } = this.data
    if (userInfo && userInfo.phone) {
      wx.showToast({
        title: '手机号已绑定',
        icon: 'none'
      })
      return
    }
    this.setData({ showPhonePopup: true })
  },

  // 关闭弹窗
  onClosePhonePopup() {
    this.setData({
      showPhonePopup: false,
      bindPhone: '',
      bindCode: '',
      bindCountdown: 0,
      sendingBindCode: false,
      bindLoading: false
    })
    if (this._bindCountdownTimer) {
      clearInterval(this._bindCountdownTimer)
    }
  },

  // 阻止冒泡
  preventTap() {},

  // 手机号输入
  onBindPhoneInput(e) {
    this.setData({ bindPhone: e.detail.value })
  },

  // 验证码输入
  onBindCodeInput(e) {
    this.setData({ bindCode: e.detail.value })
  },

  // 发送验证码
  async onSendBindCode() {
    const { bindPhone, sendingBindCode, bindCountdown } = this.data

    if (sendingBindCode || bindCountdown > 0) return

    // 验证手机号
    if (!/^1[3-9]\d{9}$/.test(bindPhone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    this.setData({ sendingBindCode: true })

    try {
      await userApi.sendSms(bindPhone)
      wx.showToast({
        title: '验证码已发送',
        icon: 'success'
      })
      this.startBindCountdown()
    } catch (e) {
      wx.showToast({
        title: e.message || '发送失败',
        icon: 'none'
      })
    } finally {
      this.setData({ sendingBindCode: false })
    }
  },

  // 开始倒计时
  startBindCountdown() {
    this.setData({ bindCountdown: 60 })

    this._bindCountdownTimer = setInterval(() => {
      const { bindCountdown } = this.data
      if (bindCountdown <= 1) {
        clearInterval(this._bindCountdownTimer)
        this.setData({ bindCountdown: 0 })
      } else {
        this.setData({ bindCountdown: bindCountdown - 1 })
      }
    }, 1000)
  },

  // 确认绑定
  async onConfirmBindPhone() {
    const { bindPhone, bindCode, bindLoading, userInfo } = this.data

    if (bindLoading) return

    // 验证手机号
    if (!/^1[3-9]\d{9}$/.test(bindPhone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    // 验证验证码
    if (!bindCode || bindCode.length < 4) {
      wx.showToast({
        title: '请输入验证码',
        icon: 'none'
      })
      return
    }

    this.setData({ bindLoading: true })

    try {
      // 调用更新接口
      await userApi.updateUserInfoWithPhone({
        userId: userInfo.id,
        phone: bindPhone,
        code: bindCode
      })

      wx.showToast({
        title: '绑定成功，获得5积分',
        icon: 'success',
        duration: 2000
      })

      // 关闭弹窗
      this.onClosePhonePopup()

      // 刷新用户信息
      setTimeout(() => {
        this.updateUserState()
      }, 1500)
    } catch (e) {
      wx.showToast({
        title: e.message || '绑定失败',
        icon: 'none'
      })
    } finally {
      this.setData({ bindLoading: false })
    }
  },

  onUnload() {
    if (this._bindCountdownTimer) {
      clearInterval(this._bindCountdownTimer)
    }
  },

  // 分享给好友
  onShareAppMessage() {
    return {
      title: 'AI足球分析助手 - 智能比赛分析预测',
      path: '/pages/index/index'
    }
  }
})
