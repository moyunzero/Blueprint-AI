<template>
  <div class="chat-input-area">
    <div class="chat-controls">
      <div class="attachment-buttons">
        <el-tooltip content="上传图片 (用于UI分析)" placement="top" :open-delay="200">
          <el-upload
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleChatFileChange"
            class="chat-image-uploader"
            accept="image/*"
            v-if="!chatImagePreview"
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

        <el-tooltip content="上传文档 (提供额外上下文，如PRD、业务规范等)" placement="top" :open-delay="200">
          <el-upload
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleChatDocumentChange"
            class="chat-document-uploader"
            accept=".txt,.md"
            v-if="!chatDocumentFile"
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

        <el-tooltip content="上传API文档 (提供精确接口、数据结构)" placement="top" :open-delay="200">
          <el-upload
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleChatApiDocChange"
            class="chat-api-doc-uploader"
            accept=".json"
            v-if="!chatApiDocFile"
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

      <div v-if="chatImagePreview" class="chat-image-upload-preview-item">
        <img :src="chatImagePreview" alt="Image to send" />
        <el-button text :icon="Close" @click="removeChatImage"></el-button>
      </div>
      <div v-if="chatDocumentName" class="chat-document-indicator-item">
        <el-icon><Document /></el-icon>
        <el-tooltip :content="chatDocumentName" placement="top" :open-delay="200">
          <span>{{ chatDocumentName }}</span>
        </el-tooltip>
        <el-button text :icon="Close" @click="removeChatDocument"></el-button>
      </div>
      <div v-if="chatApiDocName" class="chat-api-doc-indicator-item">
        <el-icon><DocumentChecked /></el-icon>
        <el-tooltip :content="chatApiDocName" placement="top" :open-delay="200">
          <span>{{ chatApiDocName }}</span>
        </el-tooltip>
        <el-button text :icon="Close" @click="removeChatApiDoc"></el-button>
      </div>

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
import { ref, computed, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Picture, Document, DocumentChecked, Setting, Close } from '@element-plus/icons-vue';
import { convertFileToBase64 } from '@/utils/fileUtils.js';

// defineProps is a compiler macro, no need to import
const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  isWaitingForContinuation: {
    type: Boolean,
    default: false,
  },
});

// defineEmits is a compiler macro, no need to import
const emit = defineEmits(['send-message', 'open-dev-solution-dialog']);

// Reactive state
const userInput = ref('');
const chatImageFile = ref(null);
const chatImagePreview = ref('');
const chatDocumentFile = ref(null);
const chatDocumentName = ref('');
const chatApiDocFile = ref(null);
const chatApiDocName = ref('');

// Template refs
const userInputRef = ref(null);
const chatImageUploaderRef = ref(null);
const chatDocumentUploaderRef = ref(null);
const chatApiDocUploaderRef = ref(null);

// Computed property
const sendButtonDisabled = computed(() => {
  const isContinueCommand = userInput.value.trim().toLowerCase() === '继续' || userInput.value.trim().toLowerCase() === 'continue';
  if (props.loading) return true;
  return !userInput.value.trim() && !chatImageFile.value && !chatDocumentFile.value && !chatApiDocFile.value && !(isContinueCommand && props.isWaitingForContinuation);
});

// Methods
function focusInput() {
  nextTick(() => {
    if (userInputRef.value) {
      userInputRef.value.focus();
    }
  });
}

function handleSendMessage() {
  if (sendButtonDisabled.value) return;

  emit('send-message', {
    content: userInput.value,
    imageFile: chatImageFile.value,
    documentFile: chatDocumentFile.value,
    apiDocFile: chatApiDocFile.value,
  });

  // Reset inputs after sending
  userInput.value = '';
  removeChatImage();
  removeChatDocument();
  removeChatApiDoc();
}

