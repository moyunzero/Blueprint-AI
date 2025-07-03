<template>
  <div class="image-to-code-panel">
    <el-row :gutter="24" class="main-row">
      <!-- 左侧：上传和设置区域 -->
      <el-col :lg="10" :md="11" :sm="24" class="left-column">
        <!-- The parent (Home.vue) will now handle passing props and listening to events -->
        <slot name="upload-settings"></slot>
      </el-col>

      <!-- 右侧：结果展示区域 -->
      <el-col :lg="14" :md="13" :sm="24" class="right-column">
        <el-card class="result-card">
          <template #header>
            <div class="result-header">
              <div class="header-title">
                <el-icon><DocumentCopy /></el-icon>
                <span class="header-text">生成结果 (Blueprint)</span>
              </div>
              <div class="header-actions" v-if="sessionStore.activePrompt && !sessionStore.isGenerating">
                <el-button
                  size="small"
                  :icon="Clock"
                  @click="emit('open-history-dialog')"
                  :disabled="props.promptVersions.length === 0"
                  class="action-btn"
                >
                  History
                </el-button>
                <el-button
                  size="small"
                  type="primary"
                  :icon="ChatDotRound"
                  @click="emit('open-chat-dialog')"
                  class="action-btn"
                >
                  Optimize
                </el-button>
                <el-button
                  size="small"
                  :type="isEditing ? 'success' : 'warning'"
                  :icon="isEditing ? Check : Edit"
                  @click="toggleEditMode"
                  class="action-btn"
                >
                  {{ isEditing ? 'Save' : 'Edit' }}
                </el-button>
                <el-button
                  v-if="isEditing"
                  size="small"
                  :icon="Close"
                  @click="cancelEdit"
                  class="action-btn"
                >
                  Cancel
                </el-button>
                <el-button
                  size="small"
                  :icon="CopyDocument"
                  @click="copyPrompt"
                  class="action-btn copy-btn"
                >
                  {{ copied ? 'Copied' : 'Copy' }}
                </el-button>
              </div>
            </div>
          </template>

          <div class="result-body">
            <!-- 空状态 -->
            <div v-if="!sessionStore.activePrompt && !sessionStore.isGenerating" class="empty-state">
              <div class="empty-icon"><el-icon><MagicStick /></el-icon></div>
              <h3 class="empty-title">将您的设计转化为开发蓝图</h3>
              <p class="empty-desc">上传您的 UI 设计稿，配置生成参数，然后点击"生成蓝图"，即可获得一份为前端开发量身定制的、详尽的实现指南。</p>
              <div class="empty-steps">
                <div class="step-item"><div class="step-number">1</div><span>上传设计</span></div>
                <div class="step-item"><div class="step-number">2</div><span>配置设置</span></div>
                <div class="step-item"><div class="step-number">3</div><span>生成蓝图</span></div>
              </div>
            </div>

            <!-- 初始加载状态 -->
            <div v-else-if="sessionStore.isGenerating && !sessionStore.activePrompt" class="loading-container">
              <div class="loading-spinner"><el-icon class="is-loading"><Loading /></el-icon></div>
              <p class="loading-text">正在生成开发蓝图...</p>
              <div class="loading-progress"><div class="progress-bar"></div></div>
            </div>

            <!-- 结果内容 -->
            <div class="result-content" ref="promptContainerRef" v-show="sessionStore.activePrompt || sessionStore.isGenerating">
              <!-- 编辑模式 -->
              <div v-if="isEditing" class="edit-mode">
                <el-input
                  v-model="editingContent"
                  type="textarea"
                  placeholder="在此处编辑您的蓝图内容..."
                  class="edit-textarea"
                  ref="editTextareaRef"
                />
                <div class="edit-tips">
                  <el-icon><InfoFilled /></el-icon>
                  <span>支持 Markdown 格式。您的更改将在保存后生效。</span>
                </div>
              </div>
              <!-- 预览模式 -->
              <div v-else class="preview-mode" v-html="formattedPrompt"></div>

              
              <!-- 流式生成时的加载指示器 (现在在result-content内部) -->
              <div v-if="sessionStore.isGenerating && sessionStore.activePrompt" class="streaming-indicator">
                 <el-icon class="is-loading streaming-icon"><Loading /></el-icon>
                <span class="streaming-text">正在生成...</span>
              </div>

              <!-- Prompt 校验结果 (现在在result-content内部) -->
              <div v-if="!sessionStore.isGenerating && validationStore.validationResults && !isEditing" class="validation-results">
                <el-divider><el-icon><Warning /></el-icon> 蓝图质量校验</el-divider>
                <div v-html="marked(validationStore.validationResults)" class="validation-content-validation"></div>
                <p class="validation-tip">请根据以上建议优化您的蓝图，以提升最终代码质量。</p>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { ElMessage, ElDivider } from 'element-plus';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import { useSessionStore } from '@/stores/sessionStore';
