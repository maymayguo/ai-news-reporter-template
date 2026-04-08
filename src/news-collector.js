/**
 * 统一新闻收集脚本
 * 合并国内外信息源，进行智能去重和分类
 */

const https = require('https');

// 国际信息源配置
const INTERNATIONAL_SOURCES = {
  rss: [
    { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', category: 'ai' },
    { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', category: 'ai' },
    { name: 'Hacker News', url: 'https://hnrss.org/frontpage', category: 'tech' },
    { name: 'Nature Machine Intelligence', url: 'https://www.nature.com/natmachintell.rss', category: 'academic' },
    { name: 'Reddit r/artificial', url: 'https://www.reddit.com/r/artificial/.rss', category: 'community' },
    { name: 'Reddit r/MachineLearning', url: 'https://www.reddit.com/r/MachineLearning/.rss', category: 'community' },
    { name: 'Reddit r/Robotics', url: 'https://www.reddit.com/r/Robotics/.rss', category: 'robotics' }
  ],
  googleNews: [
    { keyword: 'AI artificial intelligence', lang: 'en' },
    { keyword: 'robotics humanoid robot', lang: 'en' }
  ]
};

// 国内信息源配置
const CHINESE_SOURCES = {
  googleNews: [
    { keyword: '人工智能', lang: 'zh-CN' },
    { keyword: '大模型 GPT', lang: 'zh-CN' },
    { keyword: '机器人 人形机器人', lang: 'zh-CN' },
    { keyword: '机器学习 深度学习', lang: 'zh-CN' }
  ]
};

// RSS获取函数
async function fetchRSS(rssUrl) {
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
  return new Promise((resolve) => {
    const req = https.get(apiUrl, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'ok') {
            resolve(json.items.map(item => ({
              title: cleanTitle(item.title),
              date: item.pubDate,
              link: item.link,
              description: cleanDescription(item.description || item.content || ''),
              source: 'international'
            })));
          } else {
            resolve([]);
          }
        } catch (e) {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(10000, () => { req.destroy(); resolve([]); });
  });
}

// Google News搜索
async function fetchGoogleNews(keyword, lang = 'en') {
  const hl = lang === 'zh-CN' ? 'zh-CN' : 'en-US';
  const gl = lang === 'zh-CN' ? 'CN' : 'US';
  const ceid = lang === 'zh-CN' ? 'CN:zh-Hans' : 'US:en';

  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
  const items = await fetchRSS(rssUrl);
  return items.map(item => ({
    ...item,
    source: lang === 'zh-CN' ? 'chinese' : 'international'
  }));
}

// 清理标题
function cleanTitle(title) {
  return title
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// 清理描述
function cleanDescription(desc) {
  return desc
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500);
}

// 标题标准化（用于去重比较）
function normalizeTitle(title) {
  return title
    .toLowerCase()
    // 移除常见的中英文停用词
    .replace(/^(the|a|an|【|「|『|\[)/i, '')
    .replace(/(】|」|』|\])$/i, '')
    // 只保留字母数字和中文
    .replace(/[^\w\u4e00-\u9fa5]/g, '')
    .substring(0, 60);
}

// 提取关键词
function extractKeywords(title) {
  const keywords = [];
  const aiKeywords = [
    // 英文关键词
    'openai', 'anthropic', 'google', 'microsoft', 'meta', 'nvidia', 'deepmind',
    'chatgpt', 'gpt', 'claude', 'gemini', 'llama', 'gemma',
    'llm', 'ai', 'machine learning', 'deep learning', 'neural network',
    'robot', 'robotics', 'humanoid', 'boston dynamics', 'tesla',
    // 中文关键词
    '人工智能', '机器学习', '深度学习', '大模型', '语言模型',
    '机器人', '人形机器人', '具身智能',
    '开放ai', '谷歌', '微软', '英伟达', '百度', '阿里', '腾讯', '字节'
  ];

  const lowerTitle = title.toLowerCase();
  for (const kw of aiKeywords) {
    if (lowerTitle.includes(kw.toLowerCase())) {
      keywords.push(kw);
    }
  }
  return keywords;
}

// 判断是否为同一新闻（跨语言去重）
function isSameNews(item1, item2) {
  const norm1 = normalizeTitle(item1.title);
  const norm2 = normalizeTitle(item2.title);

  // 如果标准化后的标题完全相同
  if (norm1 === norm2 && norm1.length > 10) return true;

  // 提取关键词比较
  const kw1 = extractKeywords(item1.title);
  const kw2 = extractKeywords(item2.title);

  // 如果有3个以上相同关键词，可能是同一新闻
  const commonKw = kw1.filter(k => kw2.includes(k));
  if (commonKw.length >= 3) return true;

  // 检查公司名+事件组合
  const companies = ['openai', 'anthropic', 'google', 'microsoft', 'meta', 'nvidia', 'tesla'];
  for (const company of companies) {
    if (norm1.includes(company) && norm2.includes(company)) {
      // 同一公司的新闻，检查是否相似
      const similarity = calculateSimilarity(norm1, norm2);
      if (similarity > 0.5) return true;
    }
  }

  return false;
}

// 计算字符串相似度
function calculateSimilarity(str1, str2) {
  const len = Math.max(str1.length, str2.length);
  if (len === 0) return 1;

  const shorter = str1.length < str2.length ? str1 : str2;
  const longer = str1.length >= str2.length ? str1 : str2;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter.substring(i, i + 3))) {
      matches++;
    }
  }

  return matches / (shorter.length - 2);
}

