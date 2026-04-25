// pages/index/index.js - 首页（比赛列表）
const matchApi = require("../../api/match");
const dateUtils = require("../../utils/date");
const matchUtils = require("../../utils/match");
const userStore = require("../../store/user");
const userApi = require("../../api/user");
const leagueColor = require("../../store/leagueColor");

Page({
  data: {
    matches: [],
    groupedMatches: [],
    loading: false,
    refreshing: false,
    error: null,
    collapsedGroups: {},
    currentStatus: "",
    statusList: [
      { value: "", label: "全部" },
      { value: "2", label: "开放" },
      { value: "4", label: "进行中" },
      { value: "5", label: "已完成" },
    ],
    // 模拟选号按钮位置
    calculatorX: 500,
    calculatorY: 120,
    // 功能开关
    showCalculator: false, // 是否显示模拟选号按钮
  },

  onLoad() {
    this.checkFeatures();
    this.loadMatches();
  },

  onShow() {
    // 每次显示时刷新
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selectedPath: "/pages/index/index" });
    }

    // 如果从登录页返回，且有待分析的比赛
    const app = getApp();
    if (app.globalData.pendingAnalysisMatch && userStore.isLoggedIn()) {
      const pendingMatch = app.globalData.pendingAnalysisMatch;
      // 清除标记
      app.globalData.pendingAnalysisMatch = null;

      // 重新加载比赛列表以获取解锁状态
      this.loadMatches().then(() => {
        // 延迟触发分析
        setTimeout(() => {
          this.triggerAnalysisForMatch(pendingMatch);
        }, 500);
      });
    }
  },

  // 触发指定比赛的AI分析
  triggerAnalysisForMatch(targetMatch) {
    if (!targetMatch || !targetMatch.id) return;

    // 从当前列表中找到对应的比赛（包含最新的解锁状态）
    const match = this.data.matches.find((m) => m.id === targetMatch.id);
    if (!match) {
      console.error("未找到对应的比赛");
      return;
    }

    const userInfo = userStore.getUserInfo();
    if (!userInfo) return;

    // 如果未解锁，弹窗确认
    if (!match.isUnlocked) {
      const userPoints = userInfo.point || 0;
      const pointsNeeded = 1;

      if (userPoints < pointsNeeded) {
        wx.showModal({
          title: "积分不足",
          content: `AI分析需要消耗 ${pointsNeeded} 积分，您当前积分为 ${userPoints}，请做任务或者联系客服获取积分。`,
          confirmText: "我的页面",
          cancelText: "取消",
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({ url: "/pages/profile/index" });
            }
          },
        });
        return;
      }

      wx.showModal({
        title: "解锁AI分析",
        content: `本次分析将消耗 ${pointsNeeded} 积分，是否继续？`,
        confirmText: "确认",
        cancelText: "取消",
        success: async (res) => {
          if (res.confirm) {
            await this.unlockAndNavigate(match, userInfo.id, pointsNeeded);
          }
        },
      });
    } else {
      // 已解锁，直接跳转
      this.navigateToAnalysis(match);
    }
  },

  // 解锁并跳转
  async unlockAndNavigate(match, userId, points) {
    try {
      wx.showLoading({
        title: `消耗${points}积分中...`,
        mask: true,
      });

      const userApi = require("../../api/user");
      // 调用扣减积分接口
      await userApi.deductPoint(userId, points, match.id);

      // 重新拉取用户信息
      const latestUserInfo = await userApi.getUserInfoById(userId);
      if (latestUserInfo) {
        const app = getApp();
        app.globalData.userInfo = latestUserInfo;
        wx.setStorageSync("userInfo", latestUserInfo);
      }

      wx.hideLoading();

      // 显示成功提示
      wx.showToast({
        title: `消耗${points}积分`,
        icon: "success",
        duration: 1500,
      });

      // 更新本地解锁状态
      const updatedMatches = this.data.matches.map((m) =>
        m.id === match.id ? { ...m, isUnlocked: true } : m,
      );
      const updatedGroupedMatches = this.groupMatchesByWeekday(updatedMatches);
      this.setData({
        matches: updatedMatches,
        groupedMatches: updatedGroupedMatches,
      });

      // 延迟跳转
      setTimeout(() => {
        this.navigateToAnalysis(match);
      }, 1500);
    } catch (e) {
      wx.hideLoading();
      console.error("解锁失败:", e);
      wx.showToast({
        title: "解锁失败",
        icon: "error",
        duration: 2000,
      });
    }
  },

  // 跳转到AI分析页面
  navigateToAnalysis(match) {
    const matchInfo = encodeURIComponent(
      JSON.stringify({
        league: match.league,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
      }),
    );

    wx.navigateTo({
      url: `/pages/ai-analysis/index?matchId=${match.id}&matchInfo=${matchInfo}`,
    });
  },

  onPullDownRefresh() {
    this.checkFeatures();
    this.loadMatches().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 检查功能开关
  async checkFeatures() {
    try {
      const result = await matchApi.checkFeatures();
      console.log(result);
      const showCalculator = result === true;
      this.setData({ showCalculator });
    } catch (error) {
      console.error("检查功能开关失败:", error);
      // 失败时默认隐藏
      this.setData({ showCalculator: false });
    }
  },

  // 加载比赛列表
  async loadMatches() {
    const { currentStatus } = this.data;

    this.setData({ loading: true, error: null });

    try {
      const params = {};
      if (currentStatus) params.status = currentStatus;

      const res = await matchApi.getMatchList(params);

      // 兼容分页结构和数组结构
      const rawMatches = Array.isArray(res)
        ? res
        : res && res.list
          ? res.list
          : [];

      // 缓存联赛颜色
      leagueColor.batchSetColors(rawMatches);

      // 字段映射转换
      const matches = rawMatches.map((item) => ({
        id: item.matchId,
        matchNumStr: item.matchNumStr,
        matchNum: item.matchNum,
        league: item.leagueAbbName,
        leagueId: item.leagueId,
        leagueColor: item.backColor || leagueColor.getColor(item.leagueId),
        homeTeam: item.homeTeamAbbName,
        homeTeamFull: item.homeTeamAllName,
        homeTeamId: item.homeTeamId,
        homeTeamRank: item.homeTeamRank,
        homeTags: item.homeTags ? String(item.homeTags).split(",") : [],
        homeFormTrend: item.homeFormTrend || "",
        awayTeam: item.awayTeamAbbName,
        awayTeamFull: item.awayTeamAllName,
        awayTeamId: item.awayTeamId,
        awayTeamRank: item.awayTeamRank,
        awayTags: item.awayTags ? String(item.awayTags).split(",") : [],
        awayFormTrend: item.awayFormTrend || "",
        status: item.matchStatus,
        statusName: item.matchStatusName,
        matchDate: item.matchDate,
        matchTime: item.matchTime,
        fullMatchTime: `${item.matchDate} ${item.matchTime}`,
        isSingleMatch: item.isSingleMatch,
        odds: {
          home: item.homeWin,
          draw: item.draw,
          away: item.awayWin,
          hhome: item.hhomeWin,
          haway: item.hawayWin,
          hdraw: item.hdraw,
          goalLine: item.goalLine,
        },
      }));

      // 按周几分组
      const groupedMatches = this.groupMatchesByWeekday(matches);

      this.setData({
        matches,
        groupedMatches,
        loading: false,
      });

      // 如果已登录，批量查询解锁状态
      this.batchCheckUnlockStatus(matches);
    } catch (e) {
      console.error("加载比赛失败:", e);
      this.setData({
        loading: false,
        error: e.message || "加载失败",
      });
    }
  },

  // 批量查询解锁状态
  async batchCheckUnlockStatus(matches) {
    // 检查登录状态
    if (!userStore.isLoggedIn()) {
      return;
    }

    const userInfo = userStore.getUserInfo();
    if (!userInfo || !userInfo.id) {
      return;
    }

    try {
      // 提取所有比赛ID
      const matchIds = matches.map((m) => m.id).filter((id) => id);
      if (matchIds.length === 0) return;

      // 批量查询解锁状态
      const result = await userApi.batchCheckMatchUnlock(matchIds, userInfo.id);

      // 假设接口返回格式：{ matchId1: true, matchId2: false, ... }
      // 或者 [{ matchId: 'xxx', unlocked: true }, ...]
      const unlockMap = {};

      if (Array.isArray(result)) {
        // 数组格式
        result.forEach((item) => {
          unlockMap[item.matchId] = item.unlocked;
        });
      } else if (typeof result === "object") {
        // 对象格式
        //    console.log(result)

        Object.assign(unlockMap, result);
      }

      // 更新matches数据
      const updatedMatches = this.data.matches.map((match) => ({
        ...match,
        isUnlocked: unlockMap[match.id] || false,
      }));

      // 重新分组
      const updatedGroupedMatches = this.groupMatchesByWeekday(updatedMatches);

      this.setData({
        matches: updatedMatches,
        groupedMatches: updatedGroupedMatches,
      });
    } catch (e) {
      console.error("批量查询解锁状态失败:", e);
    }
  },

  // 切换分组折叠
  onToggleGroup(e) {
    const index = e.currentTarget.dataset.index;
    const key = `collapsedGroups.${index}`;
    this.setData({
      [key]: !this.data.collapsedGroups[index],
    });
  },

  // 切换状态筛选
  onStatusChange(e) {
    const status = e.currentTarget.dataset.status;
    if (status === this.data.currentStatus) return;

    this.setData({ currentStatus: status });
    this.loadMatches();
  },

  // 点击比赛卡片
  onMatchTap(e) {
    const { match } = e.detail;
    wx.navigateTo({
      url: `/pages/analysis/index?matchId=${match.id}`,
    });
  },

  // 点击 AI 分析
  onAnalyze(e) {
    const match = e.detail && e.detail.match;
    if (!match) {
      console.error("AI分析: match 数据为空", e);
      return;
    }
    const matchInfo = JSON.stringify({
      league: match.league,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
    });
    wx.navigateTo({
      url: `/pages/ai-chat/index?matchId=${match.id}&matchInfo=${encodeURIComponent(matchInfo)}`,
    });
  },

  // 跳转到模拟选号
  onCalculator() {
    // 检查登录状态，未登录则跳转登录页
    if (!userStore.isLoggedIn()) {
      wx.showToast({ title: "请先登录", icon: "none" });
      wx.navigateTo({
        url: "/pages/login/index",
      });
      return;
    }
    wx.navigateTo({
      url: "/pages/calculator/index",
    });
  },

  // 模拟选号按钮拖动
  onCalculatorMove(e) {
    // 记录最新位置，防止tap事件被误触
    this._lastMoveTime = Date.now();
  },

  // 重试加载
  onRetry() {
    this.loadMatches();
  },

  // 按周几分组比赛
  groupMatchesByWeekday(matches) {
    const groups = {};
    const dateMap = {}; // 记录每个周几对应的日期

    matches.forEach((match) => {
      // 从 matchNumStr 提取周几，如 "周二004" -> "周二"
      const weekday = match.matchNumStr
        ? match.matchNumStr.replace(/\d+/g, "")
        : "其他";
      if (!groups[weekday]) {
        groups[weekday] = [];
      }
      groups[weekday].push(match);
      // 记录该周的第一场比赛的日期（格式：MM-DD）
      if (!dateMap[weekday] && match.matchDate) {
        // 从 "2026-03-26" 提取 "03-26"
        const dateParts = match.matchDate.split("-");
        if (dateParts.length >= 3) {
          dateMap[weekday] = `${dateParts[1]}-${dateParts[2]}`;
        }
      }
    });
    // 按周几顺序排序，以当天为起点
    const fullWeekOrder = [
      "周一",
      "周二",
      "周三",
      "周四",
      "周五",
      "周六",
      "周日",
    ];
    const today = new Date();
    const todayWeekday = today.getDay(); // 0(周日) ~ 6(周一)

    // 转换为中文周几（1-7: 周一-周日，0也是周一）
    const weekdayIndex = todayWeekday === 0 ? 6 : todayWeekday - 1; // 0-6: 周一-周日

    // 从当天开始的周顺序
    const weekOrder = [
      ...fullWeekOrder.slice(weekdayIndex),
      ...fullWeekOrder.slice(0, weekdayIndex),
      "其他",
    ];

    return Object.keys(groups)
      .sort((a, b) => weekOrder.indexOf(a) - weekOrder.indexOf(b))
      .map((weekday) => ({
        league: weekday,
        date: dateMap[weekday] || "",
        matches: groups[weekday].sort((a, b) => a.matchNum - b.matchNum),
      }));
  },
});
