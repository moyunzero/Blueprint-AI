import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'

const PROMPT_TEMPLATES_KEY = 'blueprint_ai_prompt_templates'

/**
 * promptTemplateStore.js - 提示词模板管理 Store
 *
 * 用途：
 * - 管理本地提示词模板的增删改查
 * - 支持模板的本地持久化、导入导出
 */
export const usePromptTemplateStore = defineStore('promptTemplate', {
  state: () => ({
    /**
     * 模板列表
     * @type {Array<Object>}
     */
    promptTemplates: []
  }),

  getters: {
    /**
     * 按创建时间倒序排序的模板列表
     * @param {Object} state
     * @returns {Array<Object>} 排序后的模板数组
     */
    sortedTemplates: (state) => {
      return [...state.promptTemplates].sort((a, b) => b.createdAt - a.createdAt)
    }
  },

  actions: {
    /**
     * 持久化模板到 localStorage（私有方法）
     */
    _persist() {
      try {
        localStorage.setItem(PROMPT_TEMPLATES_KEY, JSON.stringify(this.promptTemplates))
      } catch (error) {
        console.error('Failed to save prompt templates to localStorage:', error)
        ElMessage.error('无法保存模板到本地存储')
      }
    },

    /**
     * 从 localStorage 加载模板
     */
    loadPromptTemplates() {
      try {
        const templates = JSON.parse(localStorage.getItem(PROMPT_TEMPLATES_KEY) || '[]')
        this.promptTemplates = templates
      } catch (error) {
        console.error('Failed to load prompt templates from localStorage:', error)
        this.promptTemplates = []
        ElMessage.error('加载本地模板失败，数据可能已损坏')
      }
    },

    /**
     * 保存或更新模板
     * @param {Object} template - 模板对象
     * @returns {Object} 保存后的模板
     */
    savePromptTemplate(template) {
      const index = this.promptTemplates.findIndex((t) => t.id === template.id)
      if (index !== -1) {
        this.promptTemplates[index] = template
      } else {
        template.id = Date.now()
        this.promptTemplates.push(template)
      }
      this._persist()
      return template
    },

    /**
     * 删除模板
     * @param {number|string} templateId - 模板ID
     */
    deletePromptTemplate(templateId) {
      this.promptTemplates = this.promptTemplates.filter((t) => t.id !== templateId)
      this._persist()
    },

    /**
     * 导入模板（支持去重和更新）
     * @param {Array<Object>} newTemplates - 导入的模板数组
     * @returns {Object} 导入统计 {importedCount, addedCount, updatedCount}
     */
    importPromptTemplates(newTemplates) {
      const existingIds = new Set(this.promptTemplates.map((t) => t.id))
      const importedCount = newTemplates.length
      let addedCount = 0
      let updatedCount = 0
      newTemplates.forEach((newTpl) => {
        if (newTpl.id && existingIds.has(newTpl.id)) {
          const index = this.promptTemplates.findIndex((t) => t.id === newTpl.id)
          this.promptTemplates[index] = { ...newTpl, id: newTpl.id }
          updatedCount++
        } else {
          this.promptTemplates.push({ ...newTpl, id: Date.now() + Math.random().toString(36).substring(2, 9) })
          addedCount++
        }
      })
      this._persist()
      return { importedCount, addedCount, updatedCount }
    }
  }
})
