import { FILE_VALIDATION_RULES, APP_CONFIG } from '@/config/constants';

/**
 * 基础文件验证函数
 * @param {File} file - 要验证的文件对象
 * @param {string} type - 文件类型 (image, document, json, etc.)
 * @returns {boolean} 验证是否通过
 * @throws {Error} 验证失败时抛出错误
 */
export const validateFile = (file, type) => {
    if (!file) {
        throw new Error('文件不能为空');
    }

    const rules = FILE_VALIDATION_RULES[type];
    if (!rules) {
        throw new Error(`不支持的文件类型: ${type}`);
    }

    // 文件大小验证
    if (file.size > rules.maxSize) {
        throw new Error(`文件大小超过限制，最大允许 ${rules.maxSize / 1024 / 1024}MB`);
    }

    // 文件类型验证（MIME类型）
    if (rules.types.length > 0 && !rules.types.includes(file.type)) {
        throw new Error(`不支持的文件类型，仅支持: ${rules.description}`);
    }

    // 文件扩展名验证
    const fileName = file.name.toLowerCase();
    const hasValidExtension = rules.extensions.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) {
        throw new Error(`不支持的文件扩展名，仅支持: ${rules.extensions.join(', ')}`);
    }

    return true;
};

/**
 * 增强的文件安全验证函数
 * @param {File} file - 要验证的文件对象
 * @param {string} type - 文件类型
 * @returns {boolean} 验证是否通过
 * @throws {Error} 验证失败时抛出错误
 */
export const secureFileValidation = (file, type) => {
    // 基础验证
    validateFile(file, type);

    // 文件名安全检查 - 避免控制字符警告
    const dangerousChars = /[<>:"/\\|?*]/;
    const hasControlChars = file.name.split('').some(char => {
        const code = char.charCodeAt(0);
        return code >= 0 && code <= 31;
    });
    if (dangerousChars.test(file.name) || hasControlChars) {
        throw new Error('文件名包含非法字符');
    }

    // 文件名长度检查
    if (file.name.length > 255) {
        throw new Error('文件名过长，请使用较短的文件名');
    }

    // 空文件检查
    if (file.size === 0) {
        throw new Error('文件为空，请选择有效的文件');
    }

    // 文件内容类型检查（防止文件扩展名伪造）
    const rules = FILE_VALIDATION_RULES[type];
    if (rules.types.length > 0) {
        const actualType = file.type;
        if (actualType && !rules.types.includes(actualType)) {
            throw new Error('文件类型与扩展名不匹配，可能存在安全风险');
        }
    }

    return true;
};

/**
 * 图片文件特殊验证
 * @param {File} file - 图片文件对象
 * @returns {Promise<boolean>} 验证是否通过
 */
export const validateImageFile = async (file) => {
    secureFileValidation(file, 'image');

    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            // 检查图片尺寸
            if (img.width > 10000 || img.height > 10000) {
                reject(new Error('图片尺寸过大，请选择较小的图片'));
                return;
            }

            // 检查图片最小尺寸
            if (img.width < 10 || img.height < 10) {
                reject(new Error('图片尺寸过小，请选择有效的图片'));
                return;
            }

            resolve(true);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('图片文件已损坏或格式不正确'));
        };

        img.src = url;
    });
};

/**
 * 文档文件验证
 * @param {File} file - 文档文件对象
 * @param {string} encoding - 文件编码
 * @returns {Promise<boolean>} 验证是否通过
 */
export const validateDocumentFile = async (file, encoding = 'UTF-8') => {
    // 根据文件扩展名确定验证类型
    const fileName = file.name.toLowerCase();
    let validationType = 'document';

    if (fileName.endsWith('.docx')) {
        validationType = 'docx';
    }

    secureFileValidation(file, validationType);

    // 对于文本文件，尝试读取一小部分内容进行验证
    if (validationType === 'document') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const blob = file.slice(0, 1024); // 只读取前1KB进行验证

            reader.onload = (e) => {
                const content = e.target.result;

                // 检查是否包含过多的控制字符（可能是二进制文件）
                let controlCharCount = 0;
                for (let i = 0; i < content.length; i++) {
                    const code = content.charCodeAt(i);
                    if ((code >= 0 && code <= 8) || (code >= 14 && code <= 31) || code === 127) {
                        controlCharCount++;
                    }
                }

                if (controlCharCount > content.length * 0.1) {
                    reject(new Error('文件可能不是有效的文本文件'));
                    return;
                }

                resolve(true);
            };

            reader.onerror = () => {
                reject(new Error('文件读取失败，请检查文件是否损坏'));
            };

            try {
                reader.readAsText(blob, encoding);
            } catch (error) {
                reject(new Error(`使用编码 ${encoding} 读取文件失败`));
            }
        });
    }

    return true;
};

/**
 * JSON文件验证
 * @param {File} file - JSON文件对象
 * @returns {Promise<boolean>} 验证是否通过
 */
export const validateJsonFile = async (file) => {
    secureFileValidation(file, 'json');

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target.result;
                JSON.parse(content);
                resolve(true);
            } catch (error) {
                reject(new Error('JSON文件格式不正确: ' + error.message));
            }
        };

        reader.onerror = () => {
            reject(new Error('JSON文件读取失败'));
        };

        reader.readAsText(file);
    });
};

/**
 * 设计文件验证
 * @param {File} file - 设计文件对象
 * @returns {boolean} 验证是否通过
 */
export const validateDesignFile = (file) => {
    secureFileValidation(file, 'design');
    return true;
};

/**
 * 批量文件验证
 * @param {FileList|Array} files - 文件列表
 * @param {string} type - 文件类型
 * @param {Object} options - 验证选项
 * @returns {Promise<Array>} 验证结果数组
 */
export const validateMultipleFiles = async (files, type, options = {}) => {
    const { maxCount = 10, totalSizeLimit = APP_CONFIG.FILE_SIZE_LIMIT * 5 } = options;
    const fileArray = Array.from(files);

    // 检查文件数量
    if (fileArray.length > maxCount) {
        throw new Error(`最多只能选择 ${maxCount} 个文件`);
    }

    // 检查总文件大小
    const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > totalSizeLimit) {
        throw new Error(`文件总大小超过限制，最大允许 ${totalSizeLimit / 1024 / 1024}MB`);
    }

    // 逐个验证文件
    const results = [];
    for (const file of fileArray) {
        try {
            let isValid = false;

            switch (type) {
                case 'image':
                    isValid = await validateImageFile(file);
                    break;
                case 'document':
                case 'docx':
                    isValid = await validateDocumentFile(file);
                    break;
                case 'json':
                    isValid = await validateJsonFile(file);
                    break;
                case 'design':
                    isValid = validateDesignFile(file);
                    break;
                default:
                    isValid = validateFile(file, type);
            }

            results.push({
                file,
                valid: isValid,
                error: null
            });
        } catch (error) {
            results.push({
                file,
                valid: false,
                error: error.message
            });
        }
    }

    return results;
};

/**
 * 获取文件验证规则信息
 * @param {string} type - 文件类型
 * @returns {Object} 验证规则信息
 */
export const getValidationRules = (type) => {
    return FILE_VALIDATION_RULES[type] || null;
};

/**
 * 检查文件是否符合指定类型
 * @param {File} file - 文件对象
 * @param {string} type - 期望的文件类型
 * @returns {boolean} 是否符合类型
 */
export const isFileTypeMatch = (file, type) => {
    try {
        validateFile(file, type);
        return true;
    } catch {
        return false;
    }
};
