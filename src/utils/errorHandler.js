// 统一错误处理工具函数集，适用于 API、文件、上传、表单等多场景

/**
 * 处理 API 请求错误，返回用户友好的消息
 * @param {Error} error - 错误对象
 * @param {string} context - 操作上下文（如“保存”、“上传”）
 * @returns {string} 格式化的错误提示
 */
export const handleApiError = (error, context = '') => {
    let message = context ? `${context}失败` : '操作失败';

    // 处理 null、undefined 或无 message 属性的错误
    if (!error || !error.message) {
        return `${message}: 未知错误`;
    }

    if (error.message.includes('context_length_exceeded')) {
        message += ': 输入内容过长，请尝试精简内容。';
    } else if (error.message.includes('network')) {
        message += ': 网络连接错误，请检查网络设置。';
    } else if (error.message.includes('timeout')) {
        message += ': 请求超时，请稍后重试。';
    } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
        message += ': 认证失败，请检查API密钥配置。';
    } else if (error.message.includes('rate_limit') || error.message.includes('429')) {
        message += ': 请求频率过高，请稍后重试。';
    } else if (error.message.includes('server_error') || error.message.includes('500')) {
        message += ': 服务器内部错误，请稍后重试。';
    } else {
        message += `: ${error.message}`;
    }
    return message;
};

/**
 * 处理文件相关错误（如读取、解析等）
 * @param {Error} error - 错误对象
 * @param {string} fileName - 文件名（可选）
 * @returns {string} 格式化的错误提示
 */
export const handleFileError = (error, fileName = '') => {
    const prefix = fileName ? `文件 ${fileName} ` : '文件';
    if (error.message.includes('size')) {
        return `${prefix}过大，请选择小于5MB的文件。`;
    } else if (error.message.includes('type') || error.message.includes('format')) {
        return `${prefix}格式不支持，请检查文件类型。`;
    } else if (error.message.includes('encoding')) {
        return `${prefix}编码错误，请尝试更换文件编码格式。`;
    } else if (error.message.includes('permission')) {
        return `${prefix}访问权限不足，请检查文件权限。`;
    } else if (error.message.includes('corrupt')) {
        return `${prefix}已损坏，请重新选择文件。`;
    } else {
        return `${prefix}处理失败: ${error.message}`;
    }
};

/**
 * 处理上传相关错误，返回友好提示
 * @param {Error} error - 错误对象
 * @param {string} fileType - 文件类型描述（如“图片”、“文件”）
 * @returns {string} 格式化的错误提示
 */
export const handleUploadError = (error, fileType = '文件') => {
    if (error.message.includes('network')) {
        return `${fileType}上传失败: 网络连接错误，请检查网络设置。`;
    } else if (error.message.includes('timeout')) {
        return `${fileType}上传超时，请稍后重试。`;
    } else if (error.message.includes('size')) {
        return `${fileType}过大，请选择较小的文件。`;
    } else {
        return `${fileType}上传失败: ${error.message}`;
    }
};

/**
 * 处理表单验证错误，支持多种格式
 * @param {Object|string|Array} validationErrors - 验证错误对象、数组或字符串
 * @returns {string} 合并后的错误提示
 */
export const handleValidationError = (validationErrors) => {
    if (typeof validationErrors === 'string') {
        return validationErrors;
    }
    if (Array.isArray(validationErrors)) {
        return validationErrors.join('; ');
    }
    if (typeof validationErrors === 'object') {
        const messages = Object.values(validationErrors).flat();
        return messages.join('; ');
    }
    return '表单验证失败，请检查输入内容。';
};

/**
 * 创建带上下文的错误处理装饰器
 * @param {Function} handler - 错误处理函数
 * @param {string} context - 错误上下文
 * @returns {Function} 装饰器函数，自动打印错误日志并返回格式化消息
 */
export const createErrorHandler = (handler, context) => {
    return (error) => {
        console.error(`[${context}] Error:`, error);
        return handler(error, context);
    };
};

/**
 * 包装异步函数，自动捕获错误并抛出格式化消息
 * @param {Function} asyncFn - 原始异步函数
 * @param {Function} errorHandler - 错误处理函数（默认 handleApiError）
 * @returns {Function} 包装后的异步函数，出错时抛出友好消息
 */
export const withErrorHandling = (asyncFn, errorHandler = handleApiError) => {
    return async (...args) => {
        try {
            return await asyncFn(...args);
        } catch (error) {
            const errorMessage = errorHandler(error);
            throw new Error(errorMessage);
        }
    };
};

/**
 * 为函数增加自动重试机制（常用于网络请求）
 * @param {Function} fn - 需重试的异步函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} delay - 每次重试的延迟（毫秒）
 * @returns {Function} 带重试功能的异步函数
 */
export const withRetry = (fn, maxRetries = 3, delay = 1000) => {
    return async (...args) => {
        let lastError;
        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await fn(...args);
            } catch (error) {
                lastError = error;
                if (i === maxRetries) break;
                // 仅网络/超时/500错误自动重试
                if (error.message.includes('network') ||
                    error.message.includes('timeout') ||
                    error.message.includes('500')) {
                    await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
                } else {
                    break;
                }
            }
        }
        throw lastError;
    };
};
