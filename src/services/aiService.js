import { generatePrompt as apiGenerateInitialPrompt } from '@/lib/initialGenerator';
import { streamRefinement as apiRefinePrompt, validatePromptContent as apiValidatePrompt } from '@/lib/promptRefiner';
import { handleApiError } from '@/utils/errorHandler';

/**
 * 生成初始代码 Prompt（从图片和表单配置）
 * @param {object} payload - 生成参数
 * @param {string} payload.imageBase64 - 图片 base64
 * @param {string} payload.appType - 应用类型
 * @param {number} payload.temperature - 生成温度
 * @param {string} payload.framework - 前端框架
 * @param {string} payload.componentLibrary - 组件库
 * @param {string|null} payload.customSystemPrompt - 自定义系统提示词
 * @returns {Promise<ReadableStream>} API 返回的流
 */
export const generateInitialPrompt = async (payload) => {
  try {
    return await apiGenerateInitialPrompt(
      payload.imageBase64,
      payload.appType,
      payload.temperature,
      payload.framework,
      payload.componentLibrary,
      payload.customSystemPrompt
    );
  } catch (error) {
    throw new Error(handleApiError(error, '生成初始Prompt时'));
  }
};

/**
 * 对现有 Prompt 进行对话式优化
 * @param {object} payload - 优化参数
 * @param {string} payload.currentFullPrompt - 当前完整 Prompt
 * @param {Array} payload.history - 聊天历史
 * @param {string} payload.userTextMessage - 用户输入
 * @param {string|null} payload.imageBase64 - 可选新图片
 * @param {number} payload.temperature - 生成温度
 * @param {string} payload.framework - 前端框架
 * @param {string} payload.componentLibrary - 组件库
 * @param {boolean} payload.isContinuation - 是否为续写
 * @returns {Promise<ReadableStream>} API 返回的流
 */
export const refinePromptConversationally = async (payload) => {
  try {
    return await apiRefinePrompt(
      payload.currentFullPrompt,
      payload.history,
      payload.userTextMessage,
      payload.imageBase64,
      payload.temperature,
      payload.framework,
      payload.componentLibrary,
      payload.isContinuation
    );
  } catch (error) {
    throw new Error(handleApiError(error, '优化Prompt时'));
  }
};

/**
 * 校验 Prompt 内容的有效性
 * @param {string} promptContent - 待校验的 Prompt 内容
 * @returns {Promise<string>} 校验反馈字符串
 */
export const validatePrompt = async (promptContent) => {
  try {
    if (!promptContent || promptContent.trim() === '') {
        return '✅ Prompt 为空，无需校验。';
    }
    return await apiValidatePrompt(promptContent);
  } catch (error) {
    throw new Error(handleApiError(error, '校验Prompt时'));
  }
};
