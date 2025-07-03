import OpenAI from 'openai';
import { getConversationalRefinementSystemPrompt } from '@/prompts/conversationalRefinementPrompt.js';

const API_KEY = process.env.VUE_APP_REFINEMENT_API_KEY;
const BASE_URL = process.env.VUE_APP_REFINEMENT_BASE_URL;
const MODEL = process.env.VUE_APP_REFINEMENT_MODEL || 'gpt-4.1';

// --- OpenAI Client Initialization ---
let refinementClient = null;
let initializationError = null;

try {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE' || !BASE_URL) {
    initializationError = 'Refinement API Key or Base URL not configured correctly. Please check your environment variables.';
    console.warn(initializationError);
  } else {
    refinementClient = new OpenAI({
      apiKey: API_KEY,
      baseURL: BASE_URL,
      dangerouslyAllowBrowser: true
    });
    console.log('Prompt Refinement API client initialized successfully');
  }
} catch (error) {
  initializationError = `Failed to initialize Prompt Refinement API client: ${error.message}`;
  console.error(initializationError, error);
  refinementClient = null;
}

function handleApiError(error, context) {
  let message = `Failed during Refinement API call (${context}).`;
  if (error instanceof OpenAI.APIError) {
    message = `Refinement API Error (${context}): ${error.status} ${error.name} - ${error.message}`;

    if (error.error) {
        message += ` Details: ${JSON.stringify(error.error)}`;
    }
  } else if (error instanceof Error) {
    message = `Refinement Client Error (${context}): ${error.message}`;
  }
  throw new Error(message);
}

// 新增一个函数用于 Prompt 校验
export async function validatePromptContent(promptContent) {
  if (!refinementClient) {
    const errorMessage = initializationError || 'Refinement client is not initialized. Cannot validate prompt.';
    throw new Error(errorMessage);
  }

  if (!promptContent || promptContent.trim() === '') {
    throw new Error('Prompt内容不能为空');
  }

  const systemPrompt = `你是一个专业的Prompt质量检查工程师。你的任务是审查用户提供的 Prompt，并根据以下规则给出结构化的问题列表和建议。

  **校验规则：**
  1.  **结构完整性 (High Priority)：**
      *   Prompt 是否包含以下主要章节：\`<summary_title>\`, \`<image_analysis>\`, \`<development_planning>\`。
      *   每个章节是否至少包含一些内容，而不是空缺。
  2.  **内容完整性 (Medium Priority)：**
      *   在 \`<image_analysis>\` 中，是否详细描述了 UI 元素（按钮、输入框、表格、导航等）、布局、颜色、字体、交互细节等。**特别检查UI元素的文本、标签、占位符是否保持了原始语言，没有被翻译。**
      *   在 \`<development_planning>\` 中，是否明确提到了组件使用策略（例如：优先使用内部库和 Element UI）、主要功能实现、API 交互（如果适用）。
      *   是否明确提到了项目使用的框架和组件库（例如为React建议Hooks，为Vue建议Composition API）。
  3.  **可执行性与清晰度 (Medium Priority)：**
      *   Prompt 是否足够清晰和具体，让一个前端开发者能直接开始实现，避免模糊的指令。
      *   代码块或示例格式是否正确（如果包含）。
  4.  **冗余/占位符检查 (Low Priority)：**
      *   是否存在 \`[请填写...]\`, \`[TODO]\`, \`[待补充]\` 等明显的占位符或未完成的指示。
      *   是否存在重复或冗余的信息。
  5.  **语言一致性 (Medium Priority)：**
      *   Prompt 的主要语言是否与图片/用户指令的语言一致。
      *   **UI元素文本保留检查 (CRITICAL)：** 检查Prompt中描述的UI元素文本（按钮文字、输入框标签、占位符、表格列头等）是否保持了原始语言，没有被翻译成其他语言。例如，如果原图中按钮显示"Settings"，Prompt中应该保持"Settings"而不是"设置".

  **输出格式：**
  请以 Markdown 列表的形式输出校验结果。如果发现问题，请在每个问题前使用 \`🚨\` (错误), \`⚠️\` (警告), \`💡\` (建议) 符号来表示其严重性。
  示例：
  - 🚨 **结构缺失：** 未找到 \`<image_analysis>\` 章节。
  - ⚠️ **内容不足：** \`<development_planning>\` 中缺少具体的API交互说明。
  - 💡 **优化建议：** 考虑在 \`summary_title\` 中增加更多页面的业务上下文。
  - ⚠️ **占位符：** Prompt 中包含未填充的 \`[请填写你的前端框架]\`。

  如果Prompt质量很高，没有发现明显问题，请回复 "✅ Prompt 质量优秀，没有发现结构或内容上的明显问题。"`;
  const messages = [
    {
      "role": "system",
      "content": systemPrompt
    },
    {
      "role": "user",
      "content": `请检查以下 Prompt：\n\n\`\`\`\n${promptContent}\n\`\`\``
    }
  ];

  try {
    const response = await refinementClient.chat.completions.create({
      model: MODEL,
      messages: messages,
      temperature: 0.1, // 校验任务应保持低温度，以获得确定性结果
      max_tokens: 1000, // 校验结果通常不会太长
    });
    return response.choices[0]?.message?.content || 'Prompt 校验失败或无响应。';
  } catch (error) {
    handleApiError(error, 'prompt validation');
  }
}

export async function streamRefinement(
  currentFullPrompt,
  history,
  userTextMessage,
  imageBase64 = null,
  temperature = 0.2,
  framework = 'Vue',
  componentLibrary = 'ElementPlus'
){
  if (!refinementClient) {
    throw new Error('Refinement client is not initialized. Cannot refine prompt.');
  }

  // Construct the user's message content, including image if provided
  const userMessageContent = [{ type: 'text', text: userTextMessage }];
  if (imageBase64) {
    userMessageContent.push({
      type: 'image_url',
      image_url: { url: imageBase64 },
    });
  }

  // Generate the dynamic system prompt for conversational refinement.
  const systemPrompt = getConversationalRefinementSystemPrompt(framework, componentLibrary, currentFullPrompt);

  // Build the message history for the API call.
  const actualHistoryForApi = history.map(msg => {
    if (msg.role === 'user') {
      if (msg.type === 'dev-solution-input') {
        return { role: 'user', content: `[DEVELOPER_SOLUTION]: ${msg.text}` };
      } else if (msg.type === 'api-doc-input') {
        return { role: 'user', content: `[API_DOCUMENT]: ${msg.text}` };
      } else if (msg.imagePreview && msg.type === 'image-upload') {
        return { role: 'user', content: [{ type: 'text', text: msg.text || '' }, { type: 'image_url', image_url: { url: msg.imagePreview } }] };
      } else if (msg.documentName && msg.type === 'document-upload') {
        return { role: 'user', content: msg.text || `[用户上传了文档: ${msg.documentName}]` };
      }
      return { role: 'user', content: msg.text || '' };
    }
    return { role: 'assistant', content: msg.content };
  });

  const messages = [
    {
      role: 'system',
      content: systemPrompt,
    },
    ...actualHistoryForApi, // 传递完整的对话历史
    {
      role: 'user',
      content: userMessageContent, // 当前用户输入（可能包含图片或特殊前缀）
    },
  ];

  try {
    const stream = await refinementClient.chat.completions.create({
      model: MODEL,
      messages: messages,
      temperature: temperature,
      stream: true,
      max_tokens: 4000,
    });
    return stream;
  } catch (error) {
    handleApiError(error, 'refinement');
  }
}
