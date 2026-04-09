/**
 * AI新闻日报生成脚本
 * 调用新闻收集器并生成Markdown报告
 */

const fs = require('fs');
const path = require('path');
const { collectAllNews, categorizeNews, deduplicateNews } = require('./news-collector');

// 报告输出目录
const REPORTS_DIR = path.join(__dirname, '..', 'reports', 'daily');

// 确保目录存在
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// 获取今天日期
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 格式化日期为中文
function formatDateChinese(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekday = weekdays[date.getDay()];
  return `${year}年${month}月${day}日 星期${weekday}`;
}

// 生成Markdown报告
function generateMarkdownReport(result, date) {
  const { categorized, total } = result;

  let md = `# AI及机器人研究日报\n`;
  md += `## ${formatDateChinese(date)}\n\n`;
  md += `---\n\n`;

  // 一、宏观趋势
  if (categorized.macro && categorized.macro.length > 0) {
    md += `## 一、宏观趋势\n\n`;
    categorized.macro.forEach(item => {
      md += formatNewsItem(item);
    });
    md += `\n---\n\n`;
  }

  // 二、AI技术及应用
  md += `## 二、AI技术及应用\n\n`;

  // 2.1 算力基础
  if (categorized.compute && categorized.compute.length > 0) {
    md += `### 2.1 算力基础\n`;
    categorized.compute.forEach(item => {
      md += formatNewsItem(item);
    });
    md += `\n`;
  }

  // 2.2 模型发展
  if (categorized.model && categorized.model.length > 0) {
    md += `### 2.2 模型发展\n`;
    categorized.model.forEach(item => {
      md += formatNewsItem(item);
    });
    md += `\n`;
  }

  // 2.3 智能应用
  if (categorized.application && categorized.application.length > 0) {
    md += `### 2.3 智能应用\n`;
    const apps = categorized.application.slice(0, 15); // 限制数量
    apps.forEach(item => {
      md += formatNewsItem(item);
    });
    if (categorized.application.length > 15) {
      md += `\n*...还有 ${categorized.application.length - 15} 条应用相关资讯*\n`;
    }
    md += `\n`;
  }

  // 2.4 智能终端
  if (categorized.terminal && categorized.terminal.length > 0) {
    md += `### 2.4 智能终端\n`;
    categorized.terminal.forEach(item => {
      md += formatNewsItem(item);
    });
    md += `\n`;
  }

  // 2.5 投资并购
  if (categorized.investment && categorized.investment.length > 0) {
    md += `### 2.5 投资并购\n`;
    categorized.investment.forEach(item => {
      md += formatNewsItem(item);
    });
    md += `\n`;
  }

  // 2.6 产业落地
  if (categorized.industry && categorized.industry.length > 0) {
    md += `### 2.6 产业落地\n`;
    categorized.industry.forEach(item => {
      md += formatNewsItem(item);
    });
    md += `\n`;
  }

  md += `---\n\n`;

  // 三、机器人技术及应用
  if (categorized.robotics && categorized.robotics.length > 0) {
    md += `## 三、机器人技术及应用\n\n`;
    md += `### 3.1 终端产品\n`;
    categorized.robotics.slice(0, 10).forEach(item => {
      md += formatNewsItem(item);
    });
    if (categorized.robotics.length > 10) {
      md += `\n*...还有 ${categorized.robotics.length - 10} 条机器人相关资讯*\n`;
    }
    md += `\n---\n\n`;
  }

  // 四、学术研究
  if (categorized.research && categorized.research.length > 0) {
    md += `## 四、学术研究\n\n`;
    categorized.research.forEach(item => {
      md += formatNewsItem(item);
    });
    md += `\n---\n\n`;
  }

  // 五、社区技术讨论
  if (categorized.community && categorized.community.length > 0) {
    md += `## 五、社区技术讨论\n\n`;
    const discussions = categorized.community.slice(0, 10);
    discussions.forEach(item => {
      md += formatNewsItem(item, true);
    });
    if (categorized.community.length > 10) {
      md += `\n*...还有 ${categorized.community.length - 10} 条社区讨论*\n`;
    }
    md += `\n---\n\n`;
  }

  md += `*本报告由 AI News Reporter 自动生成*\n`;
  md += `*生成时间: ${new Date().toLocaleString('zh-CN')}*\n`;

  return md;
}

// 格式化单条新闻
function formatNewsItem(item, simple = false) {
  const sourceTag = item.source === 'chinese' ? '国内' : '国际';
  let md = ``;

  if (simple) {
    md += `- **${item.title}** [${item.sourceName}]\n`;
    md += `  ${item.description.substring(0, 150)}${item.description.length > 150 ? '...' : ''}\n`;
    md += `  [查看详情](${item.link})\n\n`;
  } else {
    md += `### 【${item.sourceName}】${item.title}\n`;
    md += `${item.description.substring(0, 200)}${item.description.length > 200 ? '...' : ''}\n\n`;
    md += `🔗 [阅读原文](${item.link})\n\n`;
  }

  return md;
}

// 主函数
async function main() {
  console.log('==================================================');
  console.log('AI新闻日报生成器');
  console.log(`日期: ${getTodayDate()}`);
  console.log('==================================================\n');

  try {
    // 收集新闻
    const result = await collectAllNews();

    if (result.total === 0) {
      console.log('⚠️ 未收集到新闻，跳过报告生成');
      return;
    }

    // 生成报告
    const date = getTodayDate();
    const markdown = generateMarkdownReport(result, date);

    // 保存文件
    const filename = `${date}.md`;
    const filepath = path.join(REPORTS_DIR, filename);

    fs.writeFileSync(filepath, markdown, 'utf8');

    console.log('\n==================================================');
    console.log(`✅ 报告生成成功!`);
    console.log(`📄 文件: ${filepath}`);
    console.log(`📊 新闻数量: ${result.total} 条`);
    console.log('==================================================');

    return { success: true, filepath, total: result.total };

  } catch (error) {
    console.error('❌ 生成报告失败:', error.message);
    return { success: false, error: error.message };
  }
}

// 导出
module.exports = { main, generateMarkdownReport };

// 直接运行
if (require.main === module) {
  main();
}
