import { defineStore } from 'pinia'
import { generateInitialPrompt } from '@/services/aiService'
import { usePromptValidationStore } from './promptValidationStore'
import { DEFAULT_FORM_CONFIG } from '@/config/constants';

const SESSION_FORMAT_VERSION = '1.0.1'

// Helper function to get the default state, making resets easy.
const getDefaultState = () => ({
  isGenerating: false,
  // Inputs
  currentImageBase64: '',
  formSettings: {
    appType: DEFAULT_FORM_CONFIG.appType,
    componentLibrary: DEFAULT_FORM_CONFIG.componentLibrary,
    framework: DEFAULT_FORM_CONFIG.framework,
    temperature: DEFAULT_FORM_CONFIG.temperature
  },
  // Outputs & History
  promptVersions: [],
  chatHistory: [],
  // Active state
  activePrompt: '',
  basePromptForChat: '' // The prompt at the start of a chat turn
})

export const useSessionStore = defineStore('session', {
  state: () => getDefaultState(),

  getters: {
    // Getter to format settings for the UploadAndSettings component props
    initialFormSettingsForPanel: (state) => ({
      appType: state.formSettings.appType,
      componentLibrary: state.formSettings.componentLibrary,
      framework: state.formSettings.framework,
      temperature: state.formSettings.temperature
    })
  },

  actions: {
    // This replaces the old RESET_SESSION_STATE mutation
    _resetState() {
      Object.assign(this, getDefaultState())
    },

    // Action to start a new generation session
    startNewSession({ imageBase64, formSettings }) {
      this._resetState()
      this.currentImageBase64 = imageBase64
      if (formSettings) {
        this.formSettings = { ...this.formSettings, ...formSettings }
      }
    },

    // Update settings from the UI
    updateSettings(settings) {
      this.formSettings = { ...this.formSettings, ...settings }
    },

    // A private-like action to add a new version to the history
    _addPromptVersion(source) {
      if (!this.activePrompt) return
      const newVersion = {
        id: Date.now(),
        timestamp: Date.now(),
        content: this.activePrompt,
        source // 'initial', 'refined', 'edited', 'historic'
      }
      this.promptVersions.push(newVersion)
    },

    // Applies a refined prompt from the chat dialog
    applyRefinedPrompt({ refinedPrompt, chatHistory }) {
      this.activePrompt = refinedPrompt
      this.chatHistory = chatHistory
      this.basePromptForChat = refinedPrompt
      this._addPromptVersion('refined')
    },

    // Reverts to a prompt from history
    useHistoricVersion(content) {
      this.activePrompt = content
      // When reverting, we clear chat history and set a new base for future chats
      this.chatHistory = []
      this.basePromptForChat = content
      this._addPromptVersion('historic')
    },

    // Prepares the state for opening the chat dialog
    prepareForChat() {
      this.basePromptForChat = this.activePrompt
    },

    // Main action to generate the initial prompt
    async generateCodePrompt(payload) {
      this.isGenerating = true
      this.activePrompt = ''
      const validationStore = usePromptValidationStore()
      validationStore.clearValidationResults()

      // When a new file is uploaded, it signifies a new session
      if (payload.newRawFileObject) {
        this.startNewSession({
          imageBase64: payload.imageBase64,
          formSettings: {
            appType: payload.appType,
            componentLibrary: payload.componentLibrary,
            framework: payload.framework,
            temperature: payload.temperature * 100
          }
        })
      }

      try {
        const stream = await generateInitialPrompt(payload)
        if (!stream) {
          this.activePrompt = 'Error: No response from the model.'
          return
        }

        let fullContent = ''
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            fullContent += content
            this.activePrompt = fullContent // Directly update state during stream
          }
          // Check for finish reason in the last chunk
          if (chunk.choices[0]?.finish_reason === 'length') {
             this.activePrompt += '\n\n---\n\n⚠️ **内容因长度限制被截断**\n\n---'
          }
        }
        
        if (!fullContent) {
           this.activePrompt = '生成失败：未收到有效响应，请重试。'
           return
        }

        // Add the final, complete prompt to history
        this._addPromptVersion('initial')

        // After generation, trigger validation
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

    // Save/Load Session Actions
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
            // Directly assign loaded data to state
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
