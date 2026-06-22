# 🚀 鱼皮热点监控 - 保姆级本地运行指南

> 从零开始，手把手带你跑起来
> 最后更新：2026-06

---

## 前置条件

在开始之前，请确保你的电脑已安装：

| 工具 | 最低版本 | 验证命令 | 安装方式 |
|------|---------|---------|---------|
| **Node.js** | 18+ | `node -v` | https://nodejs.org |
| **npm** | 9+ | `npm -v` | 随 Node.js 安装 |
| **Git** | 任意 | `git --version` | https://git-scm.com |

---

## 第一步：获取代码

```bash
# 克隆仓库
git clone <your-repo-url> huzi-hot-monitor
cd huzi-hot-monitor
```

---

## 第二步：安装依赖

```bash
npm install
```

> ⏱️ 首次安装约 1-2 分钟，取决于网络速度。如果慢，可设置淘宝镜像：
> ```bash
> npm config set registry https://registry.npmmirror.com
> ```

---

## 第三步：配置环境变量

### 3.1 复制模板

```bash
cp .env.example .env.local
```

### 3.2 编辑 `.env.local`

用你喜欢的编辑器打开 `.env.local`，填入以下配置：

```env
# ===== AI 服务 (必填) =====
# 获取地址: https://platform.acedata.cloud → 注册 → 获取 API Key
ACEDATA_API_KEY=你的acedata_api_key

# ===== Twitter API (必填) =====
# 获取地址: https://twitterapi.io → 注册 → 获取 API Key
TWITTER_API_KEY=你的twitter_api_key

# ===== 邮件通知 (可选，不配也能用) =====
# 获取地址: https://resend.com → 注册 → 获取 API Key
RESEND_API_KEY=re_你的resend_key

# 通知邮箱 (可选)
NOTIFY_EMAIL=your@email.com
```

### 3.3 各 Key 获取方式

#### Acedata API Key（必填）

1. 访问 https://platform.acedata.cloud
2. 注册并登录
3. 进入控制台 → API Keys → 创建新 Key
4. 复制 Key 到 `.env.local` 的 `ACEDATA_API_KEY`

#### Twitter API Key（必填）

1. 访问 https://twitterapi.io
2. 注册并登录
3. 进入 Dashboard → 复制 API Key
4. 粘贴到 `.env.local` 的 `TWITTER_API_KEY`

#### Resend API Key（可选）

1. 访问 https://resend.com
2. 注册并登录
3. 进入 API Keys → 创建新 Key
4. 填入 `RESEND_API_KEY` 和 `NOTIFY_EMAIL`
5. **不配置也能正常使用**，只是没有邮件通知，浏览器通知照常

> 💡 **最低配置**：只填 `ACEDATA_API_KEY` 和 `TWITTER_API_KEY` 即可启动项目

---

## 第四步：启动开发服务器

```bash
npm run dev
```

你会看到：

```
▲ Next.js 16.2.9 (Turbopack)
- Local:         http://localhost:3000
- Environments: .env.local
✓ Ready in 999ms
```

打开浏览器访问 **http://localhost:3000** 🎉

---

## 第五步：验证功能

### 5.1 基础页面

访问 http://localhost:3000，你应该看到：
- ✅ 深色主题的监控仪表盘
- ✅ 顶部滚动热点头条 (Marquee)
- ✅ 热点列表卡片

### 5.2 数据获取

在浏览器地址栏访问：

```
http://localhost:3000/api/trends?q=AI&limit=10
```

应返回 JSON 格式的热点数据。

### 5.3 关键词监控

1. 在左侧面板输入关键词（如 "GPT"），按 Enter 添加
2. 点击 "开始监控" 按钮
3. 等待系统自动匹配（约 5 分钟轮询一次）
4. 匹配成功后会弹出浏览器通知 🔔

### 5.4 AI 功能

1. 点击任意热点卡片 → 打开详情弹窗
2. 点击 "AI 验证" → 检测是否为虚假内容
3. 右侧面板显示 AI 自动生成的热点摘要

### 5.5 测试 AI 连通性

```bash
npx tsx lib/test-acedata.ts
```

应输出三个模型的测试结果（✅ 或 ❌）。

