// api/quickQuestions.js - 快速问题建议接口
const { post } = require('./index')

/**
 * 获取快速问题建议
 * @returns {Promise<string[]>} 问题列表
 */
function getQuickQuestions() {
  return post('/api/ai/guest/ask', {}, { showLoading: false })
    .then(data => {
      if (data && data.questionName) {
        return data.questionName
      }
      return []
    })
    .catch(() => {
      // 返回默认问题
      return getDefaultQuestions()
    })
}

/**
 * 获取默认问题列表
 */
function getDefaultQuestions() {
  return [
    '今天有哪些值得关注的比赛？',
    '帮我分析一下今天的热门比赛',
    '最近有哪些强强对话？',
    '推荐一些大小球的选择'
  ]
}

module.exports = {
  getQuickQuestions,
  getDefaultQuestions
}
