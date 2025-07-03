import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'

const PROMPT_TEMPLATES_KEY = 'blueprint_ai_prompt_templates'

export const usePromptTemplateStore = defineStore('promptTemplate', {
  state: () => ({
    promptTemplates: []
  }),

  getters: {
    // A getter to return templates sorted by creation date
    sortedTemplates: (state) => {
      return [...state.promptTemplates].sort((a, b) => b.createdAt - a.createdAt)
    }
  },

  actions: {
    // Persist templates to localStorage
    _persist() {
      try {
        localStorage.setItem(PROMPT_TEMPLATES_KEY, JSON.stringify(this.promptTemplates))
      } catch (error) {
        console.error('Failed to save prompt templates to localStorage:', error)
        ElMessage.error('无法保存模板到本地存储')
      }
    },

    // Load templates from localStorage
    loadPromptTemplates() {
      try {
        const templates = JSON.parse(localStorage.getItem(PROMPT_TEMPLATES_KEY) || '[]')
        this.promptTemplates = templates
      } catch (error) {
        console.error('Failed to load prompt templates from localStorage:', error)
        this.promptTemplates = [] // Fallback to empty if corrupted
        ElMessage.error('加载本地模板失败，数据可能已损坏')
      }
    },

    // Save or update a template
    savePromptTemplate(template) {
      const index = this.promptTemplates.findIndex((t) => t.id === template.id)
      if (index !== -1) {
        // Update existing template
        this.promptTemplates[index] = template
      } else {
        // Add new template with a new ID
        template.id = Date.now()
        this.promptTemplates.push(template)
      }
      this._persist()
      return template
    },

    // Delete a template
    deletePromptTemplate(templateId) {
      this.promptTemplates = this.promptTemplates.filter((t) => t.id !== templateId)
      this._persist()
    },

    // Import templates from a file
    importPromptTemplates(newTemplates) {
      const existingIds = new Set(this.promptTemplates.map((t) => t.id))
      const importedCount = newTemplates.length
      let addedCount = 0
      let updatedCount = 0

      newTemplates.forEach((newTpl) => {
        if (newTpl.id && existingIds.has(newTpl.id)) {
          // If ID exists, update it
          const index = this.promptTemplates.findIndex((t) => t.id === newTpl.id)
          this.promptTemplates[index] = { ...newTpl, id: newTpl.id }
          updatedCount++
        } else {
          // If no ID or ID doesn't exist, add as new
          this.promptTemplates.push({ ...newTpl, id: Date.now() + Math.random().toString(36).substring(2, 9) })
          addedCount++
        }
      })

      this._persist()
      return { importedCount, addedCount, updatedCount }
    }
  }
})
