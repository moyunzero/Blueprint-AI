<template>
  <!-- 聊天输入区域组件 - 支持多种类型的消息输入和文件上传 -->
  <div class="chat-input-area">
    <div class="chat-controls">
      <!-- 附件上传按钮组 -->
      <div class="attachment-buttons">
        <!-- 图片上传：用于UI界面分析 -->
        <el-tooltip content="上传图片 (用于UI分析)" placement="top" :open-delay="200" v-if="!chatImagePreview">
          <el-upload
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleChatFileChange"
            class="chat-image-uploader"
            accept="image/*"
            ref="chatImageUploaderRef"
          >
            <el-button
              size="small"
              :icon="Picture"
              :disabled="props.loading"
              circle
            ></el-button>
          </el-upload>
        </el-tooltip>

        <!-- 文档上传：提供额外上下文信息 -->
        <el-tooltip content="上传文档 (提供额外上下文，如PRD、业务规范等)" placement="top" :open-delay="200" v-if="!chatDocumentFile">
          <el-upload
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleChatDocumentChange"
            class="chat-document-uploader"
            accept=".txt,.md"
            ref="chatDocumentUploaderRef"
          >
            <el-button
              size="small"
              :icon="Document"
              :disabled="props.loading"
              circle
            ></el-button>
          </el-upload>
        </el-tooltip>

        <!-- API文档上传：提供精确的接口和数据结构 -->
        <el-tooltip content="上传API文档 (提供精确接口、数据结构)" placement="top" :open-delay="200" v-if="!chatApiDocFile">
          <el-upload
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleChatApiDocChange"
            class="chat-api-doc-uploader"
            accept=".json"
            ref="chatApiDocUploaderRef"
          >
            <el-button
              size="small"
              :icon="DocumentChecked"
              :disabled="props.loading"
              circle
            ></el-button>
          </el-upload>
        </el-tooltip>

        <!-- 技术方案按钮：打开详细技术方案输入对话框 -->
        <el-tooltip content="添加技术方案 (细化实现细节，如组件名、字段、交互逻辑)" placement="top" :open-delay="200">
          <el-button
            size="small"
            :icon="Setting"
            @click="emit('open-dev-solution-dialog')"
            :disabled="props.loading"
            circle
          ></el-button>
        </el-tooltip>
      </div>

      <!-- 已上传文件的预览和指示器 -->
      <!-- 图片预览 -->
      <div v-if="chatImagePreview" class="chat-image-upload-preview-item">
        <img :src="chatImagePreview" alt="Image to send" />
        <el-button text :icon="Close" @click="removeChatImage"></el-button>
      </div>
      
      <!-- 文档指示器 -->
      <div v-if="chatDocumentName" class="chat-document-indicator-item">
        <el-icon><Document /></el-icon>
        <el-tooltip :content="chatDocumentName" placement="top" :open-delay="200">
          <span>{{ chatDocumentName }}</span>
        </el-tooltip>
        <el-button text :icon="Close" @click="removeChatDocument"></el-button>
      </div>
      
      <!-- API文档指示器 -->
      <div v-if="chatApiDocName" class="chat-api-doc-indicator-item">
        <el-icon><DocumentChecked /></el-icon>
        <el-tooltip :content="chatApiDocName" placement="top" :open-delay="200">
          <span>{{ chatApiDocName }}</span>
        </el-tooltip>
        <el-button text :icon="Close" @click="removeChatApiDoc"></el-button>
      </div>

      <!-- 文本输入框：支持多行输入和快捷键发送 -->
      <el-input
        v-model="userInput"
        type="textarea"
        :rows="3"
        placeholder="输入您的优化建议 (Ctrl+Enter 发送)..."
        :disabled="props.loading"
        @keydown.ctrl.enter="handleSendMessage"
        class="chat-textarea"
        ref="userInputRef"
        resize="none"
      ></el-input>
      
      <!-- 发送按钮 -->
      <el-button
        type="primary"
        @click="handleSendMessage"
        :loading="props.loading"
        :disabled="sendButtonDisabled"
        class="send-button"
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<script setup>
/**
 * 聊天输入区域组件 - 支持多种类型的消息输入和文件上传
 * 
 * 主要功能：
 * - 提供多种类型的消息输入（文本、图片、文档、API文档）
 * - 支持文件上传和预览功能
 * - 处理用户输入验证和格式化
 * - 提供快捷键支持（Ctrl+Enter发送）
 * - 管理附件的添加和移除
 */

