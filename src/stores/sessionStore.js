/**
 * sessionStore.js - 会话状态管理
 * 
 * 功能说明：
 * - 管理用户会话的完整生命周期
 * - 处理图片上传和设置配置
 * - 管理提示词生成和历史版本
 * - 支持会话的保存和加载功能
 * - 协调聊天对话和提示词优化流程
 */

import { defineStore } from 'pinia'
import { generateInitialPrompt } from '@/services/aiService'
import { usePromptValidationStore } from './promptValidationStore'
import { DEFAULT_FORM_CONFIG } from '@/config/constants'

// ==================== 常量定义 ====================

/** 会话文件格式版本号 */
const SESSION_FORMAT_VERSION = '1.0.1'

// ==================== 状态初始化 ====================

/**
 * 获取默认状态对象
 * 用于状态重置和初始化
 * @returns {Object} 默认状态对象
 */
const getDefaultState = () => ({
  // 生成状态
  isGenerating: false,
  
  // 输入数据
  currentImageBase64: '',
  formSettings: {
    appType: DEFAULT_FORM_CONFIG.appType,
    componentLibrary: DEFAULT_FORM_CONFIG.componentLibrary,
    framework: DEFAULT_FORM_CONFIG.framework,
    temperature: DEFAULT_FORM_CONFIG.temperature
  },
  
  // 输出和历史
  promptVersions: [],
  chatHistory: [],
  
  // 活动状态
  activePrompt: '',
  basePromptForChat: '' // 聊天开始时的基础提示词
})

// ==================== Store 定义 ====================

export const useSessionStore = defineStore('session', {
  state: () => getDefaultState(),

  getters: {
    /**
     * 获取 UploadAndSettings 组件所需的初始表单设置
     * @param {Object} state - 当前状态
     * @returns {Object} 格式化后的设置对象
     */
    initialFormSettingsForPanel: (state) => ({
      appType: state.formSettings.appType,
      componentLibrary: state.formSettings.componentLibrary,
      framework: state.formSettings.framework,
      temperature: state.formSettings.temperature
    })
  },

  actions: {
    // ==================== 状态管理 ====================

    /**
     * 重置会话状态到初始状态（私有方法）
     */
    _resetState() {
      Object.assign(this, getDefaultState())
    },

    /**
     * 开始新的生成会话，重置状态并设置图片和表单配置
     * @param {Object} params - { imageBase64, formSettings }
     */
    startNewSession({ imageBase64, formSettings }) {
      this._resetState()
      this.currentImageBase64 = imageBase64
      if (formSettings) {
        this.formSettings = { ...this.formSettings, ...formSettings }
      }
    },

    /**
     * 更新用户设置（表单配置）
     * @param {Object} settings - 新的设置对象
     */
    updateSettings(settings) {
      this.formSettings = { ...this.formSettings, ...settings }
    },

    // ==================== 提示词版本管理 ====================

    /**
     * 添加当前 activePrompt 到历史版本
     * @param {string} source - 版本来源（'initial'|'refined'|'edited'|'historic'|'error'）
     * @private
     */
    _addPromptVersion(source) {
      if (!this.activePrompt) return
      const newVersion = {
        id: Date.now(),
        timestamp: Date.now(),
        content: this.activePrompt,
        source // 'initial', 'refined', 'edited', 'historic', 'error'
      }
      this.promptVersions.push(newVersion)
    },

    /**
     * 应用优化后的提示词（来自聊天对话框）
     * @param {Object} params - { refinedPrompt, chatHistory }
     */
    applyRefinedPrompt({ refinedPrompt, chatHistory }) {
      this.activePrompt = refinedPrompt
      this.chatHistory = chatHistory
      this.basePromptForChat = refinedPrompt
      this._addPromptVersion('refined')
    },

    /**
     * 使用历史版本的提示词，清空聊天历史并设置新基础
     * @param {string} content - 历史版本的提示词内容
     */
    useHistoricVersion(content) {
      this.activePrompt = content
      this.chatHistory = []
      this.basePromptForChat = content
      this._addPromptVersion('historic')
    },

    /**
     * 为打开聊天对话框准备状态（设置基础提示词）
     */
    prepareForChat() {
      this.basePromptForChat = this.activePrompt
    },

    /**
     * 生成初始代码提示词（主流程，支持流式响应）
     * @param {Object} payload - 生成参数，主要包含表单配置
     */
    async generateCodePrompt(payload) {
      this.isGenerating = true
      this.activePrompt = ''
      const validationStore = usePromptValidationStore()
      validationStore.clearValidationResults()

      // 更新设置以防在点击前有最后修改
      this.updateSettings(payload)
      
      try {
        const apiPayload = {
          imageBase64: this.currentImageBase64,
          appType: this.formSettings.appType,
          temperature: payload.temperature,
          framework: this.formSettings.framework,
          componentLibrary: this.formSettings.componentLibrary,
          customSystemPrompt: payload.customSystemPrompt,
        }

        const stream = await generateInitialPrompt(apiPayload)
        
        if (!stream) {
          this.activePrompt = 'Error: No response from the model.'
          return
        }
        let fullContent = ''
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            fullContent += content
            this.activePrompt = fullContent
          }
          if (chunk.choices[0]?.finish_reason === 'length') {
             this.activePrompt += '\n\n---\n\n⚠️ **内容因长度限制被截断**\n\n---'
          }
        }
        if (!fullContent) {
           this.activePrompt = '生成失败：未收到有效响应，请重试。'
           return
        }
        this._addPromptVersion('initial')
        if (this.activePrompt) {
          await validationStore.validatePrompt(this.activePrompt)
        }
      } catch (error) {
        console.error('生成代码Prompt时发生错误:', error)
        this.activePrompt = error.message
        this._addPromptVersion('error')
      } finally {
        this.isGenerating = false
      }
    },

    // ==================== 会话保存与加载 ====================

    /**
     * 保存当前会话到本地文件（JSON）
     */
    saveSessionToFile() {
      const sessionData = {
        formatVersion: SESSION_FORMAT_VERSION,
        createdAt: Date.now(),
        initialImageBase64: this.currentImageBase64,
        initialFormSettings: this.formSettings,
        promptVersions: this.promptVersions,
        chatHistory: this.chatHistory,
        activePrompt: this.activePrompt,
        basePromptForChat: this.basePromptForChat
      }
      const jsonData = JSON.stringify(sessionData, null, 2)
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `blueprint_ai_session_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },

    /**
     * 从本地文件加载会话，自动兼容版本
     * @param {File} file - 会话文件对象
     * @returns {Promise<void>} 加载完成
     */
    loadSessionFromFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result)
            const compatibleVersions = ['1.0.0', '1.0.1']
            if (!data.formatVersion || !compatibleVersions.includes(data.formatVersion)) {
              return reject(new Error(`会话文件版本不兼容。期望版本: ${compatibleVersions.join('或 ')}。`))
            }
            this._resetState()
            this.currentImageBase64 = data.initialImageBase64 || ''
            this.formSettings = data.initialFormSettings || getDefaultState().formSettings
            this.promptVersions = data.promptVersions || []
            this.chatHistory = data.chatHistory || []
            this.activePrompt = data.activePrompt || ''
            this.basePromptForChat = data.basePromptForChat || data.activePrompt || ''
            resolve()
          } catch (error) {
            reject(new Error('加载会话失败: 文件格式无效或已损坏。' + error.message))
          }
        }
        reader.onerror = (err) => reject(new Error('读取文件失败: ' + err))
        reader.readAsText(file)
      })
    }
  }
})
