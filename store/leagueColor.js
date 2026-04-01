// store/leagueColor.js - 联赛颜色缓存管理

const STORAGE_KEY = 'league_colors'

/**
 * 获取所有联赛颜色缓存
 */
function getAll() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || {}
  } catch (e) {
    return {}
  }
}

/**
 * 获取指定联赛的颜色
 * @param {string} key 联赛ID或联赛名称
 * @param {string} defaultColor 默认颜色，传null则不返回默认值
 */
function getColor(key, defaultColor = '667eea') {
  if (!key) return defaultColor
  const colors = getAll()
  return colors[key] || defaultColor
}

/**
 * 设置联赛颜色
 * @param {string} leagueId 联赛ID
 * @param {string} color 颜色值（不带#）
 */
function setColor(leagueId, color) {
  if (!leagueId || !color) return
  const colors = getAll()
  colors[leagueId] = color
  try {
    wx.setStorageSync(STORAGE_KEY, colors)
  } catch (e) {
    console.error('保存联赛颜色失败:', e)
  }
}

/**
 * 批量设置联赛颜色
 * @param {Array} matches 比赛列表，包含 leagueId 和 backColor
 */
function batchSetColors(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return

  const colors = getAll()
  let updated = false

  matches.forEach(match => {
    // 兼容不同的字段名
    const leagueId = match.leagueId || match.leagueCode || match.league_id
    const leagueName = match.leagueName || match.leagueAbbName || match.league
    const color = match.backColor || match.leagueColor || match.color

    if (color) {
      // 同时用 leagueId 和 leagueName 作为 key 缓存
      if (leagueId) {
        colors[leagueId] = color
        updated = true
      }
      if (leagueName) {
        colors[leagueName] = color
        updated = true
      }
    }
  })

  if (updated) {
    try {
      wx.setStorageSync(STORAGE_KEY, colors)
    } catch (e) {
      console.error('批量保存联赛颜色失败:', e)
    }
  }
}

/**
 * 清除缓存
 */
function clear() {
  try {
    wx.removeStorageSync(STORAGE_KEY)
  } catch (e) {
    console.error('清除联赛颜色缓存失败:', e)
  }
}

module.exports = {
  getAll,
  getColor,
  setColor,
  batchSetColors,
  clear
}
