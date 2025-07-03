import OpenAI from 'openai';
import { getInitialGenerationSystemPrompt } from '@/prompts/initialGenerationPrompt.js';

// ==================== API 配置与初始化 ====================
// 前端现在只使用代理路径和模型配置
const PROXY_PATH = process.env.VUE_APP_API_PROXY_PATH;
const MODEL = process.env.VUE_APP_INITIAL_GEN_MODEL || "gpt-4.1";
const MAX_TOKENS = parseInt(process.env.VUE_APP_INITIAL_GEN_MAX_TOKENS) || 20000;

let initialGenClient = null;
let initializationError = null;

// 初始化 OpenAI 客户端，指向我们的内部代理
if (!PROXY_PATH) {
  initializationError = 'API proxy path is not configured. Please set VUE_APP_API_PROXY_PATH in your .env file.';
  console.warn(initializationError);
} else {
  try {
    // API Key 不再需要，因为代理会处理它
    // 在本地开发环境中，使用代理的基础URL（不包含/chat/completions）
    const baseURL = window.location.origin;
    initialGenClient = new OpenAI({
      apiKey: 'not-needed-for-proxy', // 任意字符串，因为会被代理覆盖
      baseURL: baseURL, // 使用基础URL，让OpenAI SDK自动添加路径
      dangerouslyAllowBrowser: true // 仍然需要，因为是在浏览器环境
    });
    console.log('Initial Generation API client initialized for proxy successfully');
  } catch (error) {
    initializationError = `Failed to initialize Initial Generation API client: ${error.message}`;
    console.error(initializationError, error);
    initialGenClient = null;
  }
}

/**
 * 生成初始开发 Prompt（图片转结构化描述，支持多框架/组件库）
 * @param {string} base64Image - 图片的 base64 编码
 * @param {string} applicationType - 应用类型（如 'web'）
 * @param {number} temperature - AI 创造性（0-1）
 * @param {string} framework - 前端框架（如 'Vue', 'React'）
 * @param {string} componentLibrary - UI 组件库（如 'ElementPlus'）
 * @param {string|null} customSystemPrompt - 可选自定义系统提示词
 * @returns {Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>>} 流式响应
 * @throws {Error} 初始化或 API 调用失败时抛出
 */
export async function generatePrompt(base64Image, applicationType, temperature = 0.5, framework = 'Vue', componentLibrary = 'ElementPlus', customSystemPrompt = null) {
  try {
    if (!initialGenClient) {
      const errorMessage = initializationError || "Initial Generation API client not initialized. Please configure API key and base URL.";
      throw new Error(errorMessage);
    }
    if (!base64Image) {
      throw new Error("图片数据不能为空");
    }
    // 动态生成系统提示词
    const defaultDynamicSystemPrompt = getInitialGenerationSystemPrompt(framework, componentLibrary, applicationType);
    // 优先使用自定义系统提示词
    const finalSystemPrompt = customSystemPrompt || defaultDynamicSystemPrompt;
    // 构造 API 消息体
    const messages = [
      {
        "role": "system",
        "content": finalSystemPrompt
      },
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": `Analyze the provided image in detail. Generate a comprehensive and highly descriptive prompt for a frontend developer. This prompt should meticulously describe all visual components, their specific attributes (size, color, typography, spacing), their layout relationships, styling details, and any discernible interactive behaviors. The goal is to provide enough information for an accurate UI implementation of a ${applicationType} application using the ${framework} framework and the ${componentLibrary} component library, based strictly on the visual information in the image. **Ensure the language of your entire output prompt matches the primary language of the text visible in the image.**`,
          },
          {
            "type": "image_url",
            "image_url": {
              "url": base64Image
            },
          },
        ],
      }
    ];
    // 调用 OpenAI API，返回流式响应
    try {
      // 直接调用API，baseURL已经包含了代理路径
      const stream = await initialGenClient.chat.completions.create({
        model: MODEL,
        messages: messages,
        temperature: temperature,
        stream: true,
        max_tokens: MAX_TOKENS,
      });
      return stream;
    } catch (err) {
      if (err.message.includes('context_length_exceeded')) {
        throw new Error('输入内容过长，超出模型最大限制。请尝试精简输入内容。');
      }
      throw err;
    }
  } catch (error) {
    throw new Error("生成代码Prompt时发生错误: " + error.message);
  }
}
