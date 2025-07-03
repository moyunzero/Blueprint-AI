<template>
  <!-- 页面主容器 -->
  <div class="home">
    <!-- 顶部介绍区（品牌/产品说明） -->
    <el-row :gutter="20" class="hero-row">
      <el-col :span="24">
        <div class="hero-section">
          <h1 class="hero-title">Blueprint AI</h1>
          <p class="hero-description">
            从设计稿到开发蓝图，一步到位。Blueprint AI 将您的 UI 视觉稿瞬间转化为结构清晰、可执行的前端开发任务。
          </p>
        </div>
      </el-col>
    </el-row>

    <!-- 主功能区 Tab 切换 -->
    <el-tabs v-model="activeTab" class="content-tabs">
      <!-- 图片转代码功能面板 -->
      <el-tab-pane label="生成开发蓝图" name="imageToCode">
        <ErrorBoundary>
          <ImageToCodePanel
            :prompt-versions="sessionStore.promptVersions"
            @open-chat-dialog="openChatDialog"
            @open-history-dialog="promptHistoryDialogVisible = true"
          >
            <!-- 上传与设置插槽 -->
            <template #upload-settings>
              <UploadAndSettings
                ref="uploadAndSettingsRef"
                :generate-button-loading="sessionStore.isGenerating"
                :initial-image-base64="sessionStore.currentImageBase64"
                :initial-form-settings="sessionStore.initialFormSettingsForPanel"
                @file-updated="onFileUpdated"
                @settings-changed="onSettingsChanged"
                @generate-prompt-requested="handleGenerateCodePromptRequest"
                @save-session-requested="sessionStore.saveSessionToFile"
                @load-session-file-selected="handleLoadSessionFile"
                @clear-session-requested="handleClearSession"
              />
            </template>
          </ImageToCodePanel>
        </ErrorBoundary>
      </el-tab-pane>
      <!-- Prompt 模板管理面板 -->
      <el-tab-pane label="Prompt 模板管理" name="templateManager">
        <ErrorBoundary>
          <PromptTemplateManager />
        </ErrorBoundary>
      </el-tab-pane>
    </el-tabs>

    <!-- 聊天对话框弹窗 -->
    <ChatDialog
      v-if="chatDialogVisible"
      :visible="chatDialogVisible"
      @update:visible="chatDialogVisible = $event"
      @apply-prompt="handleApplyRefinedPrompt"
      @closed="onChatDialogClosed"
    />
    <!-- Prompt 历史版本弹窗 -->
    <PromptHistoryDialog
      v-if="promptHistoryDialogVisible"
      :visible="promptHistoryDialogVisible"
      @update:visible="promptHistoryDialogVisible = $event"
      :versions="sessionStore.promptVersions"
      @use-version="handleUsePromptVersion"
      @closed="promptHistoryDialogVisible = false"
    />
  </div>
</template>

<script setup>
/**
 * Home.vue - 应用主页面
 *
 * 结构说明：
 * - 顶部品牌介绍区
 * - Tab 主功能区（图片转代码、Prompt 模板管理）
 * - 弹窗区（聊天对话、历史版本）
 *
 * 主要功能：
 * - 管理图片转代码和模板管理两个核心模块
 * - 处理会话状态、文件上传、设置变更、Prompt 生成等事件
 * - 协调各子组件间数据流转和交互
 */

import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'

// ==================== Store 导入 ====================
import { useSessionStore } from '@/stores/sessionStore'
import { usePromptTemplateStore } from '@/stores/promptTemplateStore'

// ==================== 组件导入 ====================
import ImageToCodePanel from '@/components/ImageToCodePanel.vue'
import UploadAndSettings from '@/components/UploadAndSettings.vue'
import ChatDialog from '@/components/ChatDialog.vue'
import PromptHistoryDialog from '@/components/PromptHistoryDialog.vue'
import PromptTemplateManager from '@/components/PromptTemplateManager.vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'

// ==================== 状态管理 ====================

// Store 实例
const sessionStore = useSessionStore()
const templateStore = usePromptTemplateStore()

// 本地响应式状态
const activeTab = ref('imageToCode') // 当前激活的 Tab
const chatDialogVisible = ref(false) // 聊天对话框可见性
const promptHistoryDialogVisible = ref(false) // Prompt 历史弹窗可见性

// 组件引用
const uploadAndSettingsRef = ref(null)

// ==================== 生命周期 ====================

