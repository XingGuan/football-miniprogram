// api/index.js - 请求封装
const app = getApp()

// 默认配置
const defaultConfig = {
  timeout: 45000,
  showLoading: true,
  showError: true,
  retryCount: 0
}

/**
 * 基础请求方法
 * @param {Object} options 请求配置
 * @returns {Promise}
 */
function request(options) {
  const config = { ...defaultConfig, ...options }
  const { url, method = 'GET', data, header = {}, showLoading, showError, retryCount } = config

  // 获取 token
  const token = app.globalData.token

  // 构建请求头
  const headers = {
    'Content-Type': 'application/json',
    ...header
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // 显示加载
  if (showLoading) {
    wx.showLoading({
      title: '加载中...',
      mask: true
    })
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.baseUrl}${url}`,
      method,
      data,
      header: headers,
      timeout: config.timeout,
      success: (res) => {
        if (showLoading) {
          wx.hideLoading()
        }

        const { statusCode, data: responseData } = res

        // HTTP 状态码检查
        if (statusCode >= 200 && statusCode < 300) {
          // 业务码检查
          if (responseData.code === 0) {
            resolve(responseData.data)
          } else if (responseData.code === 401) {
            // Token 过期或未授权
            handleUnauthorized()
            reject(new Error(responseData.message || '登录已过期'))
          } else {
            // 其他业务错误
            if (showError) {
              wx.showToast({
                title: responseData.message || '请求失败',
                icon: 'none',
                duration: 2000
              })
            }
            reject(new Error(responseData.message || '请求失败'))
          }
        } else if (statusCode === 401) {
          handleUnauthorized()
          reject(new Error('登录已过期'))
        } else {
          if (showError) {
            wx.showToast({
              title: `请求失败 (${statusCode})`,
              icon: 'none',
              duration: 2000
            })
          }
          reject(new Error(`HTTP Error: ${statusCode}`))
        }
      },
      fail: (err) => {
        if (showLoading) {
          wx.hideLoading()
        }

        // 重试逻辑
        if (retryCount > 0) {
          return request({
            ...config,
            retryCount: retryCount - 1
          }).then(resolve).catch(reject)
        }

        if (showError) {
          wx.showToast({
            title: err.errMsg || '网络错误',
            icon: 'none',
            duration: 2000
          })
        }
        reject(err)
      }
    })
  })
}

/**
 * 处理未授权状态
 */
function handleUnauthorized() {
  app.clearLoginState()

  // 获取当前页面
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const currentRoute = currentPage ? currentPage.route : ''

  // 非登录页才跳转
  if (currentRoute !== 'pages/login/index') {
    wx.navigateTo({
      url: '/pages/login/index'
    })
  }
}

/**
 * GET 请求
 */
function get(url, params = {}, config = {}) {
  // 构建查询字符串
  const queryString = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')

  const fullUrl = queryString ? `${url}?${queryString}` : url

  return request({
    url: fullUrl,
    method: 'GET',
    ...config
  })
}

/**
 * POST 请求
 */
function post(url, data = {}, config = {}) {
  return request({
    url,
    method: 'POST',
    data,
    ...config
  })
}

/**
 * PUT 请求
 */
function put(url, data = {}, config = {}) {
  return request({
    url,
    method: 'PUT',
    data,
    ...config
  })
}

/**
 * DELETE 请求
 */
function del(url, data = {}, config = {}) {
  return request({
    url,
    method: 'DELETE',
    data,
    ...config
  })
}

module.exports = {
  request,
  get,
  post,
  put,
  delete: del
}
