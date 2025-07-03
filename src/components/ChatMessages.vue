<template>
  <!-- 聊天消息显示组件 - 渲染聊天历史和各种消息类型 -->
  <div class="chat-messages" ref="chatMessagesContainerRef">
    <!-- 消息列表：遍历聊天历史 -->
    <div v-for="message in props.chatHistory" :key="message.id"
          :class="['message', message.role === 'user' ? 'user-message' : 'assistant-message']">
      <div class="message-content">
        <!-- AI助手消息处理 -->
        <div v-if="message.role === 'assistant'">
          <!-- 问答类型消息 -->
          <div v-if="message.type === 'answer'">
            <p><strong>AI 回复：</strong></p>
            <div v-html="formatMessage(message.content)"></div>
          </div>

          <!-- 提示词更新、继续生成、初始响应类型消息 -->
          <div v-else-if="['prompt-update', 'continuation', 'initial-response'].includes(message.type)">
            <!-- 文本部分：显示非代码块的文本内容 -->
            <div v-if="getTextPart(message.content)" v-html="formatMessage(getTextPart(message.content))"></div>

            <!-- 代码块部分：支持语法高亮和复制功能 -->
            <div v-for="(block, blockIndex) in getCodeBlocks(message.content)" :key="`chat-code-${message.id}-${blockIndex}`" class="code-block-wrapper">
                <el-button
                    text
                    :icon="CopyDocument"
                    size="small"
                    class="copy-code-btn"
                    @click="copyCode(block.content)"
                >
                    Copy Code
                </el-button>
                <pre><code :ref="el => codeBlockRefs[blockIndex] = el" :class="`language-${block.lang}`">{{ block.content }}</code></pre>
            </div>

            <!-- 兜底显示：当没有文本和代码块时显示原始内容 -->
            <div v-if="!getTextPart(message.content) && getCodeBlocks(message.content).length === 0" v-html="formatMessage(message.content)"></div>
          </div>

          <!-- 错误类型消息 -->
          <div v-else-if="message.type === 'error'">
            <p style="color: #f56c6c;"><strong>错误：</strong></p>
            <div v-html="formatMessage(message.content)"></div>
          </div>

          <!-- 其他类型消息的兜底处理 -->
          <div v-else>
            <div v-html="formatMessage(message.content || '')"></div>
          </div>
        </div>

        <!-- 用户消息处理 -->
        <div v-else>
          <!-- 图片预览 -->
          <img v-if="message.imagePreview" :src="message.imagePreview" alt="User uploaded image" class="chat-image-preview" />

          <!-- 文档上传指示器 -->
          <div v-if="message.documentName && message.type === 'document-upload'" class="chat-document-indicator">
            <el-icon><Document /></el-icon> 交互文档: {{ message.documentName }}
          </div>

          <!-- API文档指示器 -->
          <div v-if="message.documentName && message.type === 'api-doc-input'" class="chat-api-doc-indicator">
            <el-icon><DocumentChecked /></el-icon> <strong>API 文档：</strong> {{ message.documentName }}
            <pre><code class="language-json">{{ message.text.substring(0, 200) }}...</code></pre>
          </div>

          <!-- 技术方案指示器 -->
          <div v-if="message.type === 'dev-solution-input'" class="chat-dev-solution-indicator">
            <el-icon><Setting /></el-icon> <strong>技术方案：</strong>
            <div v-html="formatMessage(message.text)"></div>
          </div>

          <!-- 普通文本消息 -->
          <p v-if="message.text && (message.type === 'text' || message.type === 'image-upload' || message.type === 'document-upload')">{{ message.text }}</p>
        </div>
      </div>
    </div>

    <!-- 加载状态指示器：显示AI正在思考 -->
    <div v-if="props.chatLoading && !props.isWaitingForContinuation" class="message assistant-message">
      <div class="message-content">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 聊天消息显示组件 - 渲染聊天历史和各种消息类型
 * 
 * 主要功能：
 * - 渲染聊天历史消息列表
 * - 支持多种消息类型（文本、图片、文档、代码块）
 * - 提供代码高亮和复制功能
 * - 处理Markdown格式渲染
 * - 自动滚动到最新消息
 * - 显示加载状态和输入指示器
 */

