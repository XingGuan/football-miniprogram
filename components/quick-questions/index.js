// components/quick-questions/index.js
const quickQuestionsApi = require('../../api/quickQuestions')

Component({
  properties: {
    // 是否自动加载
    autoLoad: {
      type: Boolean,
      value: true
    },
    // 自定义问题列表
    questions: {
      type: Array,
      value: []
    },
    // 标题
    title: {
      type: String,
      value: '猜你想问'
    },
    // 是否显示标题
    showTitle: {
      type: Boolean,
      value: true
    }
  },

  data: {
    questionList: [],
    loading: false
  },

  lifetimes: {
    attached() {
      if (this.properties.autoLoad && this.properties.questions.length === 0) {
        this.loadQuestions()
      }
    }
  },

  observers: {
    'questions': function(questions) {
      if (questions && questions.length > 0) {
        this.setData({ questionList: questions })
      }
    }
  },

  methods: {
    // 加载问题列表
    async loadQuestions() {
      this.setData({ loading: true })

      try {
        const questions = await quickQuestionsApi.getQuickQuestions()
        this.setData({
          questionList: questions,
          loading: false
        })
      } catch (e) {
        console.error('加载快速问题失败:', e)
        this.setData({
          questionList: quickQuestionsApi.getDefaultQuestions(),
          loading: false
        })
      }
    },

    // 刷新问题
    refresh() {
      this.loadQuestions()
    },

    // 点击问题
    onQuestionTap(e) {
      const index = e.currentTarget.dataset.index
      const question = this.data.questionList[index]

      if (question) {
        this.triggerEvent('select', { question, index })
      }
    }
  }
})
