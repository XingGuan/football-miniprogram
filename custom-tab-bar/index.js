// custom-tab-bar/index.js
const matchApi = require('../api/match')

Component({
  data: {
    selectedPath: '/pages/index/index',
    showHistory: true, // 是否显示历史tab
    color: '#999999',
    selectedColor: '#1890ff',
    list: [
      {
        pagePath: '/pages/index/index',
        text: '比赛',
        iconPath: '/images/tabbar/match.png',
        selectedIconPath: '/images/tabbar/match-active.png'
      },
      {
        pagePath: '/pages/calculator-hall/index',
        text: '大厅',
        iconPath: '/images/tabbar/match.png',
        selectedIconPath: '/images/tabbar/match-active.png'
      },
      {
        pagePath: '/pages/match-result/index',
        text: '赛果',
        iconPath: '/images/tabbar/match.png',
        selectedIconPath: '/images/tabbar/match-active.png'
      },
      {
        pagePath: '/pages/history/index',
        text: '历史',
        iconPath: '/images/tabbar/match.png',
        selectedIconPath: '/images/tabbar/match-active.png',
        key: 'history' // 用于标识历史tab
      },
      {
        pagePath: '/pages/profile/index',
        text: '我的',
        iconPath: '/images/tabbar/match.png',
        selectedIconPath: '/images/tabbar/match-active.png'
      }
    ]
  },

  lifetimes: {
    attached() {
      this.checkFeatures()
    }
  },

  methods: {
    // 检查功能开关
    async checkFeatures() {
      try {
        const result = await matchApi.checkFeatures()
        const showHistory = result === true
        this.setData({ showHistory })
      } catch (error) {
        console.error('检查功能开关失败:', error)
        this.setData({ showHistory: false })
      }
    },

    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({ url })
    }
  }
})