onMounted(() => {
  // 应用启动时加载 Prompt 模板
  templateStore.loadPromptTemplates();
  // 尝试从 localStorage 加载上一次的会话
  sessionStore.loadSessionFromLocalStorage();
})

// ==================== 事件处理函数 ====================

/**
 * 文件上传更新事件
 * @param {Object} payload - 包含文件对象和base64数据的载荷
 */
function onFileUpdated(payload) {
  if (payload.base64Image) {
    // 当新文件上传时，立即通知 store 开始一个新会话
    // 保留现有设置，只替换图片
    sessionStore.startNewSession({ 
      imageBase64: payload.base64Image,
      formSettings: sessionStore.formSettings,
    })
  }
}

/**
 * 设置变更事件
 * @param {Object} settings - 更新的设置对象
 */
function onSettingsChanged(settings) {
  sessionStore.updateSettings(settings)
}

/**
 * 代码 Prompt 生成请求
 * @param {Object} payload - 生成请求的载荷数据
 */
async function handleGenerateCodePromptRequest(payload) {
  await sessionStore.generateCodePrompt(payload)
}

/**
 * 打开聊天对话框
 * 准备聊天状态并显示对话框
 */
function openChatDialog() {
  sessionStore.prepareForChat()
  chatDialogVisible.value = true
}

/**
 * 应用优化后的 Prompt
 * @param {string} refinedPrompt - 优化后的 Prompt 内容
 * @param {Array} updatedChatHistory - 更新的聊天历史
 */
function handleApplyRefinedPrompt(refinedPrompt, updatedChatHistory) {
  sessionStore.applyRefinedPrompt({
    refinedPrompt,
    chatHistory: updatedChatHistory
  })
  ElMessage.success('已应用优化后的提示词')
  chatDialogVisible.value = false
}

/**
 * 聊天对话框关闭事件
 */
function onChatDialogClosed() {
  chatDialogVisible.value = false
}

/**
 * 使用历史版本的 Prompt
 * @param {string} content - 历史版本的 Prompt 内容
 */
function handleUsePromptVersion(content) {
  sessionStore.useHistoricVersion(content)
  ElMessage.success('已切换到选定版本的提示词')
  promptHistoryDialogVisible.value = false
}

/**
 * 从文件加载会话
 * @param {File} file - 会话文件对象
 */
async function handleLoadSessionFile(file) {
  try {
    await sessionStore.loadSessionFromFile(file)
    ElMessage.success('会话加载成功！')
    // 确保 UI 反映加载的状态
    await nextTick()
    uploadAndSettingsRef.value?.clearUploadState()
    activeTab.value = 'imageToCode'
  } catch (error) {
    ElMessage.error(error.message)
  }
}

/**
 * 清空会话
 */
function handleClearSession() {
  sessionStore._resetState()
  // 确保 UI 反映清空的状态
  nextTick(() => {
    uploadAndSettingsRef.value?.clearUploadState()
  })
}
</script>

<style scoped>
/* 页面主容器样式 */
.home {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

/* 顶部品牌介绍区样式 */
.hero-section {
  padding: 24px 0;
  text-align: center;
  margin-bottom: 24px;
}

.hero-title {
  font-family: var(--font-family-mono);
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--color-text-primary);
  letter-spacing: -1px;
  background: -webkit-linear-gradient(315deg, var(--color-primary) 0%, var(--color-accent) 100%);
  -webkit-background-clip: text;
  background-clip: text; /* 标准写法，增强兼容性 */
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.hero-description {
  font-size: 18px;
  color: var(--color-text-secondary);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.7;
}

/* Tab 主功能区样式 */
.content-tabs {
  margin-top: 24px;
}

.content-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0;
  border-bottom: 1px solid var(--color-bg-light);
}

.content-tabs :deep(.el-tabs__content) {
  padding-top: 24px;
}

/* 响应式样式：中等屏幕适配 */
@media screen and (max-width: 1200px) {
  .home {
    padding: 16px;
  }
}

/* 响应式样式：移动端适配 */
@media screen and (max-width: 768px) {
  .home {
    padding: 12px;
    height: auto; /* 允许移动端滚动 */
  }
  .hero-section {
    padding: 16px 0;
    margin-bottom: 16px;
  }
  .hero-title {
    font-size: 36px;
  }
  .hero-description {
    font-size: 16px;
  }
  .content-tabs :deep(.el-tabs__content) {
    padding-top: 16px;
  }
}
</style>