import { ref, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, DocumentChecked, Setting, CopyDocument } from '@element-plus/icons-vue'

// 配置导入
import { marked } from '@/config/markdown.js'
import hljs from 'highlight.js'

// ===== 组件属性 =====
const props = defineProps({
  chatHistory: {
    type: Array,
    required: true
  },
  chatLoading: {
    type: Boolean,
    default: false
  },
  isWaitingForContinuation: {
    type: Boolean,
    default: false
  }
})

// ===== 响应式状态 =====
const chatMessagesContainerRef = ref(null)
const codeBlockRefs = ref([])

// ===== 消息处理方法 =====

/**
 * 格式化消息内容
 * 将Markdown格式转换为HTML
 * @param {string} content - 原始消息内容
 * @returns {string} 格式化后的HTML内容
 */
function formatMessage(content) {
  if (!content) return ''
  return marked(content)
}

/**
 * 提取消息中的文本部分
 * 移除代码块，只保留纯文本内容
 * @param {string} messageContent - 完整消息内容
 * @returns {string} 提取的文本部分
 */
function getTextPart(messageContent) {
  if (!messageContent) return ''

  const codeBlockRegex = /```[\w-]*\s*\n([\s\S]*?)\n```/g
  let result = messageContent
  const testMatches = messageContent.match(codeBlockRegex)

  if (testMatches && testMatches.length > 0) {
    result = messageContent.replace(codeBlockRegex, '')
  }

  // 清理多余的换行符
  result = result.replace(/\n{3,}/g, '\n\n')
  return result.trim()
}

/**
 * 提取消息中的代码块
 * 解析代码块的语言类型和内容
 * @param {string} messageContent - 完整消息内容
 * @returns {Array} 代码块数组
 */
function getCodeBlocks(messageContent) {
  if (!messageContent) return []

  const blocks = []
  const regex = /```([\w-]*)\s*\n?([\s\S]*?)\n?```/g
  let match

  while ((match = regex.exec(messageContent)) !== null) {
    const lang = match[1] || 'plaintext'
    const content = match[2]

    if (content && content.trim()) {
      blocks.push({ 
        type: 'code', 
        lang: lang, 
        content: content 
      })
    }
  }

  return blocks
}

/**
 * 复制代码到剪贴板
 * @param {string} codeContent - 要复制的代码内容
 */
async function copyCode(codeContent) {
  try {
    await navigator.clipboard.writeText(codeContent)
    ElMessage.success('代码已复制！')
  } catch (error) {
    ElMessage.error('代码复制失败')
  }
}

/**
 * 滚动到消息列表底部
 * 用于显示最新消息
 */
function scrollToBottom() {
  nextTick(() => {
    const container = chatMessagesContainerRef.value
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  })
}

/**
 * 监听聊天历史变化
 * 当消息更新时自动滚动到底部并重新应用代码高亮
 */
watch(
  () => props.chatHistory,
  () => {
    scrollToBottom()
    
    // 重新应用代码高亮
    nextTick(() => {
      codeBlockRefs.value.forEach(el => {
        if (el) {
          hljs.highlightElement(el)
        }
      })
    })
  },
  { deep: true }
)

/**
 * 向父组件暴露方法
 * 允许父组件调用滚动到底部的功能
 */
defineExpose({
  scrollToBottom
})
</script>

<style scoped>
/* ===== 消息容器样式 ===== */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-xl);
  background-color: var(--color-bg-dark);
}

/* ===== 消息布局样式 ===== */
.message {
  margin-bottom: 15px; 
  display: flex; 
  flex-direction: column;
}
.user-message { 
  align-items: flex-end; /* 用户消息右对齐 */
}
.assistant-message { 
  align-items: flex-start; /* AI消息左对齐 */
}

.message-content {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: var(--border-radius);
  word-break: break-word;
  white-space: pre-wrap;
  line-height: 1.6;
}

.user-message .message-content {
  background-color: var(--color-primary);
  color: #fff;
}

.assistant-message .message-content {
  background-color: var(--color-bg-medium);
  color: var(--color-text-primary);
}

