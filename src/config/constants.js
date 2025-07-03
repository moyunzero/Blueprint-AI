/**
 * 应用程序配置常量
 * - 文件大小、超时、会话格式、支持语言等全局参数
 */
export const APP_CONFIG = {
    FILE_SIZE_LIMIT: 5 * 1024 * 1024, // 单文件最大5MB
    MAX_PROMPT_LENGTH: 50000, // Prompt最大长度
    SESSION_FORMAT_VERSION: '1.0.1',
    SUPPORTED_LANGUAGES: ['zh-CN', 'en-US'],
    API_TIMEOUT: 30000, // ms
    RETRY_ATTEMPTS: 3,
    DEFAULT_TEMPERATURE: 0.5,
    MIN_TEMPERATURE: 0,
    MAX_TEMPERATURE: 1,
};

/**
 * UI界面配置常量
 * - 各类布局、动画、响应式断点等
 */
export const UI_CONFIG = {
    DIALOG_WIDTH: '70%',
    SCROLL_TOLERANCE: 50,
    DEBOUNCE_DELAY: 100,
    ANIMATION_DURATION: 300,
    CARD_MIN_HEIGHT: 750,
    CONTENT_MIN_HEIGHT: 600,
    MOBILE_BREAKPOINT: 768,
    TABLET_BREAKPOINT: 1200,
};

/**
 * 前端框架选项配置
 * - 供表单/下拉选择使用
 */
export const FRAMEWORK_OPTIONS = [
    { label: 'Vue', value: 'Vue' },
    { label: 'React', value: 'React' },
    // 可扩展更多框架
];

/**
 * UI组件库选项配置
 * - 供表单/下拉选择使用
 */
export const COMPONENT_LIBRARY_OPTIONS = [
    { label: 'Element Plus (for Vue)', value: 'ElementPlus' },
    { label: 'Ant Design Vue (for Vue)', value: 'AntDesignVue' },
    { label: 'Naive UI (for Vue)', value: 'NaiveUI' },
    { label: 'Material-UI (MUI) (for React)', value: 'MUI' },
    { label: 'Ant Design (for React)', value: 'AntDesign' },
    { label: 'Chakra UI (for React)', value: 'ChakraUI' },
    { label: 'Tailwind CSS (通用)', value: 'TailwindCSS' },
];

/**
 * 文件验证规则配置
 * - 各类文件的类型、扩展名、大小限制
 */
export const FILE_VALIDATION_RULES = {
    image: {
        types: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml'],
        extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'],
        maxSize: APP_CONFIG.FILE_SIZE_LIMIT,
        description: '图片文件'
    },
    document: {
        types: ['text/plain', 'text/markdown'],
        extensions: ['.txt', '.md'],
        maxSize: APP_CONFIG.FILE_SIZE_LIMIT,
        description: '文档文件'
    },
    docx: {
        types: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        extensions: ['.docx'],
        maxSize: APP_CONFIG.FILE_SIZE_LIMIT,
        description: 'Word文档'
    },
    json: {
        types: ['application/json'],
        extensions: ['.json'],
        maxSize: APP_CONFIG.FILE_SIZE_LIMIT,
        description: 'JSON文件'
    },
    design: {
        types: [],
        extensions: ['.fig', '.sketch', '.xd', '.psd', '.ai'],
        maxSize: APP_CONFIG.FILE_SIZE_LIMIT,
        description: '设计文件'
    }
};

/**
 * 文件编码选项配置
 * - 供文件上传/读取时选择编码
 */
export const FILE_ENCODING_OPTIONS = [
    { label: 'UTF-8 (推荐)', value: 'UTF-8' },
    { label: 'GBK (中文常用)', value: 'GBK' },
    { label: 'GB2312', value: 'GB2312' },
    { label: 'Big5', value: 'Big5' },
    { label: 'Latin-1', value: 'ISO-8859-1' },
];

/**
 * 温度滑块配置（用于调节AI创造性）
 */
export const TEMPERATURE_CONFIG = {
    MIN: 0,
    MAX: 100,
    STEP: 1,
    DEFAULT: 50,
    LABELS: {
        MIN: '专注',
        MAX: '创意'
    },
    DESCRIPTIONS: {
        LOW: '更加专注和一致的输出',
        MEDIUM: '平衡的创造性和一致性',
        HIGH: '更有创造力和多样性的输出'
    }
};

/**
 * API相关配置
 * - 统一管理后端接口路径、请求头、超时等
 */
export const API_CONFIG = {
    ENDPOINTS: {
        CHAT: '/api/chat',
        UPLOAD: '/api/upload',
        GENERATE: '/api/generate'
    },
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    TIMEOUT: APP_CONFIG.API_TIMEOUT,
    RETRY_ATTEMPTS: APP_CONFIG.RETRY_ATTEMPTS
};

/**
 * 消息类型常量
 * - 聊天、上传、API输入等类型标识
 */
export const MESSAGE_TYPES = {
    TEXT: 'text',
    IMAGE_UPLOAD: 'image-upload',
    DOCUMENT_UPLOAD: 'document-upload',
    API_DOC_INPUT: 'api-doc-input',
    DEV_SOLUTION_INPUT: 'dev-solution-input',
    PROMPT_UPDATE: 'prompt-update',
    CONTINUATION: 'continuation',
    INITIAL_RESPONSE: 'initial-response',
    ANSWER: 'answer',
    ERROR: 'error'
};

/**
 * 应用类型选项配置
 * - 供表单/下拉选择使用
 */
export const APP_TYPE_OPTIONS = [
    { label: 'Web应用', value: 'web' },
    { label: '移动应用', value: 'mobile' },
    { label: '桌面应用', value: 'desktop' },
];

/**
 * 默认表单配置
 * - 新会话/重置时的初始表单参数
 */
export const DEFAULT_FORM_CONFIG = {
    appType: 'web',
    temperature: TEMPERATURE_CONFIG.DEFAULT,
    framework: 'Vue',
    componentLibrary: 'ElementPlus',
    fileEncoding: 'UTF-8'
};

/**
 * 表单/输入验证规则
 */
export const VALIDATION_RULES = {
    REQUIRED_MESSAGE: '此字段为必填项',
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    EMAIL_MESSAGE: '请输入有效的邮箱地址',
    MIN_LENGTH: (min) => `最少需要${min}个字符`,
    MAX_LENGTH: (max) => `最多允许${max}个字符`,
    FILE_SIZE_MESSAGE: `文件大小不能超过${APP_CONFIG.FILE_SIZE_LIMIT / 1024 / 1024}MB`,
    PROMPT_LENGTH_MESSAGE: `内容长度不能超过${APP_CONFIG.MAX_PROMPT_LENGTH}个字符`
};

/**
 * 本地存储键名
 * - 统一管理 localStorage/sessionStorage key
 */
export const STORAGE_KEYS = {
    USER_PREFERENCES: 'user_preferences',
    CHAT_HISTORY: 'chat_history',
    FORM_DATA: 'form_data',
    SESSION_DATA: 'blueprint_ai_session_data',
    THEME: 'theme_preference'
};

/**
 * 主题配置
 * - 支持亮色/暗色/自动
 */
export const THEME_CONFIG = {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto',
    DEFAULT: 'light'
};

/**
 * 动画配置
 * - 统一动画时长、缓动曲线
 */
export const ANIMATION_CONFIG = {
    DURATION: {
        FAST: 150,
        NORMAL: 300,
        SLOW: 500
    },
    EASING: {
        EASE_IN: 'ease-in',
        EASE_OUT: 'ease-out',
        EASE_IN_OUT: 'ease-in-out'
    }
};