---

## 常见问题

### ❌ `ACEDATA_API_KEY` 未设置

**现象**：AI 功能全部报错，控制台提示 "所有AI模型均不可用"

**解决**：
1. 确认 `.env.local` 文件存在于项目根目录
2. 确认 `ACEDATA_API_KEY=` 后面有实际值（不是占位符）
3. 重启开发服务器（`Ctrl+C` → `npm run dev`）
4. `.env.local` 修改后必须重启才生效

### ❌ Twitter API 报错

**现象**：`/api/trends` 返回的数据中没有 Twitter 来源

**解决**：
1. 确认 `TWITTER_API_KEY` 正确
2. 检查 twitterapi.io 账户余额
3. 项目仍可使用，只是没有 Twitter 数据，网页搜索照常

### ❌ 端口 3000 被占用

**现象**：`Error: listen EADDRINUSE: address already in use :::3000`

**解决**：
```bash
# 方法1：指定其他端口
npx next dev -p 3001

# 方法2：杀掉占用进程 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### ❌ npm install 失败

**解决**：
```bash
# 清除缓存重试
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### ❌ 浏览器通知不弹出

**解决**：
1. 确认浏览器已授权通知权限（地址栏左侧锁图标 → 通知 → 允许）
2. 确认系统通知权限已开启（Windows 设置 → 通知）
3. Chrome 需要在 `chrome://settings/content/notifications` 中允许

### ❌ 网页搜索无结果

**解决**：
1. Bing/DDG 爬虫依赖 HTML 结构，可能因反爬暂时失效
2. 尝试换个关键词搜索
3. 等待 5 分钟缓存过期后重试

---

## 项目结构速查

```
huzi-hot-monitor/
├── app/                    # Next.js 页面和 API 路由
│   ├── page.tsx            # 主页面（仪表盘）
│   ├── layout.tsx          # 根布局
│   └── api/                # 后端 API
│       ├── trends/         #   聚合热点
│       ├── search/         #   网页搜索
│       ├── twitter/        #   Twitter
│       ├── ai/             #   AI 功能
│       ├── notify/         #   通知
│       └── skills/         #   Agent Skills
├── components/             # React 组件
│   ├── ui/                 #   基础 UI 组件 (shadcn + Magic UI)
│   ├── trends/             #   热点相关组件
│   ├── monitor/            #   监控相关组件
│   └── layout/             #   布局组件
├── lib/                    # 核心逻辑
│   ├── ai.ts               #   AI 集成 (Acedata.cloud)
│   ├── sources/            #   数据源
│   │   ├── web-search.ts   #     网页搜索爬虫
│   │   └── twitter.ts      #     Twitter API
│   ├── notify.ts           #   通知工具
│   ├── store.ts            #   localStorage 管理
│   └── use-monitor.ts      #   监控 Hook
├── types/                  # TypeScript 类型
├── docs/                   # 文档
├── .env.local              # 环境变量（不提交）
└── .env.example            # 环境变量模板
```

---

## 其他命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint 检查 |
| `npx tsx lib/test-acedata.ts` | 测试 Acedata AI 连通性 |

---

## 部署到 Vercel（可选）

1. 将代码推送到 GitHub
2. 访问 https://vercel.com → 导入项目
3. 在 Vercel 项目设置 → Environment Variables 中添加：
   - `ACEDATA_API_KEY`
   - `TWITTER_API_KEY`
   - `RESEND_API_KEY`（可选）
   - `NOTIFY_EMAIL`（可选）
4. 点击 Deploy

> 💡 Vercel 免费额度足够个人使用

---

## 技术栈一览

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router + Turbopack) | 16.2.9 |
| 语言 | TypeScript | 5.x |
| UI | React + shadcn/ui + Magic UI | React 19.2.4 |
| 样式 | Tailwind CSS | 4.x |
| 动画 | Motion (Framer Motion) | 12.x |
| AI | Acedata.cloud aichat2 API | — |
| 数据源 | cheerio (爬虫) + twitterapi.io | — |
| 通知 | Web Notification API + Resend | — |
| 存储 | localStorage | — |
| 部署 | Vercel (推荐) | — |