import { ref, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Picture, Document, DocumentChecked, Setting, Close } from '@element-plus/icons-vue'

// 工具函数
import { convertFileToBase64 } from '@/utils/fileUtils.js'

// ===== 组件属性和事件 =====
const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  isWaitingForContinuation: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['send-message', 'open-dev-solution-dialog'])

// ===== 响应式状态 =====
const userInput = ref('') // 用户输入内容

// 图片上传相关
const chatImageFile = ref(null)
const chatImagePreview = ref('')

// 文档上传相关
const chatDocumentFile = ref(null)
const chatDocumentName = ref('')

// API文档上传相关
const chatApiDocFile = ref(null)
const chatApiDocName = ref('')

// ===== 组件引用 =====
const userInputRef = ref(null)
const chatImageUploaderRef = ref(null)
const chatDocumentUploaderRef = ref(null)
const chatApiDocUploaderRef = ref(null)

// ===== 计算属性 =====
/**
 * 发送按钮是否禁用 - 根据加载状态、输入内容和附件情况判断
 */
const sendButtonDisabled = computed(() => {
  const isContinueCommand = userInput.value.trim().toLowerCase() === '继续' || 
                           userInput.value.trim().toLowerCase() === 'continue'
  
  if (props.loading) return true
  
  return !userInput.value.trim() && 
         !chatImageFile.value && 
         !chatDocumentFile.value && 
         !chatApiDocFile.value && 
         !(isContinueCommand && props.isWaitingForContinuation)
})

// ===== 方法定义 =====

/**
 * 聚焦到输入框
 * 用于对话框打开时自动聚焦
 */
function focusInput() {
  nextTick(() => {
    if (userInputRef.value) {
      userInputRef.value.focus()
    }
  })
}

/**
 * 处理发送消息事件
 * 验证输入并发送消息，然后重置输入状态
 */
function handleSendMessage() {
  if (sendButtonDisabled.value) return

  emit('send-message', {
    content: userInput.value,
    imageFile: chatImageFile.value,
    documentFile: chatDocumentFile.value,
    apiDocFile: chatApiDocFile.value
  })

  // 发送后重置输入状态
  userInput.value = ''
  removeChatImage()
  removeChatDocument()
  removeChatApiDoc()
}

/**
 * 处理图片文件上传
 * @param {Object} file - 上传的文件对象
 */
async function handleChatFileChange(file) {
  const isImage = file.raw.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    if (chatImageUploaderRef.value) chatImageUploaderRef.value.clearFiles()
    return
  }
  
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('上传图片大小不能超过 5MB!')
    if (chatImageUploaderRef.value) chatImageUploaderRef.value.clearFiles()
    return
  }
  
  chatImageFile.value = file
  try {
    chatImagePreview.value = await convertFileToBase64(file.raw)
  } catch (error) {
    ElMessage.error('图片预览失败!')
    removeChatImage()
  }
}

/**
 * 处理文档文件上传
 * @param {Object} file - 上传的文件对象
 */
function handleChatDocumentChange(file) {
  const allowedTypes = ['text/plain', 'text/markdown']
  const fileExtension = file.name.split('.').pop().toLowerCase()
  const isAllowed = allowedTypes.includes(file.raw.type) || ['txt', 'md'].includes(fileExtension)
  
  if (!isAllowed) {
    ElMessage.error('只能上传 .txt 或 .md 文件!')
    if (chatDocumentUploaderRef.value) chatDocumentUploaderRef.value.clearFiles()
    return
  }
  
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('上传文件大小不能超过 5MB!')
    if (chatDocumentUploaderRef.value) chatDocumentUploaderRef.value.clearFiles()
    return
  }
  
  chatDocumentFile.value = file
  chatDocumentName.value = file.name
}

/**
 * 处理API文档文件上传
 * @param {Object} file - 上传的文件对象
 */
