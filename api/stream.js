// api/stream.js - AI 流式对话接口
const app = getApp()

/**
 * 流式聊天 - 使用 enableChunked 分块传输
 * 需要基础库 2.20.2+
 *
 * @param {Object} options 配置项
 * @param {Array} options.messages 消息历史
 * @param {boolean} options.deepThinking 是否开启深度思考
 * @param {Function} options.onMessage 收到消息回调
 * @param {Function} options.onComplete 完成回调
 * @param {Function} options.onError 错误回调
 * @returns {Object} 包含 abort 方法的控制器
 */
function streamChat(options) {
  const { messages, deepThinking = false, onMessage, onComplete, onError } = options

  const token = app.globalData.token
  let buffer = ''
  let requestTask = null

  requestTask = wx.request({
    url: `${app.globalData.baseUrl}/api/stream/chat`,
    method: 'POST',
    data: {
      messages,
      deepThinking,
      stream: true
    },
    header: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'Accept': 'text/event-stream'
    },
    enableChunked: true,
    responseType: 'text',
    success: (res) => {
      // 处理最终响应
      if (res.statusCode === 200) {
        // 处理剩余缓冲区
        if (buffer) {
          processChunk(buffer)
        }
        onComplete && onComplete()
      } else if (res.statusCode === 401) {
        app.clearLoginState()
        onError && onError(new Error('登录已过期'))
      } else {
        onError && onError(new Error(`请求失败: ${res.statusCode}`))
      }
    },
    fail: (err) => {
      onError && onError(err)
    }
  })

  // 监听分块数据
  requestTask.onChunkReceived((res) => {
    try {
      // 将 ArrayBuffer 转为字符串
      const text = arrayBufferToString(res.data)
      buffer += text

      // 处理缓冲区中完整的行
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // 保留最后一个可能不完整的行

      for (const line of lines) {
        processChunk(line)
      }
    } catch (e) {
      console.error('处理分块数据错误:', e)
    }
  })

  /**
   * 处理单行数据
   */
  function processChunk(line) {
    const trimmedLine = line.trim()

    if (!trimmedLine) return

    // SSE 格式: data: xxx
    if (trimmedLine.startsWith('data:')) {
      // 兼容 "data:" 和 "data: " 两种格式
      let dataStr = trimmedLine.slice(5)
      if (dataStr.startsWith(' ')) {
        dataStr = dataStr.slice(1)
      }
      dataStr = dataStr.trim()

      // 跳过空数据
      if (!dataStr) return

      // 检查是否结束
      if (dataStr === '[DONE]') {
        return
      }

      // 直接传递纯文本内容
      onMessage && onMessage(dataStr)
    }
  }

  // 返回控制器
  return {
    abort: () => {
      if (requestTask) {
        requestTask.abort()
      }
    }
  }
}

/**
 * 轮询方式的流式聊天（降级方案）
 * 适用于不支持 enableChunked 的情况
 *
 * @param {Object} options 配置项
 */
function streamChatPolling(options) {
  const { messages, deepThinking = false, onMessage, onComplete, onError } = options

  const token = app.globalData.token
  let sessionId = null
  let isAborted = false
  let pollTimer = null

  // 首先发起聊天请求
  wx.request({
    url: `${app.globalData.baseUrl}/api/stream/chat/start`,
    method: 'POST',
    data: {
      messages,
      deepThinking
    },
    header: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    success: (res) => {
      if (res.statusCode === 200 && res.data.code === 0) {
        sessionId = res.data.data.sessionId
        startPolling()
      } else {
        onError && onError(new Error(res.data?.message || '启动对话失败'))
      }
    },
    fail: (err) => {
      onError && onError(err)
    }
  })

  /**
   * 开始轮询
   */
  function startPolling() {
    poll()
  }

  /**
   * 单次轮询
   */
  function poll() {
    if (isAborted || !sessionId) return

    wx.request({
      url: `${app.globalData.baseUrl}/api/stream/chat/next`,
      method: 'GET',
      data: { sessionId },
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (isAborted) return

        if (res.statusCode === 200 && res.data.code === 0) {
          const { content, done } = res.data.data

          if (content) {
            onMessage && onMessage(content)
          }

          if (done) {
            onComplete && onComplete()
          } else {
            // 继续轮询
            pollTimer = setTimeout(poll, 100)
          }
        } else {
          onError && onError(new Error(res.data?.message || '获取消息失败'))
        }
      },
      fail: (err) => {
        if (!isAborted) {
          onError && onError(err)
        }
      }
    })
  }

  return {
    abort: () => {
      isAborted = true
      if (pollTimer) {
        clearTimeout(pollTimer)
      }
    }
  }
}

/**
 * ArrayBuffer 转字符串
 * @param {ArrayBuffer} buffer
 */
function arrayBufferToString(buffer) {
  // 使用 TextDecoder 解码 UTF-8
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(buffer)
  }

  // 降级方案
  const uint8Array = new Uint8Array(buffer)
  let str = ''
  for (let i = 0; i < uint8Array.length; i++) {
    str += String.fromCharCode(uint8Array[i])
  }
  // 处理中文编码
  try {
    return decodeURIComponent(escape(str))
  } catch (e) {
    return str
  }
}

/**
 * 检查是否支持分块传输
 */
function isChunkedSupported() {
  const systemInfo = wx.getSystemInfoSync()
  const SDKVersion = systemInfo.SDKVersion || ''
  return compareVersion(SDKVersion, '2.20.2') >= 0
}

/**
 * 版本号比较
 */
function compareVersion(v1, v2) {
  const v1Parts = v1.split('.').map(Number)
  const v2Parts = v2.split('.').map(Number)

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const p1 = v1Parts[i] || 0
    const p2 = v2Parts[i] || 0
    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }
  return 0
}

/**
 * 智能选择流式方案
 */
function smartStreamChat(options) {
  if (isChunkedSupported()) {
    return streamChat(options)
  } else {
    return streamChatPolling(options)
  }
}

module.exports = {
  streamChat,
  streamChatPolling,
  smartStreamChat,
  isChunkedSupported
}
