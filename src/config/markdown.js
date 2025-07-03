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
 * EasyMDE 编辑器的完整工具栏配置
 * 适用于常规 Markdown 编辑场景
 * @type {import('easymde').Options}
 */
export const MDE_OPTIONS = {
    toolbar: [
        'bold', 'italic', 'heading', '|',
        'quote', 'unordered-list', 'ordered-list', '|',
        'link', 'image', 'code', 'table', '|',
        'preview', 'fullscreen', 'side-by-side'
    ],
    renderingConfig: {
        codeSyntaxHighlighting: true, // 启用代码高亮
    },
    placeholder: "在此处输入内容（支持 Markdown 格式）...",
};

/**
 * EasyMDE 编辑器的简化工具栏配置
 * 适用于技术方案、简要输入等场景
 * @type {import('easymde').Options}
 */
export const MDE_OPTIONS_SIMPLE = {
    toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'code'],
    renderingConfig: { codeSyntaxHighlighting: true },
    placeholder: "在此处输入技术方案内容（支持 Markdown 格式）...",
};

/**
 * EasyMDE 编辑器的极简配置（无工具栏）
 * 适用于纯文本输入、描述类场景
 * @type {import('easymde').Options}
 */
export const MDE_OPTIONS_MINIMAL = {
    toolbar: false,
    renderingConfig: {
        codeSyntaxHighlighting: true,
    },
    placeholder: "在此处输入功能描述（支持 Markdown 格式）...",
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