async function handleChatApiDocChange(file) {
  const allowedTypes = ['application/json']
  const fileExtension = file.name.split('.').pop().toLowerCase()
  const isAllowed = allowedTypes.includes(file.raw.type) || ['json'].includes(fileExtension)

  if (!isAllowed) {
    ElMessage.error('只能上传 .json 文件!')
    if (chatApiDocUploaderRef.value) chatApiDocUploaderRef.value.clearFiles()
    return
  }
  
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('上传文件大小不能超过 5MB!')
    if (chatApiDocUploaderRef.value) chatApiDocUploaderRef.value.clearFiles()
    return
  }
  
  chatApiDocFile.value = file
  chatApiDocName.value = file.name
}

/**
 * 移除已上传的图片
 * 清除图片文件和预览状态
 */
function removeChatImage() {
  chatImageFile.value = null
  chatImagePreview.value = ''
  if (chatImageUploaderRef.value) chatImageUploaderRef.value.clearFiles()
}

/**
 * 移除已上传的文档
 * 清除文档文件和名称状态
 */
function removeChatDocument() {
  chatDocumentFile.value = null
  chatDocumentName.value = ''
  if (chatDocumentUploaderRef.value) chatDocumentUploaderRef.value.clearFiles()
}

/**
 * 移除已上传的API文档
 * 清除API文档文件和名称状态
 */
function removeChatApiDoc() {
  chatApiDocFile.value = null
  chatApiDocName.value = ''
  if (chatApiDocUploaderRef.value) chatApiDocUploaderRef.value.clearFiles()
}

/**
 * 向父组件暴露方法
 * 允许父组件调用子组件的特定方法
 */
defineExpose({
  focusInput
})
</script>

<style scoped>
/* ===== 输入区域主容器 ===== */
.chat-input-area {
  padding: 10px 20px 20px;
  border-top: 1px solid #ebeef5;
  background-color: #fcfcfc;
}

.chat-controls {
  display: flex;
  align-items: flex-start;
  width: 100%;
  position: relative;
  gap: 8px;
}

/* ===== 附件按钮组样式 ===== */
.attachment-buttons {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  padding-top: 5px; /* 与文本框对齐 */
}

.attachment-buttons .el-button.is-circle {
  min-width: 36px;
  height: 36px;
  padding: 0;
  font-size: 16px;
  color: #606266;
  border: 1px solid #dcdfe6;
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}

.attachment-buttons .el-button.is-circle:hover {
  border-color: #409EFF;
  color: #409EFF;
  background-color: #f2f7ff;
}

/* ===== 文本输入框样式 ===== */
.chat-textarea {
  flex-grow: 1;
}

.chat-textarea :deep(.el-textarea__inner) {
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.5;
  min-height: 80px !important; /* 3行高度 */
  max-height: 120px;
  overflow-y: auto;
}

/* ===== 上传组件样式 ===== */
.chat-image-uploader,
.chat-document-uploader,
.chat-api-doc-uploader {
  display: inline-block;
  flex-shrink: 0;
}

/* ===== 文件预览和指示器样式 ===== */
.chat-image-upload-preview-item,
.chat-document-indicator-item,
.chat-api-doc-indicator-item {
  display: flex;
  align-items: center;
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
  line-height: 1.2;
  margin-top: 5px;
}

/* 图片预览样式 */
.chat-image-upload-preview-item img {
    max-width: 40px !important;
    max-height: 40px !important;
    border-radius: 3px;
    margin-right: 5px;
}
.chat-image-upload-preview-item .el-button {
    padding: 0;
    margin-left: 0;
    font-size: 16px;
    color: #909399;
}
.chat-image-upload-preview-item .el-button:hover {
    color: #F56C6C;
}

/* 文档指示器样式 */
.chat-document-indicator-item .el-icon,
.chat-api-doc-indicator-item .el-icon {
    margin-right: 4px;
}
.chat-document-indicator-item span,
.chat-api-doc-indicator-item span {
    font-size: 0.9em;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.chat-document-indicator-item .el-button,
.chat-api-doc-indicator-item .el-button {
    padding: 0;
    margin-left: 5px;
    font-size: 16px;
    color: #909399;
}
.chat-document-indicator-item .el-button:hover,
.chat-api-doc-indicator-item .el-button:hover {
    color: #F56C6C;
}

/* ===== 发送按钮样式 ===== */
.chat-controls .send-button {
  flex-shrink: 0;
  margin-top: 5px;
  height: 70px; /* 与文本框高度对齐 */
}
</style>
