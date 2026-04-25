// pages/match-result/index.js - 赛果列表
const matchApi = require("../../api/match");
const leagueColor = require("../../store/leagueColor");

Page({
  data: {
    activeTab: "result", // result: 赛果, live: 比分直播
    results: [],
    liveMatches: [],
    loading: true,
    error: null,
    expandedId: null,
  },

  onLoad() {
    this.loadResults();
  },

  onShow() {
    // 设置tabBar选中状态
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selectedPath: "/pages/match-result/index" });
    }
    if (this.data.activeTab === "result") {
      this.loadResults();
    } else {
      this.loadLiveMatches();
    }
  },

  // 切换 Tab
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;

    this.setData({ activeTab: tab, expandedId: null });

    if (tab === "result") {
      this.loadResults();
    } else {
      this.loadLiveMatches();
    }
  },

  // 加载赛果列表
  async loadResults() {
    this.setData({ loading: true, error: null });
    try {
      const res = await matchApi.getMatchResults();
      const results = res.data || res || [];

      // 缓存联赛颜色
      leagueColor.batchSetColors(results);

      const processedResults = results.map((item) => {
        const score = item.crsResult;
        // 兼容不同的联赛字段名
        const lgId = item.leagueId || item.leagueCode || item.league_id;
        const lgName = item.leagueName || item.leagueAbbName;

        // 获取联赛颜色：优先接口返回 -> 按ID查缓存 -> 按名称查缓存 -> 默认色
        const displayColor =
          item.backColor ||
          leagueColor.getColor(lgId, null) ||
          leagueColor.getColor(lgName, null) ||
          "667eea";

        return {
          ...item,
          statusClass: this.getStatusClass(item.matchStatus),
          fullScore: this.formatScore(score),
          halfScore: this.formatScore(item.sectionsNo1 || item.halfScore),
          displayDate: this.formatDate(item.matchDate),
          displayTime: item.matchTime || "--:--",
          displayColor,
        };
      });

      this.setData({ results: processedResults, loading: false });
    } catch (error) {
      console.error("加载赛果失败:", error);
      this.setData({ loading: false, error: "加载失败，请重试" });
    }
  },

  // 加载比分直播列表
  async loadLiveMatches() {
    this.setData({ loading: true, error: null });
    try {
      const res = await matchApi.getMatchLive();
      const matches = res.data || res || [];

      // 缓存联赛颜色
      leagueColor.batchSetColors(matches);

      const processedMatches = matches.map((item) => ({
        ...item,
        displayDate: this.formatDate(item.matchDate),
        displayTime: item.matchTime ? item.matchTime.substring(0, 5) : "--:--",
        // 优先使用接口返回的颜色，否则从缓存读取
        displayColor: item.backColor || leagueColor.getColor(item.leagueId),
        // 处理事件列表
        events: (item.eventList || []).map((event) => ({
          ...event,
          eventName: this.getEventName(event.eventCode),
          isHome: event.teamType === "home",
        })),
      }));

      this.setData({ liveMatches: processedMatches, loading: false });
    } catch (error) {
      console.error("加载比分直播失败:", error);
      this.setData({ loading: false, error: "加载失败，请重试" });
    }
  },

  // 获取事件名称
  getEventName(eventCode) {
    const eventMap = {
      G: "进球",
      PG: "点球",
      OG: "乌龙球",
      Y: "黄牌",
      R: "红牌",
      S: "换人",
    };
    return eventMap[eventCode] || eventCode;
  },

  // 获取状态样式类
  getStatusClass(status) {
    const statusMap = {
      0: "upcoming",
      1: "ongoing",
      2: "finished",
      6: "finished",
    };
    return statusMap[status] || "unknown";
  },

  // 格式化比分
  formatScore(score) {
    if (!score) return "-";
    return score;
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return "--";
    try {
      const date = new Date(dateStr);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${month}-${day}`;
    } catch (e) {
      return dateStr;
    }
  },

  // 切换展开状态
  onToggleExpand(e) {
    const matchId = e.currentTarget.dataset.matchid;
    const isExpanded = this.data.expandedId === matchId;
    this.setData({
      expandedId: isExpanded ? null : matchId,
    });
  },

  // 重试加载
  onRetry() {
    if (this.data.activeTab === "result") {
      this.loadResults();
    } else {
      this.loadLiveMatches();
    }
  },

  // 刷新
  onRefresh() {
    wx.showToast({ title: "刷新中...", icon: "loading", duration: 500 });
    if (this.data.activeTab === "result") {
      this.loadResults();
    } else {
      this.loadLiveMatches();
    }
  },
});
