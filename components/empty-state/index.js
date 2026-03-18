// components/empty-state/index.js
Component({
  properties: {
    // 图标类型: empty | error | network | search
    type: {
      type: String,
      value: 'empty'
    },
    // 自定义图标路径
    icon: {
      type: String,
      value: ''
    },
    // 标题
    title: {
      type: String,
      value: ''
    },
    // 描述
    description: {
      type: String,
      value: ''
    },
    // 按钮文字
    buttonText: {
      type: String,
      value: ''
    },
    // 按钮类型: primary | default
    buttonType: {
      type: String,
      value: 'primary'
    }
  },

  data: {
    defaultConfig: {
      empty: {
        icon: '/images/icons/empty.png',
        title: '暂无数据',
        description: '这里空空如也'
      },
      error: {
        icon: '/images/icons/error.png',
        title: '加载失败',
        description: '请稍后重试'
      },
      network: {
        icon: '/images/icons/network.png',
        title: '网络异常',
        description: '请检查网络连接后重试'
      },
      search: {
        icon: '/images/icons/search-empty.png',
        title: '未找到结果',
        description: '换个关键词试试吧'
      }
    },
    displayIcon: '',
    displayTitle: '',
    displayDescription: ''
  },

  lifetimes: {
    attached() {
      this.updateDisplay()
    }
  },

  observers: {
    'type, icon, title, description': function() {
      this.updateDisplay()
    }
  },

  methods: {
    updateDisplay() {
      const { type, icon, title, description } = this.properties
      const defaultConfig = this.data.defaultConfig[type] || this.data.defaultConfig.empty

      this.setData({
        displayIcon: icon || defaultConfig.icon,
        displayTitle: title || defaultConfig.title,
        displayDescription: description || defaultConfig.description
      })
    },

    onButtonTap() {
      this.triggerEvent('buttonTap')
    }
  }
})
