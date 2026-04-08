# 前端部署指南

本文档说明如何部署AI新闻日报的前端页面。

## 本地开发

```bash
# 进入前端目录
cd frontend

# 启动本地服务器
node server.js

# 或使用项目根目录命令
npm run serve
```

访问 http://localhost:3000

## 部署方式

### 方式一：GitHub Pages（推荐）

1. **启用GitHub Pages**
   - 进入仓库 Settings > Pages
   - Source选择 `Deploy from a branch`
   - Branch选择 `main`，目录选择 `/frontend`
   - 点击Save

2. **修改配置**
   编辑 `frontend/app.js`，更新仓库地址：
   ```javascript
   const CONFIG = {
       repo: 'your-username/ai-news-reporter-template',
       branch: 'main',
       reportsPath: 'reports/daily',
       // ...
   };
   ```

3. **访问地址**
   ```
   https://your-username.github.io/ai-news-reporter-template/
   ```

### 方式二：GitHub Actions自动部署

创建 `.github/workflows/deploy-pages.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: 'frontend'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 方式三：Vercel/Netlify

**Vercel:**
```bash
# 安装Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

**Netlify:**
1. 连接GitHub仓库
2. Build命令: 留空
3. Publish目录: `frontend`

### 方式四：Docker

创建 `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY frontend/ ./frontend/
COPY reports/ ./reports/

EXPOSE 3000

CMD ["node", "frontend/server.js"]
```

构建并运行：
```bash
docker build -t ai-news-reporter .
docker run -p 3000:3000 ai-news-reporter
```

## 配置说明

### API配置

前端需要配置后端API地址：

```javascript
// app.js
const CONFIG = {
    // GitHub API（公开仓库免费）
    githubApi: 'https://api.github.com',

    // 或自建API
    customApi: 'https://your-api.com/api',

    // 代理服务（解决跨域）
    proxy: 'https://corsproxy.io/?'
};
```

### 自定义域名

在 `frontend/` 目录创建 `CNAME` 文件：
```
ai-news.yourdomain.com
```

## 功能特性

- 📄 报告列表展示
- 🔍 内容搜索过滤
- 📥 一键下载Markdown
- 📋 复制到剪贴板
- 🔔 浏览器通知
- 📱 响应式设计

## 注意事项

1. **跨域问题**
   - GitHub API有速率限制
   - 建议使用GitHub Pages托管
   - 或配置CORS代理

2. **更新频率**
   - GitHub Actions每天执行一次
   - 前端页面自动获取最新报告

3. **存储限制**
   - GitHub仓库有大小限制
   - 定期清理旧报告
