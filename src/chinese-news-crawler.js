/**
 * 国内AI/机器人新闻爬虫脚本
 * 用于抓取36氪、机器之心、量子位、新智元等中文科技媒体的AI相关新闻
 */

const https = require('https');
const http = require('http');

// 国内信息源配置
const CHINESE_SOURCES = {
  // 通过API可获取的RSS源
  rss: [
    {
      name: '机器之心',
      url: 'https://www.jiqizhixin.com/rss',
      category: 'ai'
    },
    {
      name: 'AI科技评论',
      url: 'https://www.leiphone.com/rss',
      category: 'ai'
    }
  ],

  // 需要通过Jina AI Reader抓取的网站
  jina: [
    {
      name: '量子位',
      url: 'https://www.qbitai.com',
      category: 'ai'
    },
    {
      name: '新智元',
      url: 'https://www.jiqie.com',
      category: 'ai'
    },
    {
      name: '机器之心',
      url: 'https://www.jiqizhixin.com',
      category: 'ai'
    }
  ],

  // 备用：直接通过关键词搜索Google News中文版
  googleNewsCN: [
    '人工智能',
    '机器学习',
    '大模型',
    '机器人',
    '人形机器人'
  ]
};

// 获取RSS内容（通过rss2json API）
async function fetchRSS(rssUrl) {
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
  return new Promise((resolve, reject) => {
    https.get(apiUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'ok') {
            resolve(json.items.map(item => ({
              title: item.title,
              date: item.pubDate,
              link: item.link,
              description: item.description ? item.description.replace(/<[^>]*>/g, '').substring(0, 300) : '',
              source: 'rss'
            })));
          } else {
            resolve([]);
          }
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

// 通过Jina AI Reader获取网页内容
async function fetchViaJina(url) {
  const jinaUrl = `https://r.jina.ai/${url}`;
  return new Promise((resolve, reject) => {
    https.get(jinaUrl, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // 解析Jina返回的markdown格式内容，提取标题和链接
        const lines = data.split('\n');
        const items = [];
        let currentDate = new Date().toISOString().split('T')[0];

        for (const line of lines) {
          // 尝试匹配标题和链接
          const match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
          if (match && match[1].length > 5) {
            items.push({
              title: match[1],
              date: currentDate,
              link: match[2].startsWith('http') ? match[2] : url + match[2],
              description: '',
              source: 'jina'
            });
          }
          // 限制条目数量
          if (items.length >= 20) break;
        }
        resolve(items);
      });
    }).on('error', () => resolve([]))
      .setTimeout(15000, () => { resolve([]); });
  });
}

// 通过Google News搜索中文AI新闻
async function fetchGoogleNewsCN(keyword) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
  return fetchRSS(rssUrl);
}

// 去重函数：基于标题相似度
function deduplicateNews(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    // 标准化标题用于比较
    const normalizedTitle = item.title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]/g, '') // 只保留字母数字和中文
      .substring(0, 50); // 取前50个字符比较

    if (!seen.has(normalizedTitle)) {
      seen.add(normalizedTitle);
      result.push(item);
    }
  }

  return result;
}

// 与国外新闻去重合并
function mergeAndDeduplicate(chineseNews, foreignNews) {
  const allNews = [...chineseNews, ...foreignNews];

  // 按日期排序（最新在前）
  allNews.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 去重
  return deduplicateNews(allNews);
}

// 主函数：抓取所有国内新闻
async function fetchChineseNews() {
  console.log('开始抓取国内AI/机器人新闻...\n');

  const allNews = [];

  // 1. 尝试RSS源
  console.log('正在抓取RSS源...');
  for (const source of CHINESE_SOURCES.rss) {
    try {
      const items = await fetchRSS(source.url);
      console.log(`  ${source.name}: ${items.length} 条`);
      allNews.push(...items.map(item => ({ ...item, sourceName: source.name })));
    } catch (e) {
      console.log(`  ${source.name}: 抓取失败`);
    }
  }

  // 2. 尝试Jina AI Reader
  console.log('\n正在通过Jina Reader抓取...');
  for (const source of CHINESE_SOURCES.jina) {
    try {
      const items = await fetchViaJina(source.url);
      console.log(`  ${source.name}: ${items.length} 条`);
      allNews.push(...items.map(item => ({ ...item, sourceName: source.name })));
    } catch (e) {
      console.log(`  ${source.name}: 抓取失败`);
    }
  }

  // 3. Google News中文搜索作为补充
  console.log('\n正在搜索Google News中文版...');
  for (const keyword of CHINESE_SOURCES.googleNewsCN.slice(0, 3)) {
    try {
      const items = await fetchGoogleNewsCN(keyword);
      console.log(`  "${keyword}": ${items.length} 条`);
      allNews.push(...items.map(item => ({ ...item, sourceName: 'Google News' })));
    } catch (e) {
      console.log(`  "${keyword}": 抓取失败`);
    }
  }

  // 去重
  const deduplicated = deduplicateNews(allNews);
  console.log(`\n总计: ${allNews.length} 条 -> 去重后: ${deduplicated.length} 条`);

  return deduplicated;
}

// 导出模块
module.exports = {
  fetchChineseNews,
  deduplicateNews,
  mergeAndDeduplicate,
  CHINESE_SOURCES
};

// 如果直接运行此脚本
if (require.main === module) {
  fetchChineseNews().then(news => {
    console.log('\n抓取结果预览:');
    news.slice(0, 10).forEach((item, i) => {
      console.log(`${i + 1}. [${item.sourceName}] ${item.title}`);
    });
  });
}