// 去重函数
function deduplicateNews(items) {
  const result = [];
  const seen = new Set();

  // 按日期排序（最新在前）
  items.sort((a, b) => new Date(b.date) - new Date(a.date));

  for (const item of items) {
    const normalizedKey = normalizeTitle(item.title);

    // 检查是否已存在相似新闻
    let isDuplicate = false;
    for (const seenItem of result) {
      if (isSameNews(item, seenItem)) {
        isDuplicate = true;
        // 如果是重复的，保留信息更完整的版本
        if ((item.description?.length || 0) > (seenItem.description?.length || 0)) {
          const idx = result.indexOf(seenItem);
          result[idx] = item;
        }
        break;
      }
    }

    if (!isDuplicate && normalizedKey.length > 5) {
      result.push(item);
    }
  }

  return result;
}

// 分类新闻
function categorizeNews(items) {
  const categories = {
    macro: [],       // 宏观趋势（政策、伦理、就业）
    compute: [],     // 算力基础（数据中心、芯片、GPU、算力设施）
    model: [],       // 模型发展（大模型、训练、算法）
    application: [], // 智能应用（软件、SaaS、知名产品）
    terminal: [],    // 智能终端（AI硬件产品）
    investment: [],  // 投资并购
    industry: [],    // 产业落地（企业AI应用动态）
    robotics: [],    // 机器人
    research: []     // 学术研究
  };

  const keywords = {
    macro: ['policy', 'regulation', 'economy', 'jobs', 'policy', '政策', '监管', '经济', '就业', 'ethics', '伦理', 'cognitive surrender', '认知'],
    compute: ['chip', 'gpu', 'nvidia', 'datacenter', 'compute', '芯片', '算力', '数据中心', 'tpu', 'cpu', 'broadcom', 'infrastructure', '基础设施', 'hardware'],
    model: ['gpt', 'claude', 'gemini', 'llama', 'llm', 'model', 'training', '大模型', '模型', '训练', 'diffusion', 'attention', 'transformer', 'algorithm'],
    application: ['app', 'product', 'launch', 'release', '应用', '产品', '发布', '上线', 'copilot', 'chatgpt', 'software', 'saas', 'platform', '平台', 'mckinsey', 'rocket'],
    terminal: ['device', 'hardware', 'phone', 'iphone', 'wearable', '硬件', '设备', '终端', 'gemma', 'offline', 'local'],
    investment: ['fund', 'invest', 'acquire', 'raise', '投资', '融资', '收购', '并购', 'ipo', 'series', 'xoople', 'zero shot'],
    industry: ['enterprise', 'adopt', 'deploy', 'implement', '企业', '落地', '部署', '应用', 'kuaishou', '快手', 'recommend', '推荐', 'pharmacy', 'finance', 'bond'],
    robotics: ['robot', 'humanoid', 'autonomous', '机器人', '人形', '自动驾驶', 'boston', 'tesla bot', 'unitree', 'ubtech', '优必选', '宇树'],
    research: ['paper', 'arxiv', 'nature', 'science', '论文', '研究', '突破', 'discovery', 'tdfold', 'protein']
  };

  for (const item of items) {
    const titleLower = item.title.toLowerCase();
    let assigned = false;

    for (const [category, kws] of Object.entries(keywords)) {
      if (kws.some(kw => titleLower.includes(kw.toLowerCase()))) {
        categories[category].push(item);
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      categories.application.push(item); // 默认分类
    }
  }

  return categories;
}

// 主收集函数
async function collectAllNews() {
  console.log('='.repeat(50));
  console.log('开始收集AI/机器人新闻');
  console.log(new Date().toLocaleString('zh-CN'));
  console.log('='.repeat(50));

  const allNews = [];

  // 1. 收集国际RSS源
  console.log('\n📡 国际信息源:');
  for (const source of INTERNATIONAL_SOURCES.rss) {
    const items = await fetchRSS(source.url);
    console.log(`  ✓ ${source.name}: ${items.length} 条`);
    allNews.push(...items.map(item => ({ ...item, sourceName: source.name })));
  }

  // 2. Google News英文
  console.log('\n📡 Google News (英文):');
  for (const query of INTERNATIONAL_SOURCES.googleNews) {
    const items = await fetchGoogleNews(query.keyword, query.lang);
    console.log(`  ✓ "${query.keyword}": ${items.length} 条`);
    allNews.push(...items.map(item => ({ ...item, sourceName: 'Google News' })));
  }

  // 3. Google News中文
  console.log('\n📡 Google News (中文):');
  for (const query of CHINESE_SOURCES.googleNews) {
    const items = await fetchGoogleNews(query.keyword, query.lang);
    console.log(`  ✓ "${query.keyword}": ${items.length} 条`);
    allNews.push(...items.map(item => ({ ...item, sourceName: 'Google News中文' })));
  }

  // 4. 去重
  console.log('\n🔄 去重处理...');
  const beforeDedup = allNews.length;
  const deduplicated = deduplicateNews(allNews);
  console.log(`  ${beforeDedup} 条 → ${deduplicated.length} 条 (去除 ${beforeDedup - deduplicated.length} 条重复)`);

  // 5. 分类
  console.log('\n📊 新闻分类:');
  const categorized = categorizeNews(deduplicated);
  for (const [category, items] of Object.entries(categorized)) {
    if (items.length > 0) {
      console.log(`  ${category}: ${items.length} 条`);
    }
  }

  return {
    total: deduplicated.length,
    items: deduplicated,
    categorized
  };
}

// 导出
module.exports = {
  collectAllNews,
  deduplicateNews,
  categorizeNews,
  fetchRSS,
  fetchGoogleNews
};

// 直接运行
if (require.main === module) {
  collectAllNews().then(result => {
    console.log('\n' + '='.repeat(50));
    console.log(`收集完成，共 ${result.total} 条新闻`);
    console.log('='.repeat(50));

    // 预览前10条
    console.log('\n最新10条:');
    result.items.slice(0, 10).forEach((item, i) => {
      console.log(`${i + 1}. [${item.sourceName}] ${item.title.substring(0, 60)}...`);
    });
  });
}
