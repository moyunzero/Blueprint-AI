import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

/**
 * 创建配置好的marked实例
 * @returns {Function} 配置好的marked函数
 */
export const createMarkedInstance = () => {
    const markedInstance = marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'language-',
        gfm: true,
        breaks: true,
    });
    return markedInstance;
};

/**
 * EasyMDE编辑器的默认配置选项
 */
export const MDE_OPTIONS = {
    toolbar: [
        'bold', 'italic', 'heading', '|',
        'quote', 'unordered-list', 'ordered-list', '|',
        'link', 'image', 'code', 'table', '|',
        'preview', 'fullscreen', 'side-by-side'
    ],
    renderingConfig: {
        codeSyntaxHighlighting: true,
    },
    placeholder: "在此处输入内容（支持 Markdown 格式）...",
};

/**
 * 简化版的EasyMDE配置选项（用于技术方案输入等场景）
 */
export const MDE_OPTIONS_SIMPLE = {
    toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'code'],
    renderingConfig: { codeSyntaxHighlighting: true },
    placeholder: "在此处输入技术方案内容（支持 Markdown 格式）...",
};

/**
 * 无工具栏的EasyMDE配置选项（用于纯文本输入场景）
 */
export const MDE_OPTIONS_MINIMAL = {
    toolbar: false,
    renderingConfig: {
        codeSyntaxHighlighting: true,
    },
    placeholder: "在此处输入功能描述（支持 Markdown 格式）...",
};

/**
 * 初始化marked的全局配置
 * 在应用启动时调用一次即可
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

// 导出marked实例供直接使用
export { marked };
