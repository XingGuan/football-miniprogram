// pages/history/index.js - 历史记录页面
const historyApi = require("../../api/history");
const userStore = require("../../store/user");

Page({
  data: {
    currentTab: "history", // history: 历史记录, models: 模型统计
    // 历史记录相关
    list: [],
    loading: false,
    refreshing: false,
    hasMore: true,
    pageNo: 1,
    pageSize: 20,
    total: 0,
    error: null,
    // 模型统计相关
    models: [],
    modelsLoading: false,
    modelsError: null,
    // 统计详情弹窗相关
    showStatsDetail: false,
    statsDetail: null,
    statsLoading: false,
    statsError: null,
    selectedModel: null,
  },

  onLoad() {
    console.log("======== 历史记录页面 onLoad ========");
    // 默认加载历史记录
    this.loadHistory();
  },

  onShow() {
    console.log("======== 历史记录页面 onShow ========");
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selectedPath: "/pages/history/index" });
    }
    // 每次显示页面时刷新数据，确保显示最新内容
    if (this.data.list.length > 0) {
      console.log("列表已有数据，执行刷新");
      this.refreshHistory();
    }
  },

  // 切换Tab（已禁用，只保留历史记录）
  // onTabChange(e) {
  //   const tab = e.currentTarget.dataset.tab
  //   if (tab === this.data.currentTab) return

  //   this.setData({ currentTab: tab })

  //   // 切换到该tab时自动刷新数据
  //   if (tab === 'history') {
  //     this.refreshHistory()
  //   } else if (tab === 'models') {
  //     this.refreshModels()
  //   }
  // },

  onPullDownRefresh() {
    this.refreshHistory().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  // 加载历史记录
  async loadHistory() {
    console.log("开始加载历史记录", {
      pageNo: this.data.pageNo,
      pageSize: this.data.pageSize,
    });
    this.setData({ loading: true, error: null });

    try {
      const { pageNo, pageSize } = this.data;
      console.log("调用 API: /api/analysis/history/list", { pageNo, pageSize });
      const result = await historyApi.getHistoryList({ pageNo, pageSize });
      console.log("API 返回结果:", result);

      const { list = [], total = 0 } = result || {};

      // 按照时间倒序排列（最新的在前）
      if (Array.isArray(list)) {
        list.sort((a, b) => {
          const timeA = new Date(a.createTime || a.matchTime || 0).getTime();
          const timeB = new Date(b.createTime || b.matchTime || 0).getTime();
          return timeB - timeA;
        });
      }

      this.setData({
        list,
        total,
        hasMore: list.length >= pageSize,
        loading: false,
      });
    } catch (e) {
      console.error("加载历史记录失败:", e);
      this.setData({
        loading: false,
        error: e.message || "加载失败",
      });
    }
  },

  // 刷新
  async refreshHistory() {
    console.log("刷新历史记录");
    this.setData({
      pageNo: 1,
      refreshing: true,
    });

    await this.loadHistory();

    this.setData({ refreshing: false });
  },

  // 加载更多
  async loadMore() {
    if (!this.data.hasMore || this.data.loading) return;

    const { pageNo, pageSize, list } = this.data;

    this.setData({ loading: true });

    try {
      const result = await historyApi.getHistoryList({
        pageNo: pageNo + 1,
        pageSize,
      });

      const { list: newList = [] } = result || {};

      this.setData({
        list: [...list, ...newList],
        pageNo: pageNo + 1,
        hasMore: newList.length >= pageSize,
        loading: false,
      });
    } catch (e) {
      console.error("加载更多失败:", e);
      this.setData({ loading: false });
      wx.showToast({
        title: "加载失败",
        icon: "none",
      });
    }
  },

  // 点击历史记录
  onItemTap(e) {
    // 检查登录状态
    if (!userStore.isLoggedIn()) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
      wx.navigateTo({
        url: "/pages/login/index",
      });
      return;
    }

    const { record } = e.detail;
    const matchId = record && record.matchId;
    wx.navigateTo({
      url: `/pages/history-detail/index?id=` + matchId,
    });
  },

  // 重试
  onRetry() {
    this.loadHistory();
  },

  // 以下模型统计相关方法已禁用
  // async loadModels() {
  //   this.setData({ modelsLoading: true, modelsError: null })
  //   try {
  //     const data = await historyApi.getModelList()
  //     const models = data.data || data || []
  //     this.setData({ models, modelsLoading: false })
  //   } catch (error) {
  //     console.error('加载模型列表失败:', error)
  //     this.setData({ modelsLoading: false, modelsError: error.message || '加载失败' })
  //   }
  // }
});
