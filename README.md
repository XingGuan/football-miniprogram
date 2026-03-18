# AI 足球智能体小程序

一款基于微信小程序的智能足球分析助手，提供 AI 驱动的比赛分析、赛事预测和历史记录管理功能。

## 功能特性

### 核心功能

- **比赛列表** - 查看即将开始的足球比赛，支持按日期筛选
- **AI 智能分析** - 基于大语言模型的比赛深度分析，支持流式输出
- **历史记录** - 查看历史分析记录，包含赛前分析和赛后复盘
- **用户中心** - 账号管理、设置和协议查看

### 技术亮点

- 流式 SSE 对话，实时展示 AI 分析结果
- Markdown 内容渲染，支持富文本展示
- 分页加载，优化长列表性能
- 响应式设计，适配多种屏幕尺寸

## 项目结构

```
football-miniprogram/
├── api/                    # API 接口层
│   ├── index.js           # 请求封装
│   ├── user.js            # 用户相关接口
│   ├── match.js           # 比赛相关接口
│   ├── analysis.js        # 分析相关接口
│   ├── history.js         # 历史记录接口
│   ├── stream.js          # 流式对话接口
│   └── quickQuestions.js  # 快捷问题接口
│
├── components/            # 公共组件
│   ├── match-card/        # 比赛卡片
│   ├── history-card/      # 历史记录卡片
│   ├── message-bubble/    # 消息气泡
│   ├── markdown-viewer/   # Markdown 渲染器
│   ├── typing-text/       # 打字效果文本
│   ├── quick-questions/   # 快捷问题
│   └── empty-state/       # 空状态
│
├── pages/                 # 页面
│   ├── index/             # 首页（比赛列表）
│   ├── ai-chat/           # AI 对话
│   ├── ai-analysis/       # AI 分析详情
│   ├── analysis/          # 分析页
│   ├── history/           # 历史记录列表
│   ├── history-detail/    # 历史记录详情
│   ├── profile/           # 个人中心
│   ├── login/             # 登录页
│   ├── agreement/         # 用户协议/隐私政策
│   └── tool/              # 工具页
│
├── store/                 # 状态管理
│   └── user.js            # 用户状态
│
├── utils/                 # 工具函数
│   ├── date.js            # 日期处理
│   ├── match.js           # 比赛数据处理
│   └── markdown.js        # Markdown 解析
│
├── styles/                # 公共样式
│   ├── variables.wxss     # 样式变量
│   └── common.wxss        # 公共样式
│
├── images/                # 图片资源
│   ├── logo.png           # 应用 Logo
│   ├── icons/             # 图标
│   └── tabbar/            # TabBar 图标
│
├── app.js                 # 应用入口
├── app.json               # 应用配置
├── app.wxss               # 全局样式
├── project.config.json    # 项目配置
└── sitemap.json           # 小程序索引配置
```

## 页面说明

| 页面 | 路径 | 说明 |
|------|------|------|
| 比赛列表 | `/pages/index/index` | TabBar 页面，展示比赛列表 |
| AI 对话 | `/pages/ai-chat/index` | AI 智能助手对话 |
| 历史记录 | `/pages/history/index` | TabBar 页面，分析历史列表 |
| 历史详情 | `/pages/history-detail/index` | 历史记录详情，支持赛前/赛后切换 |
| 个人中心 | `/pages/profile/index` | TabBar 页面，用户设置 |
| 登录 | `/pages/login/index` | 手机号验证码登录 |
| 协议 | `/pages/agreement/index` | 用户协议和隐私政策 |

## API 接口

### 基础配置

```javascript
// app.js
globalData: {
  baseUrl: 'https://your-api-domain.com'
}
```

### 主要接口

| 模块 | 接口 | 方法 | 说明 |
|------|------|------|------|
| 用户 | `/api/user/sendSms` | POST | 发送验证码 |
| 用户 | `/api/user/login` | POST | 登录 |
| 用户 | `/api/user/info` | GET | 获取用户信息 |
| 比赛 | `/api/match/list` | GET | 获取比赛列表 |
| 分析 | `/api/analysis/history/list` | POST | 获取历史列表 |
| 分析 | `/api/analysis/history/:id` | GET | 获取历史详情 |
| 对话 | `/api/stream/chat` | POST | 流式对话 |

### 历史记录数据结构

```typescript
interface HistoryRecord {
  id: string;           // 记录 ID
  matchId: string;      // 比赛 ID
  homeTeam: string;     // 主队
  awayTeam: string;     // 客队
  matchTime: string;    // 比赛时间
  homeWin: string;      // 主胜赔率
  draw: string;         // 平局赔率
  awayWin: string;      // 客胜赔率
  aiAnalysis: string;   // AI 赛前分析
  aiScore: string;      // AI 预测比分
  aiResult: string;     // AI 预测结果
  matchResult: string;  // 实际比赛结果
  afterMatchAnalysis: string; // 赛后复盘
  createTime: string;   // 创建时间
}
```

## 开发指南

### 环境要求

- 微信开发者工具 >= 1.06
- 基础库 >= 2.20.2（支持流式请求）

### 本地开发

1. 克隆项目
```bash
git clone <repository-url>
cd football-miniprogram
```

2. 打开微信开发者工具，导入项目

3. 配置 API 地址
```javascript
// app.js
globalData: {
  baseUrl: 'https://your-api-domain.com'
}
```

4. 配置合法域名
   - 在小程序后台配置 request 合法域名

### 注意事项

- 流式请求需要基础库 2.20.2+，低版本会自动降级为轮询方式
- 图片资源需要放在 `/images` 目录下
- TabBar 图标尺寸建议 81x81

## 版本历史

### v1.0.0

- 初始版本
- 比赛列表展示
- AI 智能分析对话
- 历史记录管理
- 用户登录注册

## 许可证

本项目仅供学习交流使用，请勿用于商业用途。

## 联系方式

如有问题，请通过小程序内的反馈功能联系我们。
