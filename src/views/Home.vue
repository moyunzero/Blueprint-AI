<template>
  <div class="home">
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

    <el-tabs v-model="activeTab" class="content-tabs">
      <el-tab-pane label="生成开发蓝图" name="imageToCode">
        <ErrorBoundary>
          <ImageToCodePanel
            :prompt-versions="sessionStore.promptVersions"
            @open-chat-dialog="openChatDialog"
            @open-history-dialog="promptHistoryDialogVisible = true"
          >
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
              />
            </template>
          </ImageToCodePanel>
        </ErrorBoundary>
      </el-tab-pane>
      <el-tab-pane label="Prompt 模板管理" name="templateManager">
        <ErrorBoundary>
          <PromptTemplateManager />
        </ErrorBoundary>
      </el-tab-pane>
    </el-tabs>

    <!-- Dialogs -->
    <ChatDialog
      v-if="chatDialogVisible"
      :visible="chatDialogVisible"
      @update:visible="chatDialogVisible = $event"
      @apply-prompt="handleApplyRefinedPrompt"
      @closed="onChatDialogClosed"
    />
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
import { ref, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';

// Import Pinia Stores
import { useSessionStore } from '@/stores/sessionStore';
import { usePromptTemplateStore } from '@/stores/promptTemplateStore';

// Import Components
import ImageToCodePanel from '@/components/ImageToCodePanel.vue';
import UploadAndSettings from '@/components/UploadAndSettings.vue';
import ChatDialog from '@/components/ChatDialog.vue';
import PromptHistoryDialog from '@/components/PromptHistoryDialog.vue';
import PromptTemplateManager from '@/components/PromptTemplateManager.vue';
import ErrorBoundary from '@/components/ErrorBoundary.vue';

// --- Store Instances ---
const sessionStore = useSessionStore();
const templateStore = usePromptTemplateStore();

// --- Local State ---
const activeTab = ref('imageToCode');
const chatDialogVisible = ref(false);
const promptHistoryDialogVisible = ref(false);

// --- Template Refs ---
const uploadAndSettingsRef = ref(null);

// --- Lifecycle Hooks ---
onMounted(() => {
  // Load templates when the application starts
  templateStore.loadPromptTemplates();
});

// --- Methods ---

// Event handler for file updates from UploadAndSettings
function onFileUpdated({ fileObject }) {
  if (fileObject) {
    // A new file upload always starts a new session
    // The sessionStore action will handle resetting state and setting the new image
  }
}

// Event handler for settings changes
function onSettingsChanged(settings) {
  sessionStore.updateSettings(settings);
}

// Event handler to trigger prompt generation
async function handleGenerateCodePromptRequest(payload) {
  await sessionStore.generateCodePrompt(payload);
}

// Open the chat dialog
function openChatDialog() {
  sessionStore.prepareForChat();
  chatDialogVisible.value = true;
}

// Apply the refined prompt from the chat dialog
function handleApplyRefinedPrompt(refinedPrompt, updatedChatHistory) {
  sessionStore.applyRefinedPrompt({
    refinedPrompt,
    chatHistory: updatedChatHistory,
  });
  ElMessage.success('已应用优化后的提示词');
  chatDialogVisible.value = false;
}

function onChatDialogClosed() {
  chatDialogVisible.value = false;
}

// Use a specific version from history
function handleUsePromptVersion(content) {
  sessionStore.useHistoricVersion(content);
  ElMessage.success('已切换到选定版本的提示词。');
  promptHistoryDialogVisible.value = false;
}

// Load a session from a file
async function handleLoadSessionFile(file) {
  try {
    await sessionStore.loadSessionFromFile(file);
    ElMessage.success('会话加载成功！');
    
    // After loading, we need to ensure the UI reflects the loaded state.
    // The watchers in UploadAndSettings will handle props changes.
    // We can also force a clear/reset of the uploader component state if needed.
    await nextTick();
    uploadAndSettingsRef.value?.clearUploadState();
    activeTab.value = 'imageToCode';

  } catch (error) {
    ElMessage.error(error.message);
  }
}
</script>

<style scoped>
.home {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

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

.content-tabs :deep(.el-tab-pane) {
  /* Remove all flex constraints */
}

@media screen and (max-width: 1200px) {
  .home {
    padding: 16px;
  }
}

@media screen and (max-width: 768px) {
  .home {
    padding: 12px;
    height: auto; /* Allow scrolling on mobile */
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
