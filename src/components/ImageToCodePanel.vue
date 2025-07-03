<template>
  <!-- 图片转代码主面板组件 - 负责展示生成结果和提供编辑功能 -->
  <div class="image-to-code-panel">
    <!-- 主要布局：左右分栏结构 -->
    <el-row :gutter="24" class="main-row">
      <!-- 左侧栏：上传和设置区域 -->
      <el-col :lg="10" :md="11" :sm="24" class="left-column">
        <!-- 通过插槽接收父组件传入的上传和设置组件 -->
        <!-- 父组件 (Home.vue) 负责处理属性传递和事件监听 -->
        <slot name="upload-settings"></slot>
      </el-col>

      <!-- 右侧栏：结果展示区域 -->
      <el-col :lg="14" :md="13" :sm="24" class="right-column">
        <el-card class="result-card">
          <!-- 卡片头部：标题和操作按钮 -->
          <template #header>
            <div class="result-header">
              <!-- 标题区域 -->
              <div class="header-title">
                <el-icon><DocumentCopy /></el-icon>
                <span class="header-text">生成结果 (Blueprint)</span>
              </div>
              
              <!-- 操作按钮组：仅在有内容且非生成状态时显示 -->
              <div class="header-actions" v-if="sessionStore.activePrompt && !sessionStore.isGenerating">
                <!-- 历史记录按钮 -->
                <el-button
                  size="small"
                  :icon="Clock"
                  @click="emit('open-history-dialog')"
                  :disabled="props.promptVersions.length === 0"
                  class="action-btn"
                >
                  History
                </el-button>
                
                <!-- 优化按钮：打开聊天对话框进行内容优化 -->
                <el-button
                  size="small"
                  type="primary"
                  :icon="ChatDotRound"
                  @click="emit('open-chat-dialog')"
                  class="action-btn"
                >
                  Optimize
                </el-button>
                
                <!-- 编辑/保存按钮：切换编辑模式 -->
                <el-button
                  size="small"
                  :type="isEditing ? 'success' : 'warning'"
                  :icon="isEditing ? Check : Edit"
                  @click="toggleEditMode"
                  class="action-btn"
                >
                  {{ isEditing ? 'Save' : 'Edit' }}
                </el-button>
                
                <!-- 取消编辑按钮：仅在编辑模式下显示 -->
                <el-button
                  v-if="isEditing"
                  size="small"
                  :icon="Close"
                  @click="cancelEdit"
                  class="action-btn"
                >
                  Cancel
                </el-button>
                
                <!-- 复制按钮：复制内容到剪贴板 -->
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

          <!-- 卡片主体内容 -->
          <div class="result-body">
            <!-- 空状态：无内容且非生成状态时显示 -->
            <div v-if="!sessionStore.activePrompt && !sessionStore.isGenerating" class="empty-state">
              <div class="empty-icon"><el-icon><MagicStick /></el-icon></div>
              <h3 class="empty-title">将您的设计转化为开发蓝图</h3>
              <p class="empty-desc">上传您的 UI 设计稿，配置生成参数，然后点击"生成蓝图"，即可获得一份为前端开发量身定制的、详尽的实现指南。</p>
              <!-- 操作步骤指引 -->
              <div class="empty-steps">
                <div class="step-item"><div class="step-number">1</div><span>上传设计</span></div>
                <div class="step-item"><div class="step-number">2</div><span>配置设置</span></div>
                <div class="step-item"><div class="step-number">3</div><span>生成蓝图</span></div>
              </div>
            </div>

            <!-- 初始加载状态：首次生成时的加载动画 -->
            <div v-else-if="sessionStore.isGenerating && !sessionStore.activePrompt" class="loading-container">
              <div class="loading-spinner"><el-icon class="is-loading"><Loading /></el-icon></div>
              <p class="loading-text">正在生成开发蓝图...</p>
              <div class="loading-progress"><div class="progress-bar"></div></div>
            </div>

            <!-- 结果内容容器：显示生成的内容或编辑界面 -->
            <div class="result-content" ref="promptContainerRef" v-show="sessionStore.activePrompt || sessionStore.isGenerating">
              <!-- 编辑模式：提供文本编辑功能 -->
              <div v-if="isEditing" class="edit-mode">
                <el-input
                  v-model="editingContent"
                  type="textarea"
                  placeholder="在此处编辑您的蓝图内容..."
                  class="edit-textarea"
                  ref="editTextareaRef"
                  resize="none"
                />
                <!-- 编辑提示信息 -->
                <div class="edit-tips">
                  <el-icon><InfoFilled /></el-icon>
                  <span>支持 Markdown 格式。您的更改将在保存后生效。</span>
                </div>
              </div>
              
              <!-- 预览模式：以 HTML 格式展示 Markdown 内容 -->
              <div v-else class="preview-mode" v-html="formattedPrompt"></div>

              <!-- 流式生成指示器：在内容生成过程中显示 -->
              <div v-if="sessionStore.isGenerating && sessionStore.activePrompt" class="streaming-indicator">
                 <el-icon class="is-loading streaming-icon"><Loading /></el-icon>
                <span class="streaming-text">正在生成...</span>
              </div>

              <!-- 蓝图质量校验结果：显示内容质量分析和建议 -->
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
// ===== 依赖导入 =====
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

