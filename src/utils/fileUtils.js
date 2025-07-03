/**
 * 将文件对象转为 base64 字符串（常用于图片、设计文件等预览）
 * @param {File} file - 文件对象
 * @returns {Promise<string>} base64 字符串
 */
export async function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
}

/**
 * 将文本/Markdown/DOCX 文件内容读取为字符串，支持编码参数
 * @param {File} file - 文件对象
 * @param {string} encoding - 文本编码，默认 'UTF-8'
 * @returns {Promise<string>} 文件内容字符串
 */
export async function convertFileToString(file, encoding = 'UTF-8') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      // 文本/Markdown 文件
      if (file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (error) => reject(new Error('Failed to read text file: ' + error));
        try {
          reader.readAsText(file, encoding);
        } catch (e) {
          reject(new Error(`Failed to read file with encoding ${encoding}: ${e.message}`));
        }
      }
      // DOCX 文件
      else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target.result;
            const mammothModule = await import('mammoth');
            const result = await mammothModule.extractRawText({ arrayBuffer: arrayBuffer });
            resolve(result.value);
          } catch (error) {
            reject(new Error('Failed to read docx file: ' + error.message));
          }
        };
        reader.onerror = (error) => reject(new Error('Failed to read docx file: ' + error));
        reader.readAsArrayBuffer(file);
      }
      // 不支持的文件类型
      else {
        reject(new Error('Unsupported file type: ' + file.type));
      }
    });
}

/**
 * 读取 JSON 文件内容为字符串
 * @param {File} file - JSON 文件对象
 * @returns {Promise<string>} 文件内容字符串
 */
export async function convertJsonToString(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (error) => reject(new Error('Failed to read JSON file: ' + error));
      reader.readAsText(file);
    });
}

// 生成字段映射建议（供 UI 显示）
function generateFieldMappingSuggestions(responseFields) {
    const suggestions = [];
    function extractFieldsRecursive(fields, prefix = '') {
        Object.keys(fields).forEach(fieldName => {
            const field = fields[fieldName];
            const fullFieldName = prefix ? `${prefix}.${fieldName}` : fieldName;
            const displayName = generateDisplayName(fieldName);
            suggestions.push({
                field_name: fullFieldName,
                display_name: displayName,
                type: field.type,
                description: field.description || '',
                ui_suggestion: `${displayName}（${fullFieldName}, ${field.type}）`
            });
            if (field.type === 'object' && field.properties) {
                extractFieldsRecursive(field.properties, fullFieldName);
            }
            if (field.type === 'array' && field.items && field.items.properties) {
                extractFieldsRecursive(field.items.properties, fullFieldName);
            }
        });
    }
    extractFieldsRecursive(responseFields);
    return suggestions;
}

// 字段名转为友好显示名
function generateDisplayName(fieldName) {
    return fieldName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/Id$/, ' ID')
        .replace(/Url$/, ' URL')
        .trim();
}

// 递归解析 YAPI 字段结构为嵌套对象
function parseYapiFieldsRecursive(fields) {
    const result = {};
    if (!fields || !Array.isArray(fields)) return result;
    fields.forEach(field => {
        if (field.name === '0' && field.path && field.path.endsWith('.0')) return;
        const fieldInfo = {
            type: field.type,
            description: field.description || '',
        };
        if (field.type === 'object' && Array.isArray(field.children) && field.children.length > 0) {
            fieldInfo.properties = parseYapiFieldsRecursive(field.children);
        } else if (field.type === 'array' && Array.isArray(field.children) && field.children.length > 0) {
            const itemDescriptor = field.children.find(c => c.name === '0' || (c.path && c.path.endsWith('.0'))) || field.children[0];
            if (itemDescriptor) {
                if (itemDescriptor.type === 'object' && Array.isArray(itemDescriptor.children)) {
                    fieldInfo.items = { type: 'object', properties: parseYapiFieldsRecursive(itemDescriptor.children) };
                } else {
                    fieldInfo.items = { type: itemDescriptor.type };
                }
            } else {
                fieldInfo.items = { type: 'any' };
            }
        }
        result[field.name] = fieldInfo;
    });
    return result;
}

/**
 * 解析 YAPI 风格的 API 文档文件，返回结构化摘要
 * @param {File} file - API 文档 JSON 文件
 * @returns {Promise<Object>} 结构化 API 摘要和文件信息
 */
