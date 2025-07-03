import { defineStore } from 'pinia'
import { validatePrompt as apiValidatePromptContent } from '@/services/aiService'

export const usePromptValidationStore = defineStore('promptValidation', {
  state: () => ({
    validationResults: ''
  }),
  actions: {
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
    clearValidationResults() {
      this.validationResults = ''
    }
  }
})
