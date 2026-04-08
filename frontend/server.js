/**
 * 简单的静态文件服务器
 * 用于本地开发或部署
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.join(__dirname, '..'); // 项目根目录
const FRONTEND_DIR = __dirname; // frontend目录
const REPORTS_DIR = path.join(ROOT_DIR, 'reports/daily');

// MIME类型映射
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.md': 'text/markdown; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0]; // 移除查询参数

    // API端点：获取报告列表
    if (urlPath === '/api/reports') {
        handleReportsAPI(res);
        return;
    }

    // 处理报告文件请求
    if (urlPath.startsWith('/reports/')) {
        const filePath = path.join(ROOT_DIR, urlPath);
        serveFile(filePath, res);
        return;
    }

    // 处理根路径
    let filePath;
    if (urlPath === '/') {
        filePath = path.join(FRONTEND_DIR, 'index.html');
    } else {
        // 优先在frontend目录查找
        filePath = path.join(FRONTEND_DIR, urlPath);
        if (!fs.existsSync(filePath)) {
            // 再在根目录查找
            filePath = path.join(ROOT_DIR, urlPath);
        }
    }

    serveFile(filePath, res);
});

// 处理报告列表API
function handleReportsAPI(res) {
    try {
        const files = fs.readdirSync(REPORTS_DIR);
        const reports = files
            .filter(f => f.endsWith('.md') && f !== 'README.md' && !f.startsWith('EXAMPLE'))
            .map(f => {
                const stat = fs.statSync(path.join(REPORTS_DIR, f));
                return {
                    name: f,
                    size: stat.size,
                    url: `/reports/daily/${f}`
                };
            })
            .sort((a, b) => b.name.localeCompare(a.name));

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(reports));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read reports' }));
    }
}

// 提供静态文件
function serveFile(filePath, res) {
    // 安全检查：防止目录遍历
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(ROOT_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('File not found');
        return;
    }

    // 获取文件扩展名
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // 读取文件
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500);
            res.end('Server error');
            return;
        }

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
    });
}

// 启动服务器
server.listen(PORT, () => {
    console.log('===========================================');
    console.log('  AI新闻日报服务已启动');
    console.log('===========================================');
    console.log(`  本地访问: http://localhost:${PORT}`);
    console.log(`  报告目录: ${REPORTS_DIR}`);
    console.log('  按 Ctrl+C 停止服务');
    console.log('===========================================');
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});
