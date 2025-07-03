import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

/**
 * 创建配置好的 marked 实例，用于 Markdown 渲染。
 * - 启用代码高亮（highlight.js），自动识别语言，默认 plaintext。
 * - 启用 GFM、自动换行、语言前缀等。
 * @returns {Function} 配置好的 marked 渲染函数
 * @example
 *   const md = createMarkedInstance();
 *   md.parse('# 标题');
 */
export const createMarkedInstance = () => {
    const markedInstance = marked.setOptions({
        // 代码块高亮回调，自动检测语言
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'language-', // 代码块 class 前缀
        gfm: true,              // 启用 GitHub 风格 Markdown
        breaks: true,           // 换行符转 <br>
    });
    return markedInstance;
};



/**
 * 初始化 marked 的全局配置（全局只需调用一次）
 * 用于全局 Markdown 渲染配置，通常在应用启动时调用
 * @example
 *   initializeMarked();
 */
export const initializeMarked = () => {
    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'language-',
        gfm: true,
        breaks: true,
    });
};

// 直接导出 marked 实例，便于全局使用
export { marked };
