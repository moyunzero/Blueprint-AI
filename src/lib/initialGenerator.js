import OpenAI from 'openai';
import { getInitialGenerationSystemPrompt } from '@/prompts/initialGenerationPrompt.js';

const API_KEY = process.env.VUE_APP_INITIAL_GEN_API_KEY;
const BASE_URL = process.env.VUE_APP_INITIAL_GEN_BASE_URL;
const MODEL = process.env.VUE_APP_INITIAL_GEN_MODEL || "gpt-4.1";
const MAX_TOKENS = parseInt(process.env.VUE_APP_INITIAL_GEN_MAX_TOKENS) || 20000;

let initialGenClient = null;
let initializationError = null;

if (!API_KEY || !BASE_URL) {
  initializationError = 'Initial Generation API Key or Base URL is not configured. Please set VUE_APP_INITIAL_GEN_API_KEY and VUE_APP_INITIAL_GEN_BASE_URL in your .env file.';
  console.warn(initializationError);
} else {
  try {
    initialGenClient = new OpenAI({
      apiKey: API_KEY,
      baseURL: BASE_URL,
      dangerouslyAllowBrowser: true
    });
    console.log('Initial Generation API client initialized successfully');
  } catch (error) {
    initializationError = `Failed to initialize Initial Generation API client: ${error.message}`;
    console.error(initializationError, error);
    initialGenClient = null;
  }
}

/**
 * Generates an initial development prompt from an image based on the selected tech stack.
 * @param {string} base64Image The base64 encoded image data.
 * @param {string} applicationType The type of application (e.g., 'web').
 * @param {number} temperature The creativity of the AI (0-1).
 * @param {string} framework The selected frontend framework (e.g., 'Vue', 'React').
 * @param {string} componentLibrary The selected UI component library (e.g., 'ElementPlus', 'MUI').
 * @param {string|null} customSystemPrompt An optional user-defined system prompt to override the default.
 * @returns {Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>>} A stream of completion chunks.
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
    
    // Generate the dynamic system prompt based on the selected framework and library.
    const defaultDynamicSystemPrompt = getInitialGenerationSystemPrompt(framework, componentLibrary, applicationType);

    // Use the custom system prompt if provided, otherwise use the dynamically generated one.
    const finalSystemPrompt = customSystemPrompt || defaultDynamicSystemPrompt;

    // Prepare messages for the API call.
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

    // Call the API with streaming response.
    try {
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