import { usePromptValidationStore } from '@/stores/promptValidationStore';
import { 
  DocumentCopy, Clock, ChatDotRound, Check, Edit, Close, MagicStick, Loading, InfoFilled, Warning, CopyDocument
} from '@element-plus/icons-vue';

// Debounce function
function debounce(fn, delay) {
  let timeoutID = null;
  return function(...args) {
    clearTimeout(timeoutID);
    timeoutID = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// --- Props & Emits ---
const props = defineProps({
  promptVersions: {
    type: Array,
    default: () => []
  },
});
const emit = defineEmits(['open-chat-dialog', 'open-history-dialog']);

// --- Store ---
const sessionStore = useSessionStore();
const validationStore = usePromptValidationStore();

// --- State ---
const copied = ref(false);
const isEditing = ref(false);
const editingContent = ref('');

// --- Template Refs ---
const promptContainerRef = ref(null);
const editTextareaRef = ref(null);

// --- Computed ---
const formattedPrompt = computed(() => {
  if (!sessionStore.activePrompt) return '';
  return marked(sessionStore.activePrompt);
});

// --- Watchers ---
const debouncedValidate = debounce(() => {
  validationStore.validatePrompt(editingContent.value);
}, 1500);

watch(editingContent, (newValue) => {
  if (isEditing.value && newValue) {
    debouncedValidate();
  }
});

watch(() => sessionStore.activePrompt, (newVal, oldVal) => {
  // Auto-scroll to bottom during streaming generation
  nextTick(() => {
    const container = promptContainerRef.value?.querySelector('.preview-mode');
    if (container && sessionStore.isGenerating) {
        const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
        if (isNearBottom) {
            container.scrollTop = container.scrollHeight;
        }
    }
  });
});

// --- Lifecycle ---
onMounted(() => {
  marked.setOptions({
    highlight: function(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'language-',
    gfm: true,
    breaks: true,
  });
});

// --- Methods ---
async function copyPrompt() {
  if (!sessionStore.activePrompt) return;
  try {
    await navigator.clipboard.writeText(sessionStore.activePrompt);
    copied.value = true;
    ElMessage.success('Copied to clipboard');
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (error) {
    ElMessage.error('Failed to copy');
  }
}

function toggleEditMode() {
  if (isEditing.value) {
    saveEditedContent();
  } else {
    enterEditMode();
  }
}

function enterEditMode() {
  isEditing.value = true;
  editingContent.value = sessionStore.activePrompt;
  nextTick(() => {
    editTextareaRef.value?.focus();
  });
}

function saveEditedContent() {
  if (editingContent.value.trim() === '') {
    ElMessage.warning('Content cannot be empty');
    return;
  }
  // Directly update the store's state
  sessionStore.activePrompt = editingContent.value;
  // Add this edited version to history
  sessionStore._addPromptVersion('edited'); // Using the "private" action
  isEditing.value = false;
  ElMessage.success('Content saved');
  // Trigger validation after saving
  validationStore.validatePrompt(sessionStore.activePrompt);
}

function cancelEdit() {
  isEditing.value = false;
  editingContent.value = '';
  ElMessage.info('Edit cancelled');
  // On cancel, re-validate the original prompt if it exists
  if (sessionStore.activePrompt) {
    validationStore.validatePrompt(sessionStore.activePrompt);
  }
}
</script>

<style scoped>
.image-to-code-panel {
  /* Simplified layout */
}
.main-row {
  margin: 0 !important;
}
.left-column {
  /* Natural column layout */
}
.right-column {
  /* Natural column layout */
}
.left-column { padding-right: 12px !important; }
.right-column { padding-left: 12px !important; }

.result-card {
  /* Basic card layout */
}
.result-card :deep(.el-card__body) {
  padding: 0 !important;
}
.result-body {
  padding: 24px;
}

.result-header {
  display: flex; justify-content: space-between; align-items: center;
}
.header-title {
  display: flex; align-items: center; gap: 12px; font-size: 18px; font-weight: 600;
  color: var(--color-primary); text-shadow: var(--text-shadow-primary);
}
.header-actions {
  display: flex; gap: 8px;
}
.header-actions .el-button .el-icon { margin-right: 4px; }

.result-content {
  background: var(--color-bg-medium);
  border: 1px solid var(--color-bg-light);
  border-radius: var(--border-radius);
  /* Allow content to expand naturally, but set a reasonable max height */
  max-height: 80vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.preview-mode {
  flex: 1;
  overflow-y: auto; /* This is where the scroll will happen */
  padding: var(--spacing-xl);
  font-family: var(--font-family);
  line-height: 1.7;
  min-height: 300px;
}

/* Markdown Content Styling within preview-mode */
.preview-mode :deep(h1), .preview-mode :deep(h2), .preview-mode :deep(h3) {
  color: var(--color-text-primary);
  font-weight: 700;
  margin: 24px 0 16px 0;
  line-height: 1.3;
  border-bottom: 1px solid var(--color-bg-light);
  padding-bottom: 8px;
}
.preview-mode :deep(h2) { color: var(--color-primary); }
.preview-mode :deep(p) { 
  color: var(--color-text-secondary); 
  margin: 16px 0; 
  font-size: 15px; 
  font-weight: 500; /* 增加字体粗细 */
}
.preview-mode :deep(pre) { padding: 0; margin: 20px 0; background-color: transparent !important; }
.preview-mode :deep(pre code.hljs) {
  background: #F1F5F9; /* Light background for code blocks */
  color: var(--color-text-primary);
  padding: 20px;
  border-radius: var(--border-radius);
  overflow-x: auto;
  border: 1px solid var(--color-bg-light);
}
.preview-mode :deep(code:not(.hljs)) {
  background: var(--color-bg-light);
  color: var(--color-primary);
  padding: .2em .4em;
  border-radius: 4px;
  font-family: var(--font-family-mono);
  font-size: 0.9em;
  font-weight: 600;
}

/* Loading & Empty States */
.loading-container, .empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 80px 20px; flex-grow: 1; text-align: center;
}
.loading-spinner .el-icon { font-size: 48px; color: var(--color-primary); }
.loading-text { font-size: 18px; font-weight: 500; color: var(--color-text-secondary); margin: 24px 0; }
.loading-progress { width: 200px; height: 4px; background: var(--color-bg-light); border-radius: 2px; overflow: hidden; }
.progress-bar { height: 100%; background: var(--color-primary); border-radius: 2px; animation: progress 2s ease-in-out infinite; }
@keyframes progress { 0% { width: 0%; } 50% { width: 70%; } 100% { width: 100%; } }

.empty-icon {
  width: 80px; height: 80px; border-radius: 50%;
  background: rgba(var(--color-primary-rgb), 0.08);
  border: 1px solid rgba(var(--color-primary-rgb), 0.15);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 24px;
}
.empty-icon .el-icon { font-size: 36px; color: var(--color-primary); }
.empty-title { font-size: 20px; font-weight: 600; color: var(--color-text-primary); margin: 0 0 12px 0; }
.empty-desc { font-size: 15px; color: var(--color-text-secondary); max-width: 450px; margin: 0 auto 32px auto; line-height: 1.7; }
.empty-steps { display: flex; gap: 24px; justify-content: center; }
.step-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.step-number { width: 32px; height: 32px; border-radius: 50%; background: var(--color-primary); color: var(--color-bg-dark); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; }
.step-item span { font-size: 12px; color: var(--color-text-secondary); }

/* Streaming, Editing, Validation */
.streaming-indicator {
  padding: 12px;
  text-align: center;
  flex-shrink: 0; /* Prevent this from shrinking */
  display: flex; align-items: center; justify-content: center; gap: 8px;
  color: var(--color-primary); font-size: 14px;
}
.streaming-icon { font-size: 16px; }

.edit-mode {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  min-height: 0;
}
.edit-textarea {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}
.edit-textarea :deep(.el-textarea__inner) {
  flex-grow: 1;
  font-family: var(--font-family-mono); font-size: 14px; line-height: 1.6;
  border-radius: var(--border-radius); border: 1px solid var(--color-bg-light);
  resize: none; /* Disable native resize, rely on flexbox */
  height: 100%;
}
.edit-tips {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 8px; padding: 12px; margin-top: 12px;
  background: rgba(var(--color-primary-rgb), 0.08);
  border: 1px solid rgba(var(--color-primary-rgb), 0.15);
  border-radius: var(--border-radius); color: var(--color-primary); font-size: 13px;
}

.validation-results {
  flex-shrink: 0;
  margin: 16px;
  padding: 20px;
  background: rgba(var(--color-accent-rgb), 0.08);
  border: 1px solid rgba(var(--color-accent-rgb), 0.2);
  border-radius: var(--border-radius);
  /* Remove height restriction to show full content */
}
.validation-results .el-divider { background-color: transparent; }
.validation-results .el-divider__text { font-weight: 600; color: var(--color-accent); }
.validation-results .el-divider .el-icon { color: var(--color-accent); margin-right: 8px; }
.validation-content-validation { 
  color: var(--color-text-primary); 
  font-weight: 500;
  line-height: 1.6;
}
.validation-content-validation :deep(p) {
  margin: 12px 0;
  font-size: 14px;
}
.validation-content-validation :deep(ul), .validation-content-validation :deep(ol) {
  margin: 12px 0;
  padding-left: 20px;
}
.validation-content-validation :deep(li) {
  margin: 8px 0;
  font-size: 14px;
}
.validation-tip { 
  margin-top: 15px; 
  font-size: 13px; 
  color: var(--color-accent); 
  text-align: center; 
  font-weight: 600;
}

@media screen and (max-width: 768px) {
  .main-row { flex-direction: column; }
  .left-column, .right-column { padding: 0 !important; margin-bottom: 16px; }
  .right-column { margin-bottom: 0; }
  .result-header { flex-direction: column; gap: 12px; align-items: flex-start; }
  .header-actions { width: 100%; justify-content: flex-start; flex-wrap: wrap; }
  .result-content { min-height: 450px; }
}
</style>
