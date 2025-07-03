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
import { watch } from 'vue'
import { generateInitialPrompt } from '@/services/aiService'
import { usePromptValidationStore } from './promptValidationStore'
import { DEFAULT_FORM_CONFIG } from '@/config/constants'

// ==================== 常量定义 ====================

/** 会话文件格式版本号 */
const SESSION_FORMAT_VERSION = '1.0.2' // 版本提升
/** 本地存储键名 */
const LOCAL_STORAGE_SESSION_KEY = 'blueprint_ai_autosave_session'

// ==================== 工具函数 ====================

/**
 * 防抖函数
 */
function debounce(fn, delay) {
  let timeoutID = null
  return function(...args) {
    clearTimeout(timeoutID)
    timeoutID = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

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
      // 清空本地存储
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY)
    },

    // ==================== 会话保存与加载 ====================

    /**
     * 将当前会话状态保存到 localStorage
     * @private
     */
    _saveSessionToLocalStorage() {
      // 检查是否启用自动保存
      if (process.env.VUE_APP_DISABLE_AUTO_SAVE === 'true') return;
      
      // 只有在有图片或 prompt 时才保存，避免保存空会话
      if (!this.currentImageBase64 && !this.activePrompt) return;
      
      // 创建状态副本，排除生成状态，避免刷新后自动生成
      const stateToSave = {
        ...this.$state,
        isGenerating: false // 始终保存为非生成状态
      };
      
      const sessionData = {
        formatVersion: SESSION_FORMAT_VERSION,
        savedAt: Date.now(),
        state: stateToSave
      }
      try {
        localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(sessionData));
      } catch (e) {
        console.error("Failed to save session to localStorage:", e);
      }
    },

    /**
     * 从 localStorage 加载会话状态
     */
    loadSessionFromLocalStorage() {
      const savedData = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (savedData) {
        try {
          const data = JSON.parse(savedData);
          if (data.formatVersion === SESSION_FORMAT_VERSION && data.state) {
            this.$patch(data.state);
            console.log("Session restored from localStorage.");
          } else {
            // 版本不兼容，清空旧数据
            localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
          }
        } catch(e) {
          console.error("Failed to load session from localStorage:", e);
          localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
        }
      }
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
            const compatibleVersions = ['1.0.0', '1.0.1', '1.0.2']
            if (!data.formatVersion || !compatibleVersions.includes(data.formatVersion)) {
              return reject(new Error(`会话文件版本不兼容。期望版本: ${compatibleVersions.join('或 ')}。`))
            }
            this._resetState()
            
            // 兼容旧格式和新格式
            const stateToLoad = data.state || {
                currentImageBase64: data.initialImageBase64,
                formSettings: data.initialFormSettings,
                promptVersions: data.promptVersions,
                chatHistory: data.chatHistory,
                activePrompt: data.activePrompt,
                basePromptForChat: data.basePromptForChat
            };

            this.$patch(stateToLoad);

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

// 自动保存功能 - 通过 Pinia 插件实现
export function setupAutoSave(pinia) {
  pinia.use(({ store }) => {
    if (store.$id === 'session') {
      const debouncedSave = debounce(() => {
        store._saveSessionToLocalStorage();
      }, 1000); // 1秒防抖

      // 监听整个 state 的变化
      watch(
        store.$state,
        () => {
          debouncedSave();
        },
        { deep: true }
      );
    }
  });
}