export async function processApiDocFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonContent = JSON.parse(e.target.result);
                if (!Array.isArray(jsonContent.list)) {
                    reject(new Error('API 文档格式不符合预期的 YAPI 结构 (缺少顶层 "list" 数组)。'));
                    return;
                }
                const apiSummary = [];
                jsonContent.list.forEach(api => {
                    if (!api.path || !api.method || !api.title) return;
                    const req_params = parseYapiFieldsRecursive(api.req_detail);
                    const res_fields = parseYapiFieldsRecursive(api.res_detail);
                    const fieldMappingSuggestions = generateFieldMappingSuggestions(res_fields);
                    apiSummary.push({
                        title: api.title,
                        path: api.path,
                        method: api.method,
                        request_params: req_params,
                        response_fields: res_fields,
                        field_mapping_suggestions: fieldMappingSuggestions
                    });
                });
                const fileInfo = {
                    name: file.name,
                    size: file.size,
                    type: 'api-json',
                    lastModified: file.lastModified,
                    lastModifiedDate: new Date(file.lastModified).toLocaleString(),
                    sizeFormatted: formatFileSize(file.size)
                };
                resolve({
                    fileInfo,
                    content: JSON.stringify({ apiEndpoints: apiSummary }, null, 2),
                    previewType: 'api-doc-info'
                });
            } catch (error) {
                reject(new Error('解析 API 文档失败: ' + error.message));
            }
        };
        reader.onerror = (error) => reject(new Error('读取 API 文档失败: ' + error));
        reader.readAsText(file);
    });
}

/**
 * 检测文件类型（图片、Figma、Sketch、XD、设计等）
 * @param {File} file - 文件对象
 * @returns {string} 文件类型标识
 */
export function detectFileType(file) {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    if (fileType.startsWith('image/')) return 'image';
    if (fileName.endsWith('.fig')) return 'figma';
    if (fileName.endsWith('.sketch')) return 'sketch';
    if (fileName.endsWith('.xd')) return 'xd';
    if (fileName.endsWith('.psd') || fileName.endsWith('.ai')) return 'design';
    return 'unknown';
}

// 工厂模式：生成各类设计文件处理器
const createDesignFileProcessor = (fileType) => {
    return async (file) => {
        try {
            const fileInfo = {
                name: file.name,
                size: file.size,
                type: fileType,
                lastModified: file.lastModified,
                lastModifiedDate: new Date(file.lastModified).toLocaleString(),
                sizeFormatted: formatFileSize(file.size)
            };
            const base64 = await convertFileToBase64(file);
            return {
                fileInfo,
                base64Data: base64,
                previewType: `${fileType}-info`
            };
        } catch (error) {
            throw new Error(`${fileType}文件处理失败: ${error.message}`);
        }
    };
};

// 各类设计文件处理器（Figma/Sketch/XD/其他）
export const processFigmaFile = createDesignFileProcessor('figma');
export const processSketchFile = createDesignFileProcessor('sketch');
export const processXDFile = createDesignFileProcessor('xd');
export const processOtherDesignFile = createDesignFileProcessor('design');

/**
 * 统一入口：处理设计文件，自动分流到对应处理器
 * @param {File} file - 设计文件对象
 * @returns {Promise<Object>} 处理结果（含 base64、文件信息等）
 */
export async function processDesignFile(file) {
    const fileType = detectFileType(file);
    switch (fileType) {
        case 'figma': return await processFigmaFile(file);
        case 'sketch': return await processSketchFile(file);
        case 'xd': return await processXDFile(file);
        case 'design': return await processOtherDesignFile(file);
        default: throw new Error('不支持的设计文件格式');
    }
}

/**
 * 格式化文件大小（字节转为 KB/MB/GB）
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 获取支持的文件类型列表（供前端文件选择器使用）
 * @returns {Object} 支持的文件类型描述
 */
export function getSupportedFileTypes() {
    return {
        image: {
            extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'],
            mimeTypes: ['image/*'],
            description: '图片文件'
        },
        figma: {
            extensions: ['.fig'],
            mimeTypes: [],
            description: 'Figma设计文件'
        },
        sketch: {
            extensions: ['.sketch'],
            mimeTypes: [],
            description: 'Sketch设计文件'
        },
        xd: {
            extensions: ['.xd'],
            mimeTypes: [],
            description: 'Adobe XD设计文件'
        },
        design: {
            extensions: ['.psd', '.ai'],
            mimeTypes: [],
            description: '其他设计文件'
        }
    };
}
