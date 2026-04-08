/**
 * AI新闻日报前端应用
 * 功能：展示报告列表、查看详情、下载文件
 */

// 配置
const CONFIG = {
    // GitHub仓库配置
    repo: 'maymayguo/ai-news-reporter-template',
    branch: 'main',
    reportsPath: 'reports/daily',

    // API端点（使用GitHub API）
    githubApi: 'https://api.github.com',

    // 本地存储键
    storageKey: 'ai-news-preferences'
};

// 应用状态
const state = {
    reports: [],
    currentReport: null,
    filteredReports: [],
    loading: true
};

// DOM元素
const elements = {
    reportList: document.getElementById('reportList'),
    searchInput: document.getElementById('searchInput'),
    categoryFilter: document.getElementById('categoryFilter'),
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    closeModal: document.getElementById('closeModal'),
    downloadBtn: document.getElementById('downloadBtn'),
    copyBtn: document.getElementById('copyBtn'),
    totalReports: document.getElementById('totalReports'),
    totalNews: document.getElementById('totalNews'),
    lastUpdate: document.getElementById('lastUpdate')
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    // 显示加载状态
    showLoading();

    // 加载报告列表
    await loadReports();

    // 绑定事件
    bindEvents();

    // 请求通知权限
    requestNotificationPermission();
}

// 加载报告列表
async function loadReports() {
    try {
        // 优先使用GitHub API，失败则回退到本地数据
        let data;
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            data = await getGitHubReports();
        } else {
            data = await getLocalReports();
        }

        state.reports = data.filter(file =>
            file.name.endsWith('.md') && file.name !== 'README.md' && file.name !== 'EXAMPLE.md'
        ).map(file => ({
            name: file.name,
            date: parseDateFromFilename(file.name),
            url: getFileUrl(file.name),
            size: file.size || 0
        })).sort((a, b) => b.date.localeCompare(a.date));

        state.filteredReports = [...state.reports];

        // 更新统计
        updateStats();

        // 渲染列表
        renderReportList();

    } catch (error) {
        console.error('加载报告失败:', error);
        showError('无法加载报告列表，请稍后重试');
    } finally {
        state.loading = false;
    }
}

// 获取本地报告（从服务器读取）
async function getLocalReports() {
    try {
        // 从本地服务器获取reports目录下的文件列表
        const response = await fetch('/api/reports');
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.log('API not available, using fallback');
    }

    // 回退：模拟数据
    return [
        { name: '2026-04-08.md', size: 10274 },
        { name: '2026-04-03_to_2026-04-07.md', size: 24168 }
    ];
}

// 从GitHub API获取报告（实际部署用）
async function getGitHubReports() {
    try {
        const response = await fetch(
            `${CONFIG.githubApi}/repos/${CONFIG.repo}/contents/${CONFIG.reportsPath}?ref=${CONFIG.branch}`
        );
        if (!response.ok) throw new Error('API Error');
        return await response.json();
    } catch (error) {
        console.warn('GitHub API failed, using local data');
        return getLocalReports();
    }
}

// 从文件名解析日期
function parseDateFromFilename(filename) {
    const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
}

// 获取文件URL
function getFileUrl(filename) {
    // 本地服务器路径
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `/reports/daily/${filename}`;
    }
    // GitHub raw文件URL
    return `https://raw.githubusercontent.com/${CONFIG.repo}/${CONFIG.branch}/${CONFIG.reportsPath}/${filename}`;
}

// 更新统计数据
function updateStats() {
    elements.totalReports.textContent = state.reports.length;
    elements.totalNews.textContent = state.reports.length * 80 + '+'; // 估算
    elements.lastUpdate.textContent = state.reports[0]?.date || '-';
}

// 渲染报告列表
function renderReportList() {
    if (state.filteredReports.length === 0) {
        elements.reportList.innerHTML = `
            <div class="empty-state">
                <div class="icon">📭</div>
                <p>暂无报告</p>
            </div>
        `;
        return;
    }

    elements.reportList.innerHTML = state.filteredReports.map(report => `
        <div class="report-item" data-filename="${report.name}">
            <div class="report-info">
                <div class="date">${formatDate(report.date)}</div>
                <div class="summary">AI及机器人研究日报</div>
            </div>
            <button class="download-btn" onclick="event.stopPropagation(); downloadReport('${report.url}', '${report.name}')">
                📥 下载
            </button>
        </div>
    `).join('');
}

