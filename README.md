# AI News Reporter Template

AI及机器人新闻自动收集与日报生成工具模板仓库。

## 功能特性

- 📰 **多源聚合**：自动收集国内外AI/机器人新闻
- 🔄 **智能去重**：跨语言去重，合并重复报道
- 📊 **自动分类**：按领域智能分类整理
- ⏰ **定时任务**：支持每日自动生成报告
- 📝 **结构化输出**：生成Markdown格式日报

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/your-username/ai-news-reporter-template.git
cd ai-news-reporter-template
```

### 2. 运行收集

```bash
npm run collect
```

### 3. 查看报告

报告将生成在 `reports/daily/YYYY-MM-DD.md`

## 信息源配置

### 国际信息源（RSS）

| 来源 | 类型 | 状态 |
|------|------|------|
| TechCrunch AI | 科技媒体 | ✅ |
| MIT Technology Review | 科技媒体 | ✅ |
| Hacker News | 技术社区 | ✅ |
| Nature Machine Intelligence | 学术期刊 | ✅ |
| Reddit r/artificial | 社区讨论 | ✅ |
| Reddit r/MachineLearning | 学术讨论 | ✅ |
| Reddit r/Robotics | 机器人社区 | ✅ |
| Google News AI | 新闻聚合 | ✅ |

### 国内信息源（Google News中文）

| 关键词 | 类型 |
|--------|------|
| 人工智能 | 综合 |
| 大模型 GPT | 模型 |
| 机器人 人形机器人 | 机器人 |
| 机器学习 深度学习 | 技术 |

## 报告结构

生成的日报包含以下分类：

```
一、宏观趋势
   - 政策、监管、伦理、就业影响

二、AI技术及应用
   - 2.1 算力基础（数据中心、芯片、GPU）
   - 2.2 模型发展（大模型、训练、算法）
   - 2.3 智能应用（软件、SaaS、产品）
   - 2.4 智能终端（AI硬件产品）
   - 2.5 投资并购
   - 2.6 产业落地（企业AI应用）

三、机器人技术及应用
   - 3.1 终端产品
   - 3.2 核心技术
   - 3.3 产业落地

四、学术研究

五、社区技术讨论
```

## 定时任务配置

### 方式一：Claude Code 定时任务

在 Claude Code 中执行：

```
/loop 10h npm run collect
```

### 方式二：系统 Cron

```bash
# Linux/Mac
0 10 * * * cd /path/to/ai-news-reporter && npm run collect

# Windows Task Scheduler
# 创建每日10点执行 npm run collect 的任务
```

### 方式三：GitHub Actions

创建 `.github/workflows/daily-report.yml`：

```yaml
name: Daily AI News Report
on:
  schedule:
    - cron: '0 2 * * *'  # UTC 2:00 = 北京 10:00
  workflow_dispatch:  # 手动触发

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run collect
      - uses: actions/upload-artifact@v4
        with:
          name: daily-report
          path: reports/daily/
      - uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: report-${{ github.run_id }}
          release_name: AI News Report ${{ github.run_id }}
          draft: false
          prerelease: false
```

## 自定义配置

### 添加信息源

编辑 `src/news-collector.js`：

```javascript
// 在 INTERNATIONAL_SOURCES.rss 中添加
{ name: '新来源名称', url: 'RSS地址', category: '分类' }

// 在 CHINESE_SOURCES.googleNews 中添加
{ keyword: '搜索关键词', lang: 'zh-CN' }
```

### 修改分类规则

在 `src/news-collector.js` 中修改 `categorizeNews` 函数的 `keywords` 对象。

### 自定义报告模板

修改 `src/news-collector.js` 中的报告生成逻辑。

## 与 Claude Code 集成

### 1. 创建 Agent

将 `src/agent-template.md` 复制到 `~/.claude/agents/` 目录。

### 2. 配置定时任务

在 Claude Code 中：

```
每天10点帮我生成AI新闻日报
```

Claude Code 会自动创建定时任务。

## 输出示例

```markdown
# AI及机器人研究日报
## 2026年4月8日

---

## 一、宏观趋势

### 【政策】黑龙江省国资委发布"人工智能+"专项行动方案
4月8日，黑龙江省国资委印发《省国资委出资企业"人工智能+"专项行动方案》...

### 【研究】"认知投降"现象引发关注
最新研究发现AI用户存在过度依赖现象...

---

*本报告由 AI News Reporter 自动生成*
```

## 前端展示页面

项目包含一个Web前端，供其他用户浏览和下载日报。

### 本地预览

```bash
npm run serve
# 访问 http://localhost:3000
```

### 部署到GitHub Pages

1. 推送代码到GitHub
2. 进入仓库 Settings > Pages
3. Source选择 `main` 分支，目录选择 `/frontend`
4. 访问 `https://your-username.github.io/ai-news-reporter-template/`

### 前端功能

| 功能 | 描述 |
|------|------|
| 📄 报告列表 | 展示所有日报 |
| 🔍 搜索过滤 | 按日期/关键词搜索 |
| 📥 下载 | 一键下载Markdown文件 |
| 📋 复制 | 复制报告内容 |
| 🔔 通知 | 浏览器推送提醒 |

详细部署说明见 [frontend/DEPLOY.md](frontend/DEPLOY.md)

## 技术栈

- **Runtime**: Node.js 14+
- **Data Source**: RSS (rss2json API)
- **Output**: Markdown
- **Automation**: Claude Code / Cron / GitHub Actions

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

---

*Made with ❤️ by Claude Code*
