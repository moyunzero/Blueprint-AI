import { defineStore } from 'pinia'
import { validatePrompt as apiValidatePromptContent } from '@/services/aiService'

/**
 * promptValidationStore.js - 提示词校验状态管理
 *
 * 用途：
 * - 管理提示词内容的校验结果
 * - 提供校验和清空校验结果的 action
 */
export const usePromptValidationStore = defineStore('promptValidation', {
  state: () => ({
    /**
     * 校验结果字符串（可用于 UI 展示）
     * @type {string}
     */
    validationResults: ''
  }),
  actions: {
    /**
     * 校验提示词内容，异步调用后端/AI 服务
     * @param {string} promptContent - 待校验的提示词内容
     */
    async validatePrompt(promptContent) {
      if (!promptContent) {
        this.validationResults = ''
        return
      }
      try {
        const results = await apiValidatePromptContent(promptContent)
        this.validationResults = results
      } catch (error) {
        console.error('Failed to validate prompt:', error)
        this.validationResults = '💡 校验功能暂时不可用：' + error.message
      }
    },
    /**
     * 清空校验结果
     */
    clearValidationResults() {
      this.validationResults = ''
    }
  }
})