// 格式化日期
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    return date.toLocaleDateString('zh-CN', options);
}

// 绑定事件
function bindEvents() {
    // 搜索
    elements.searchInput.addEventListener('input', debounce(filterReports, 300));

    // 分类筛选
    elements.categoryFilter.addEventListener('change', filterReports);

    // 点击报告项
    elements.reportList.addEventListener('click', (e) => {
        const item = e.target.closest('.report-item');
        if (item) {
            const filename = item.dataset.filename;
            openReport(filename);
        }
    });

    // 关闭模态框
    elements.closeModal.addEventListener('click', closeModal);
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) closeModal();
    });

    // 下载按钮
    elements.downloadBtn.addEventListener('click', () => {
        if (state.currentReport) {
            downloadReport(state.currentReport.url, state.currentReport.name);
        }
    });

    // 复制按钮
    elements.copyBtn.addEventListener('click', () => {
        if (state.currentReport) {
            copyReportContent();
        }
    });

    // ESC关闭模态框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// 筛选报告
function filterReports() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const category = elements.categoryFilter.value;

    state.filteredReports = state.reports.filter(report => {
        // 日期匹配
        const matchSearch = report.date.includes(searchTerm) || searchTerm === '';

        // 分类匹配（简化版，实际需要解析报告内容）
        const matchCategory = category === 'all';

        return matchSearch && matchCategory;
    });

    renderReportList();
}

// 打开报告
async function openReport(filename) {
    const report = state.reports.find(r => r.name === filename);
    if (!report) return;

    state.currentReport = report;

    // 显示模态框
    elements.modalTitle.textContent = formatDate(report.date);
    elements.modalBody.innerHTML = '<div class="loading">加载中...</div>';
    elements.modal.classList.add('active');

    try {
        // 加载报告内容
        const content = await fetchReportContent(report.url);

        // 渲染Markdown
        elements.modalBody.innerHTML = renderMarkdown(content);

    } catch (error) {
        elements.modalBody.innerHTML = '<p class="error">加载失败，请稍后重试</p>';
    }
}

// 获取报告内容
async function fetchReportContent(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.text();
}

// 渲染Markdown（简化版）
function renderMarkdown(markdown) {
    let html = markdown
        // 标题
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        // 分隔线
        .replace(/^---$/gm, '<hr>')
        // 粗体
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // 链接
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        // 列表
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        // 段落
        .replace(/\n\n/g, '</p><p>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');

    return `<div class="markdown-content">${html}</div>`;
}

// 关闭模态框
function closeModal() {
    elements.modal.classList.remove('active');
    state.currentReport = null;
}

// 下载报告
async function downloadReport(url, filename) {
    try {
        const response = await fetch(url);
        const content = await response.text();

        const blob = new Blob([content], { type: 'text/markdown' });
        const downloadUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        showNotification('下载成功', 'success');

    } catch (error) {
        showNotification('下载失败', 'error');
    }
}

// 复制报告内容
async function copyReportContent() {
    const content = elements.modalBody.innerText;

    try {
        await navigator.clipboard.writeText(content);
        showNotification('已复制到剪贴板', 'success');
    } catch (error) {
        showNotification('复制失败', 'error');
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 检查浏览器通知权限
    if (Notification.permission === 'granted') {
        new Notification('AI新闻日报', {
            body: message,
            icon: '/favicon.ico'
        });
    }

    // 同时显示页面内通知
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

// 请求通知权限
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        document.getElementById('notifyBtn').addEventListener('click', () => {
            Notification.requestPermission();
        });
    }
}

// 显示加载状态
function showLoading() {
    elements.reportList.innerHTML = '<div class="loading">正在加载报告列表...</div>';
}

// 显示错误
function showError(message) {
    elements.reportList.innerHTML = `
        <div class="empty-state">
            <div class="icon">⚠️</div>
            <p>${message}</p>
        </div>
    `;
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 导出函数供HTML调用
window.downloadReport = downloadReport;