async function handleChatFileChange(file) {
  const isImage = file.raw.type.startsWith('image/');
  if (!isImage) {
    ElMessage.error('只能上传图片文件!');
    if (chatImageUploaderRef.value) chatImageUploaderRef.value.clearFiles();
    return;
  }
  const isLt5M = file.size / 1024 / 1024 < 5;
  if (!isLt5M) {
    ElMessage.error('上传图片大小不能超过 5MB!');
    if (chatImageUploaderRef.value) chatImageUploaderRef.value.clearFiles();
    return;
  }
  chatImageFile.value = file;
  try {
    chatImagePreview.value = await convertFileToBase64(file.raw);
  } catch (e) {
    ElMessage.error('图片预览失败!');
    removeChatImage();
  }
}

function handleChatDocumentChange(file) {
  const allowedTypes = ['text/plain', 'text/markdown'];
  const fileExtension = file.name.split('.').pop().toLowerCase();
  const isAllowed = allowedTypes.includes(file.raw.type) || ['txt', 'md'].includes(fileExtension);
  if (!isAllowed) {
    ElMessage.error('只能上传 .txt 或 .md 文件!');
    if (chatDocumentUploaderRef.value) chatDocumentUploaderRef.value.clearFiles();
    return;
  }
  const isLt5M = file.size / 1024 / 1024 < 5;
  if (!isLt5M) {
    ElMessage.error('上传文件大小不能超过 5MB!');
    if (chatDocumentUploaderRef.value) chatDocumentUploaderRef.value.clearFiles();
    return;
  }
  chatDocumentFile.value = file;
  chatDocumentName.value = file.name;
}

async function handleChatApiDocChange(file) {
  const allowedTypes = ['application/json'];
  const fileExtension = file.name.split('.').pop().toLowerCase();
  const isAllowed = allowedTypes.includes(file.raw.type) || ['json'].includes(fileExtension);

  if (!isAllowed) {
    ElMessage.error('只能上传 .json 文件!');
    if (chatApiDocUploaderRef.value) chatApiDocUploaderRef.value.clearFiles();
    return;
  }
  const isLt5M = file.size / 1024 / 1024 < 5;
  if (!isLt5M) {
    ElMessage.error('上传文件大小不能超过 5MB!');
    if (chatApiDocUploaderRef.value) chatApiDocUploaderRef.value.clearFiles();
    return;
  }
  chatApiDocFile.value = file;
  chatApiDocName.value = file.name;
}

function removeChatImage() {
  chatImageFile.value = null;
  chatImagePreview.value = '';
  if (chatImageUploaderRef.value) chatImageUploaderRef.value.clearFiles();
}

function removeChatDocument() {
  chatDocumentFile.value = null;
  chatDocumentName.value = '';
  if (chatDocumentUploaderRef.value) chatDocumentUploaderRef.value.clearFiles();
}

function removeChatApiDoc() {
  chatApiDocFile.value = null;
  chatApiDocName.value = '';
  if (chatApiDocUploaderRef.value) chatApiDocUploaderRef.value.clearFiles();
}

// Expose methods to the parent component using defineExpose
defineExpose({
  focusInput
});
</script>

<style scoped>
.chat-input-area {
  padding: 10px 20px 20px;
  border-top: 1px solid #ebeef5;
  background-color: #fcfcfc;
}

.chat-controls {
  display: flex;
  align-items: flex-start; /* Align items to the top for better textarea alignment */
  width: 100%;
  position: relative;
  gap: 8px;
}

.attachment-buttons {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  padding-top: 5px; /* Add some padding to align with textarea */
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

.chat-textarea {
  flex-grow: 1;
}

/* In Vue 3 / Element Plus, we target the wrapper */
.chat-textarea :deep(.el-textarea__inner) {
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.5;
  min-height: 80px !important; /* Adjust height for rows=3 */
  max-height: 120px;
  overflow-y: auto;
}

.chat-image-uploader,
.chat-document-uploader,
.chat-api-doc-uploader {
  display: inline-block;
  flex-shrink: 0;
}

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

.chat-controls .send-button {
  flex-shrink: 0;
  margin-top: 5px;
  height: 70px; /* Align with textarea */
}
</style>