// ===== 工具函数 =====
/**
 * 防抖函数 - 延迟执行频繁触发的函数
 */
function debounce(fn, delay) {
  let timeoutID = null;
  return function(...args) {
    clearTimeout(timeoutID);
    timeoutID = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// ===== 组件属性和事件 =====
const props = defineProps({
  promptVersions: {
    type: Array,
    default: () => []
  },
});

const emit = defineEmits(['open-chat-dialog', 'open-history-dialog']);

// ===== 状态管理 =====
const sessionStore = useSessionStore(); // 会话状态管理
const validationStore = usePromptValidationStore(); // 提示词校验状态管理

// ===== 响应式状态 =====
const copied = ref(false); // 复制状态标识
const isEditing = ref(false); // 编辑模式标识
const editingContent = ref(''); // 编辑中的内容

// ===== 模板引用 =====
const promptContainerRef = ref(null); // 提示词容器引用
const editTextareaRef = ref(null); // 编辑文本框引用

// ===== 计算属性 =====
/**
 * 格式化后的提示词内容 - 将 Markdown 转换为 HTML
 */
const formattedPrompt = computed(() => {
  if (!sessionStore.activePrompt) return '';
  return marked(sessionStore.activePrompt);
});

// ===== 监听器 =====
/**
 * 防抖校验函数 - 延迟1.5秒执行校验，避免频繁校验
 */
const debouncedValidate = debounce(() => {
  validationStore.validatePrompt(editingContent.value);
}, 1500);

/**
 * 监听编辑内容变化 - 在编辑模式下自动校验内容
 */
watch(editingContent, (newValue) => {
  if (isEditing.value && newValue) {
    debouncedValidate();
  }
});

/**
 * 监听活跃提示词变化 - 在流式生成时自动滚动到底部
 */
watch(() => sessionStore.activePrompt, (newVal, oldVal) => {
  nextTick(() => {
    const container = promptContainerRef.value?.querySelector('.preview-mode');
    if (container && sessionStore.isGenerating) {
        // 检查是否接近底部，如果是则自动滚动
        const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
        if (isNearBottom) {
            container.scrollTop = container.scrollHeight;
        }
    }
  });
});

// ===== 生命周期钩子 =====
/**
 * 初始化 Markdown 解析器配置
 */
onMounted(() => {
  marked.setOptions({
    highlight: function(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'language-',
    gfm: true, // 启用 GitHub 风格 Markdown
    breaks: true, // 启用换行符转换
  });
});

// ===== 方法定义 =====
/**
 * 复制提示词内容到剪贴板
 */
async function copyPrompt() {
  if (!sessionStore.activePrompt) return;
  try {
    await navigator.clipboard.writeText(sessionStore.activePrompt);
    copied.value = true;
    ElMessage.success('Copied to clipboard');
    // 2秒后重置复制状态
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (error) {
    ElMessage.error('Failed to copy');
  }
}

/**
 * 切换编辑模式
 */
function toggleEditMode() {
  if (isEditing.value) {
    saveEditedContent();
  } else {
    enterEditMode();
  }
}

/**
 * 进入编辑模式
 */
function enterEditMode() {
  isEditing.value = true;
  editingContent.value = sessionStore.activePrompt;
  nextTick(() => {
    editTextareaRef.value?.focus();
  });
}

/**
 * 保存编辑的内容
 */
function saveEditedContent() {
  if (editingContent.value.trim() === '') {
    ElMessage.warning('Content cannot be empty');
    return;
  }
  
  // 直接更新状态管理中的活跃提示词
  sessionStore.activePrompt = editingContent.value;
  // 将编辑版本添加到历史记录
  sessionStore._addPromptVersion('edited');
  isEditing.value = false;
  ElMessage.success('Content saved');
  // 保存后触发校验
  validationStore.validatePrompt(sessionStore.activePrompt);
}

/**
 * 取消编辑
 */
function cancelEdit() {
  isEditing.value = false;
  editingContent.value = '';
  ElMessage.info('Edit cancelled');
  // 取消编辑后重新校验原始内容
  if (sessionStore.activePrompt) {
    validationStore.validatePrompt(sessionStore.activePrompt);
  }
}
</script>

<style scoped>
/* ===== 布局样式 ===== */
.main-row {
  margin: 0 !important; /* 移除默认边距 */
}

.left-column {
  padding-right: 12px !important; /* 右侧内边距 */
}

.right-column {
  padding-left: 12px !important; /* 左侧内边距 */
}
.result-card :deep(.el-card__body) {
  padding: 0 !important; /* 移除卡片默认内边距 */
}
.result-body {
  padding: 24px; /* 卡片主体内边距 */
}

/* ===== 头部样式 ===== */
.result-header {
  display: flex; 
  justify-content: space-between; 
  align-items: center; /* 头部布局：左右分布，垂直居中 */
}
.header-title {
  display: flex; 
  align-items: center; 
  gap: 12px; 
  font-size: 18px; 
  font-weight: 600;
  color: var(--color-primary); 
  text-shadow: var(--text-shadow-primary); /* 标题样式：图标+文字，主色调 */
}
.header-actions {
  display: flex; 
  gap: 8px; /* 操作按钮组：水平排列 */
}
.header-actions .el-button .el-icon { 
  margin-right: 4px; /* 按钮图标右边距 */
}

/* ===== 内容区域样式 ===== */
.result-content {
  background: var(--color-bg-medium);
  border: 1px solid var(--color-bg-light);
  border-radius: var(--border-radius);
  max-height: 80vh; /* 限制最大高度，内容可滚动 */
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 600px; /* 为编辑和预览模式提供充足的最小高度 */
}

.preview-mode {
  flex: 1;
  overflow-y: auto; /* 内容滚动区域 */
  padding: var(--spacing-xl);
  font-family: var(--font-family);
  line-height: 1.7;
  min-height: 300px;
}

/* ===== Markdown 内容样式 ===== */
.preview-mode :deep(h1), .preview-mode :deep(h2), .preview-mode :deep(h3) {
  color: var(--color-text-primary);
  font-weight: 700;
  margin: 24px 0 16px 0;
  line-height: 1.3;
  border-bottom: 1px solid var(--color-bg-light);
  padding-bottom: 8px; /* 标题样式：粗体、下边框、适当间距 */
}
.preview-mode :deep(h2) { 
  color: var(--color-primary); /* 二级标题使用主色调 */
}
.preview-mode :deep(p) { 
  color: var(--color-text-secondary); 
  margin: 16px 0; 
  font-size: 15px; 
  font-weight: 500; /* 段落样式：适中字体大小和粗细 */
}
.preview-mode :deep(pre) { 
  padding: 0; 
  margin: 20px 0; 
  background-color: transparent !important; /* 代码块容器：透明背景 */
}
.preview-mode :deep(pre code.hljs) {
  background: #F1F5F9; /* 代码块浅色背景 */
  color: var(--color-text-primary);
  padding: 20px;
  border-radius: var(--border-radius);
  overflow-x: auto;
  border: 1px solid var(--color-bg-light); /* 代码块样式：浅色背景、圆角、边框 */
}
.preview-mode :deep(code:not(.hljs)) {
  background: var(--color-bg-light);
  color: var(--color-primary);
  padding: .2em .4em;
  border-radius: 4px;
  font-family: var(--font-family-mono);
  font-size: 0.9em;
  font-weight: 600; /* 行内代码样式：主色调、等宽字体 */
}

/* ===== 加载和空状态样式 ===== */
.loading-container, .empty-state {
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center;
  padding: 80px 20px; 
  flex-grow: 1; 
  text-align: center; /* 居中布局：垂直排列、居中对齐 */
}
.loading-spinner .el-icon { 
  font-size: 48px; 
  color: var(--color-primary); /* 加载图标：大尺寸、主色调 */
}
.loading-text { 
  font-size: 18px; 
  font-weight: 500; 
  color: var(--color-text-secondary); 
  margin: 24px 0; /* 加载文字：中等大小、适当间距 */
}
.loading-progress { 
  width: 200px; 
  height: 4px; 
  background: var(--color-bg-light); 
  border-radius: 2px; 
  overflow: hidden; /* 进度条容器：固定宽度、圆角 */
}
.progress-bar { 
  height: 100%; 
  background: var(--color-primary); 
  border-radius: 2px; 
  animation: progress 2s ease-in-out infinite; /* 进度条动画：无限循环 */
}
@keyframes progress { 
  0% { width: 0%; } 
  50% { width: 70%; } 
  100% { width: 100%; } /* 进度条动画关键帧 */
}

/* ===== 空状态样式 ===== */
.empty-icon {
  width: 80px; height: 80px; border-radius: 50%;
  background: rgba(var(--color-primary-rgb), 0.08);
  border: 1px solid rgba(var(--color-primary-rgb), 0.15);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 24px; /* 空状态图标：圆形背景、主色调边框 */
}
.empty-icon .el-icon { font-size: 36px; color: var(--color-primary); }
.empty-title { font-size: 20px; font-weight: 600; color: var(--color-text-primary); margin: 0 0 12px 0; }
.empty-desc { font-size: 15px; color: var(--color-text-secondary); max-width: 450px; margin: 0 auto 32px auto; line-height: 1.7; }
.empty-steps { display: flex; gap: 24px; justify-content: center; }
.step-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.step-number { width: 32px; height: 32px; border-radius: 50%; background: var(--color-primary); color: var(--color-bg-dark); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; }
.step-item span { font-size: 12px; color: var(--color-text-secondary); }

/* ===== 流式生成、编辑模式、校验结果样式 ===== */
.streaming-indicator {
  padding: 12px;
  text-align: center;
  flex-shrink: 0; /* 防止收缩 */
  display: flex; align-items: center; justify-content: center; gap: 8px;
  color: var(--color-primary); font-size: 14px;
}
.streaming-icon { font-size: 16px; }

.edit-mode {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  min-height: 0; /* 编辑模式：弹性布局、垂直排列 */
}
.edit-textarea {
  flex-grow: 1;
  display: flex;
  flex-direction: column; /* 编辑文本框：占满剩余空间 */
}
.edit-textarea :deep(.el-textarea__inner) {
  flex-grow: 1;
  font-family: var(--font-family-mono); font-size: 14px; line-height: 1.6;
  border-radius: var(--border-radius); border: 1px solid var(--color-bg-light);
  resize: none; /* 禁用原生调整大小，依赖弹性布局 */
}
.edit-tips {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 8px; padding: 12px; margin-top: 12px;
  background: rgba(var(--color-primary-rgb), 0.08);
  border: 1px solid rgba(var(--color-primary-rgb), 0.15);
  border-radius: var(--border-radius); color: var(--color-primary); font-size: 13px; /* 编辑提示：浅色背景、主色调边框 */
}

.validation-results {
  flex-shrink: 0;
  margin: 16px;
  padding: 20px;
  background: rgba(var(--color-accent-rgb), 0.08);
  border: 1px solid rgba(var(--color-accent-rgb), 0.2);
  border-radius: var(--border-radius); /* 校验结果：移除高度限制以显示完整内容 */
}
.validation-results .el-divider { background-color: transparent; }
.validation-results .el-divider__text { font-weight: 600; color: var(--color-accent); }
.validation-results .el-divider .el-icon { color: var(--color-accent); margin-right: 8px; }
.validation-content-validation { 
  color: var(--color-text-primary); 
  font-weight: 500;
  line-height: 1.6; /* 校验内容：适中字体粗细和行高 */
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
  font-weight: 600; /* 校验提示：强调色、居中对齐、粗体 */
}

/* ===== 响应式样式 ===== */
@media screen and (max-width: 768px) {
  .main-row { flex-direction: column; } /* 移动端：垂直布局 */
  .left-column, .right-column { padding: 0 !important; margin-bottom: 16px; }
  .right-column { margin-bottom: 0; }
  .result-header { flex-direction: column; gap: 12px; align-items: flex-start; } /* 头部：垂直排列 */
  .header-actions { width: 100%; justify-content: flex-start; flex-wrap: wrap; } /* 按钮组：换行显示 */
  .result-content { min-height: 450px; } /* 移动端内容区域：适当的最小高度 */
}
</style>
