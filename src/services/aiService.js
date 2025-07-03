import { generatePrompt as apiGenerateInitialPrompt } from '@/lib/initialGenerator';
import { streamRefinement as apiRefinePrompt, validatePromptContent as apiValidatePrompt } from '@/lib/promptRefiner';
import { handleApiError } from '@/utils/errorHandler';

/**
 * Generates the initial code prompt from an image.
 * @param {object} payload - The data required for prompt generation.
 * @param {string} payload.imageBase64 - The base64 encoded image.
 * @param {string} payload.appType - The application type (e.g., 'web').
 * @param {number} payload.temperature - The generation temperature.
 * @param {string} payload.framework - The selected frontend framework.
 * @param {string} payload.componentLibrary - The component library to use.
 * @param {string|null} payload.customSystemPrompt - An optional custom system prompt.
 * @returns {Promise<ReadableStream>} A promise that resolves to the stream from the API.
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
 * Refines an existing prompt through a conversational exchange.
 * @param {object} payload - The data for the conversational refinement.
 * @param {string} payload.currentFullPrompt - The base prompt to be refined.
 * @param {Array} payload.history - The conversation history.
 * @param {string} payload.userTextMessage - The user's latest message.
 * @param {string|null} payload.imageBase64 - An optional new image for this turn.
 * @param {number} payload.temperature - The generation temperature.
 * @param {string} payload.framework - The selected frontend framework.
 * @param {string} payload.componentLibrary - The component library.
 * @returns {Promise<ReadableStream>} A promise that resolves to the stream from the API.
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
      payload.componentLibrary
    );
  } catch (error) {
    throw new Error(handleApiError(error, '优化Prompt时'));
  }
};

/**
 * Validates the content of a given prompt.
 * @param {string} promptContent - The prompt content to validate.
 * @returns {Promise<string>} A promise that resolves to the validation feedback.
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