/* ===== 代码块样式 ===== */
.assistant-message .code-block-wrapper {
  position: relative;
  margin-top: 10px;
  margin-bottom: 1em;
  background-color: #282c34; /* 代码块深色背景 */
  border: 1px solid var(--color-text-tertiary);
  border-radius: var(--border-radius);
  overflow: hidden;
}
.assistant-message .code-block-wrapper pre {
  margin: 0;
  padding: 1em;
  overflow-x: auto;
}
.assistant-message .copy-code-btn {
  position: absolute; 
  top: 8px; 
  right: 8px; 
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 4px 8px; 
  border-radius: 4px; 
  font-size: 12px;
  opacity: 0; 
  transition: opacity 0.3s ease;
  color: var(--color-text-secondary);
  border: none;
}
.assistant-message .code-block-wrapper:hover .copy-code-btn { 
  opacity: 1; 
}
.assistant-message .copy-code-btn:hover { 
  background-color: rgba(255, 255, 255, 0.2); 
}

/* ===== Markdown内容样式 ===== */
.message-content :deep(p) { 
  margin: 0 0 10px 0; 
}
.message-content :deep(p:last-child) { 
  margin-bottom: 0; 
}
.message-content :deep(code:not(pre code)) {
  background-color: rgba(0, 0, 0, 0.2);
  color: var(--color-accent);
  padding: 2px 5px; 
  border-radius: 4px;
  font-family: var(--font-family-mono); 
  font-size: 0.9em;
}
.message-content :deep(ul), .message-content :deep(ol) {
  padding-left: 25px; 
  margin: 10px 0;
}
.message-content :deep(li) { 
  margin-bottom: 5px; 
}

/* ===== 加载动画样式 ===== */
.typing-indicator span {
  height: 8px; 
  width: 8px;
  background-color: var(--color-text-secondary);
  border-radius: 50%; 
  display: inline-block; 
  margin: 0 2px;
  animation: bounce 1.5s infinite ease-in-out;
}
.typing-indicator span:nth-child(2) { 
  animation-delay: 0.2s; 
}
.typing-indicator span:nth-child(3) { 
  animation-delay: 0.4s; 
}
@keyframes bounce { 
  0%, 60%, 100% { transform: translateY(0); } 
  30% { transform: translateY(-5px); } 
}

/* ===== 文件指示器样式 ===== */
.chat-image-preview {
  max-width: 150px; 
  max-height: 150px;
  border-radius: 4px; 
  margin-top: 8px; 
  display: block;
  border: 1px solid var(--color-bg-light); 
  cursor: pointer;
}

.chat-document-indicator, .chat-api-doc-indicator {
  display: flex; 
  align-items: center; 
  gap: 6px;
  font-size: 0.9em; 
  color: var(--color-text-secondary);
  margin-top: 8px; 
  padding: 6px 10px;
  background-color: var(--color-bg-light);
  border-radius: 4px;
}

.chat-dev-solution-indicator {
  font-size: 0.95em; 
  color: var(--color-text-secondary);
  margin-top: 8px; 
  padding: 10px 15px;
  background-color: rgba(var(--color-primary-rgb), 0.08);
  border-left: 4px solid var(--color-primary);
  border-radius: 4px; 
  word-break: break-word;
}
.chat-dev-solution-indicator strong, .chat-dev-solution-indicator .el-icon {
  color: var(--color-primary); 
  margin-right: 6px;
}
.chat-dev-solution-indicator :deep(ul), .chat-dev-solution-indicator :deep(ol) {
    padding-left: 20px; 
    margin: 5px 0;
}

.chat-api-doc-indicator {
  font-size: 0.95em; 
  color: var(--color-text-secondary);
  margin-top: 8px; 
  padding: 10px 15px;
  background-color: rgba(var(--color-accent-rgb), 0.08);
  border-left: 4px solid var(--color-accent);
  border-radius: 4px; 
  word-break: break-word;
}
.chat-api-doc-indicator strong, .chat-api-doc-indicator .el-icon {
  color: var(--color-accent); 
  margin-right: 6px;
}
.chat-api-doc-indicator pre {
  margin-top: 8px; 
  font-size: 0.9em;
  background-color: var(--color-bg-dark);
  padding: 8px; 
  border-radius: 4px;
  white-space: pre-wrap; 
  word-break: break-all;
  max-height: 200px; 
  overflow-y: auto;
}
</style>
