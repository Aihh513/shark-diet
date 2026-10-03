# 鲨鱼循环饮食计算器 - 全栈版部署指南

## 架构概览

```
前端 (React + Vite + Tailwind)
    │
    └─→ /api/*  (同域相对路径)
            │
            ├─ 开发环境：Vite 中间件 → server/api/*.ts
            └─ 生产环境：Vercel Serverless Functions → api/**/*.ts
                    │
                    ├─ 营养数据代理：USDA FoodData Central + Open Food Facts
                    └─ 数据持久化：PostgreSQL (Neon / Vercel Postgres)
```

## 免费资源清单

| 资源 | 平台 | 免费额度 | 注册地址 |
|------|------|---------|----------|
| 前端 + Serverless 后端 | Vercel Hobby | 无限站点 + 10万请求/月 | https://vercel.com |
| PostgreSQL 数据库 | Neon Free | 0.5GB 存储 + 100小时/月计算 | https://neon.tech |
| 营养数据库 API Key | USDA FoodData Central | 免费无限（需注册） | https://fdc.nal.usda.gov/api-key-signup.html |
| 营养数据库（免 Key） | Open Food Facts | 完全免费开源 | https://world.openfoodfacts.org |

## 环境变量配置

复制 `.env.example` 为 `.env.local`（开发）或在 Vercel 平台配置：

```bash
# PostgreSQL 连接串（Neon 控制台复制）
# 示例：postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
DATABASE_URL=

# USDA FoodData Central API Key
USDA_API_KEY=
```

**不配置会怎样？**
- `DATABASE_URL` 缺失：使用内存数据库，数据不持久化（开发演示可用）
- `USDA_API_KEY` 缺失：USDA 搜索跳过，仅使用 Open Food Facts（无需 key）

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（可选）
cp .env.example .env.local
# 编辑 .env.local 填入 API Key

# 3. 启动开发服务器
npm run dev
```

- 前端：http://localhost:5173
- API：http://localhost:5173/api/*

开发模式下后端 API 通过 Vite 中间件直接执行 `server/api/**/*.ts`，无需额外启动 Node 服务。

## 部署到 Vercel

### 方式一：CLI 部署（推荐）

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署（首次会引导配置项目名等）
vercel --prod
```

### 方式二：Git 集成

1. 将代码推送到 GitHub / GitLab / Bitbucket
2. 在 Vercel 控制台 Import Project
3. Framework Preset 选 **Vite**
4. 配置环境变量（Settings → Environment Variables）：
   - `DATABASE_URL`
   - `USDA_API_KEY`
5. 触发部署

### 验证部署

部署完成后，访问：
```
https://你的项目名.vercel.app/api/nutrition/search?q=chicken
```

应该返回 JSON 格式的营养搜索结果。

## 数据库初始化

首次部署后，数据库表会在**第一次访问 API 时自动创建**（`CREATE TABLE IF NOT EXISTS`）。

如需手动初始化，可执行 `server/db.ts` 中的 `DB_SCHEMA` SQL 语句。

## 数据迁移（从 localStorage 到后端）

1. 打开部署后的应用
2. 如果后端可用，应用会自动检测并提示「是否将本地数据同步到云端」
3. 点击确认后，以下数据会迁移到后端：
   - 个人参数（身高/体重/年龄等）
   - 自定义食物库
   - 当天饮食记录
   - 训练日/休息日模式

迁移后数据将存储在 PostgreSQL 中，跨设备访问同一账号即可同步。

## 免费额度限制与应对

| 限制项 | 数值 | 应对策略 |
|--------|------|---------|
| Neon 计算时间 | 100小时/月 | 闲置自动暂停；冷启动约 1-3s |
| USDA API | 1000次/小时 | 后端做结果缓存（预留） |
| Open Food Facts | 100次/分钟 | 后端限流（预留） |
| Vercel Serverless | 10万次/月 | 合理使用，静态资源走 CDN |

## 后期付费架构扩展点

代码已预留以下扩展位，上线付费功能时无需重构：

1. **用户表 `users`**：`plan` 字段（free/pro/premium），可直接接入飞书/微信/邮箱登录
2. **Stripe 订阅**：可新增 `subscriptions` 表关联用户
3. **角色权限**：用户表可扩展角色字段
4. **API 用量统计**：可新增 `api_usage` 表做付费配额管理
5. **自定义食物库云端同步**：已有 `custom_foods` 表按用户隔离

## API 接口列表

### 营养数据（无需鉴权，走后端代理）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/nutrition/search?q=关键词` | 搜索 USDA + Open Food Facts |
| GET | `/api/nutrition/barcode?code=条码` | 条码查询品牌食品 |

### 用户参数

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/params` | 获取参数 |
| POST | `/api/user/params` | 保存参数 |

### 自定义食物

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/foods` | 列表 |
| POST | `/api/foods` | 新增 |
| PUT | `/api/foods/:id` | 修改 |
| DELETE | `/api/foods/:id` | 删除 |

### 每日饮食记录

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/daily?date=YYYY-MM-DD` | 获取某天记录 |
| POST | `/api/daily/mode` | 设置当天模式（training/rest） |
| POST | `/api/daily/entries` | 全量替换当天条目 |

### 数据迁移

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/migrate/local` | 将 localStorage 数据批量导入后端 |

## 常见问题

**Q: 为什么不直接在前端调用 USDA API？**
A: USDA API Key 如果放在前端会泄露到浏览器，任何人都能 F12 看到并盗用。必须走后端代理。

**Q: Open Food Facts 不是免 Key 吗，为什么也走后端？**
A: 1) 统一数据格式和错误处理；2) 后端可加缓存和限流，避免被 OFF 封禁；3) 为后续添加更多数据源预留统一入口。

**Q: 没有数据库能运行吗？**
A: 可以。不配置 `DATABASE_URL` 时自动使用内存数据库，数据只在进程内存中，重启即丢。适合演示和测试。

**Q: 我想用 Supabase / Vercel Postgres / Railway 可以吗？**
A: 可以。任何支持 PostgreSQL 的服务都可以，只要把连接串填到 `DATABASE_URL` 即可。
