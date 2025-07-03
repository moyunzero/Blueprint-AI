export async function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

// 增加 encoding 参数，默认为 'UTF-8'
export async function convertFileToString(file, encoding = 'UTF-8') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      // 处理文本和Markdown文件
      if (file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (error) => reject(new Error('Failed to read text file: ' + error));
        try {
          // 将编码参数传递给 readAsText
          reader.readAsText(file, encoding);
        } catch (e) {
          // 捕获 readAsText 可能抛出的错误，提供更明确的提示
          reject(new Error(`Failed to read file with encoding ${encoding}: ${e.message}`));
        }
      }
      // 处理 DOCX 文件
      else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target.result;
            // 确保 mammoth 已经加载
            const mammothModule = await import('mammoth'); // 动态导入 mammoth
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

// 新增：JSON字符串转换函数
export async function convertJsonToString(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (error) => reject(new Error('Failed to read JSON file: ' + error));
      reader.readAsText(file);
    });
}

// Helper function to generate field mapping suggestions for UI display
function generateFieldMappingSuggestions(responseFields) {
    const suggestions = [];

    function extractFieldsRecursive(fields, prefix = '') {
        Object.keys(fields).forEach(fieldName => {
            const field = fields[fieldName];
            const fullFieldName = prefix ? `${prefix}.${fieldName}` : fieldName;

            // 生成UI显示名称建议
            const displayName = generateDisplayName(fieldName);

            suggestions.push({
                field_name: fullFieldName,
                display_name: displayName,
                type: field.type,
                description: field.description || '',
                ui_suggestion: `${displayName}（${fullFieldName}, ${field.type}）`
            });

            // 递归处理嵌套对象
            if (field.type === 'object' && field.properties) {
                extractFieldsRecursive(field.properties, fullFieldName);
            }

            // 处理数组类型
            if (field.type === 'array' && field.items && field.items.properties) {
                extractFieldsRecursive(field.items.properties, fullFieldName);
            }
        });
    }

    extractFieldsRecursive(responseFields);
    return suggestions;
}

// Helper function to generate user-friendly display names from field names
function generateDisplayName(fieldName) {
    return fieldName
        .replace(/([A-Z])/g, ' $1') // 在大写字母前添加空格
        .replace(/^./, str => str.toUpperCase()) // 首字母大写
        .replace(/Id$/, ' ID') // 将结尾的Id替换为ID
        .replace(/Url$/, ' URL') // 将结尾的Url替换为URL
        .trim();
}

// Helper function to recursively parse YAPI field details into a nested object structure
function parseYapiFieldsRecursive(fields) {
    const result = {};
    if (!fields || !Array.isArray(fields)) {
        return result;
    }

    fields.forEach(field => {
        // Skip dummy array item placeholder (name === '0') that might exist at top level or within children
        if (field.name === '0' && field.path && field.path.endsWith('.0')) {
            return; // This is a placeholder for array items, handled by the parent array type
        }

        const fieldInfo = {
            type: field.type,
            description: field.description || '',
            // Add other relevant properties if needed, e.g., required: field.requiredness === '是'
        };

        if (field.type === 'object' && Array.isArray(field.children) && field.children.length > 0) {
            fieldInfo.properties = parseYapiFieldsRecursive(field.children);
        } else if (field.type === 'array' && Array.isArray(field.children) && field.children.length > 0) {
            // For array types, we typically want to describe the structure of its items
            // YAPI's 'children' for arrays often contain a single '0' field describing the item.
            // We need to find that '0' field or just take the first child if it's the item descriptor.
            const itemDescriptor = field.children.find(c => c.name === '0' || (c.path && c.path.endsWith('.0'))) || field.children[0];

            if (itemDescriptor) {
                if (itemDescriptor.type === 'object' && Array.isArray(itemDescriptor.children)) {
                    fieldInfo.items = { type: 'object', properties: parseYapiFieldsRecursive(itemDescriptor.children) };
                } else {
                    // For array of primitives (string, number, etc.)
                    fieldInfo.items = { type: itemDescriptor.type };
                }
            } else {
                fieldInfo.items = { type: 'any' }; // Fallback
            }
        }
        result[field.name] = fieldInfo;
    });
    return result;
}

// 新增：处理API文档文件的函数
export async function processApiDocFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonContent = JSON.parse(e.target.result);

                // Check if it's a YAPI-like structure (has a 'list' array with API definitions)
                if (!Array.isArray(jsonContent.list)) {
                    reject(new Error('API 文档格式不符合预期的 YAPI 结构 (缺少顶层 "list" 数组)。'));
                    return;
                }

                const apiSummary = [];
                jsonContent.list.forEach(api => {
                    if (!api.path || !api.method || !api.title) {
                        return; // Skip malformed API entries
                    }

                    const req_params = parseYapiFieldsRecursive(api.req_detail);
                    const res_fields = parseYapiFieldsRecursive(api.res_detail);

                    // 生成字段映射建议
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

                // Return the structured summary for LLM
                resolve({
                    fileInfo,
                    // Stringify with indentation for readability by LLM
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

// 新增：检测文件类型的函数
export function detectFileType(file) {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();

    // 图片文件
    if (fileType.startsWith('image/')) {
        return 'image';
    }

    // Figma 文件
    if (fileName.endsWith('.fig')) {
        return 'figma';
    }

    // Sketch 文件
    if (fileName.endsWith('.sketch')) {
        return 'sketch';
    }

    // Adobe XD 文件
    if (fileName.endsWith('.xd')) {
        return 'xd';
    }

    // 其他设计文件
    if (fileName.endsWith('.psd') || fileName.endsWith('.ai')) {
        return 'design';
    }

    return 'unknown';
}

/**
 * 统一的设计文件处理函数工厂
 * 消除重复代码结构，使用工厂模式创建处理器
 * @param {string} fileType - 文件类型标识
 * @returns {Function} 设计文件处理函数
 */
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

// 使用工厂函数创建各种设计文件处理器
export const processFigmaFile = createDesignFileProcessor('figma');
export const processSketchFile = createDesignFileProcessor('sketch');
export const processXDFile = createDesignFileProcessor('xd');
export const processOtherDesignFile = createDesignFileProcessor('design');

// 新增：处理设计文件的统一入口函数
export async function processDesignFile(file) {
    const fileType = detectFileType(file);

    switch (fileType) {
        case 'figma':
            return await processFigmaFile(file);
        case 'sketch':
            return await processSketchFile(file);
        case 'xd':
            return await processXDFile(file);
        case 'design':
            return await processOtherDesignFile(file);
        default:
            throw new Error('不支持的设计文件格式');
    }
}

// 新增：格式化文件大小的工具函数
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 新增：获取支持的文件类型列表
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
