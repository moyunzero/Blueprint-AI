<template>
  <div>
    <el-dialog
      title="优化提示词"
      v-model="isDialogVisible"
      width="70%"
      :before-close="handleBeforeClose"
      class="chat-dialog"
      append-to-body
      @opened="onDialogOpened"
    >
      <div class="chat-container">
        <ChatMessages
          ref="chatMessagesRef"
          :chat-history="sessionStore.chatHistory"
          :chat-loading="chatLoading"
          :is-waiting-for-continuation="isWaitingForContinuation"
        />
        <ChatInputArea
          ref="chatInputAreaRef"
          :loading="chatLoading"
          :is-waiting-for-continuation="isWaitingForContinuation"
          @send-message="handleSendMessage"
          @open-dev-solution-dialog="openDevSolutionDialog"
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="requestClose">取消</el-button>
          <el-button type="primary" @click="applyRefinedPrompt" :disabled="chatLoading || !canApplyRefinedPrompt">应用优化后的提示词</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 技术方案输入对话框 -->
    <el-dialog
      title="添加开发技术方案"
      v-model="showDevSolutionInput"
      width="60%"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      append-to-body
      custom-class="dev-solution-dialog"
    >
      <p class="dev-solution-tip">请在此处输入您的技术实现方案、具体的组件名称、字段定义、交互逻辑等。这些信息将用于优化和润色主 Prompt。</p>
      <el-input
        v-model="devSolutionInputContent"
        type="textarea"
        :rows="10"
        class="dev-solution-editor"
        placeholder="例如：
- 表格数据使用 Element Plus 的 ElTable，字段包括 id, name, status。
- 状态字段 status 用 ElTag 显示，status=0 为'待处理'（info），status=1 为'已完成'（success）。
- '新增'按钮点击后打开一个 ElDialog 表单，包含输入框 username 和 password。
- 提交表单调用 POST /api/users/add 接口。"
      />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDevSolutionInput = false">取消</el-button>
          <el-button type="primary" @click="sendDevSolutionWrapper">确认添加并优化 Prompt</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import { MESSAGE_TYPES } from '@/config/constants.js';
import { handleApiError } from '@/utils/errorHandler.js';
import { convertFileToBase64, convertFileToString, processApiDocFile } from '@/utils/fileUtils';
import { refinePromptConversationally } from '@/services/aiService.js';
import { useSessionStore } from '@/stores/sessionStore'; // Import Pinia store

import ChatMessages from './ChatMessages.vue';
import ChatInputArea from './ChatInputArea.vue';

// --- Props and Emits ---
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:visible', 'apply-prompt', 'closed']);

// --- Store and State ---
const sessionStore = useSessionStore();
const chatLoading = ref(false);
const isWaitingForContinuation = ref(false);
const lastAssistantMessageType = ref(null);
const streamingContentBuffer = ref('');
const hasDeterminedTypeForCurrentTurn = ref(false);
const currentAssistantContentType = ref(MESSAGE_TYPES.INITIAL_RESPONSE);
const finalResponseContentForThisTurn = ref('');

const showDevSolutionInput = ref(false);
const devSolutionInputContent = ref('');

// --- Template Refs ---
const chatMessagesRef = ref(null);
const chatInputAreaRef = ref(null);

// --- Computed Properties ---
const isDialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const canApplyRefinedPrompt = computed(() => {
  return !chatLoading.value && sessionStore.activePrompt &&
         (lastAssistantMessageType.value === 'prompt-update' || 
          lastAssistantMessageType.value === 'initial-response' || 
          lastAssistantMessageType.value === 'continuation');
});

// --- Watchers ---
watch(() => props.visible, (newVal) => {
  if (newVal) {
    initializeChat();
  }
});

// --- Methods ---
function initializeChat() {
  // Reset turn-specific state
  isWaitingForContinuation.value = false;
  lastAssistantMessageType.value = null;
  streamingContentBuffer.value = '';
  hasDeterminedTypeForCurrentTurn.value = false;
  currentAssistantContentType.value = MESSAGE_TYPES.INITIAL_RESPONSE;
  finalResponseContentForThisTurn.value = '';
  
  // Close and clear dev solution dialog
  showDevSolutionInput.value = false;
  devSolutionInputContent.value = '';

  // Prepare for chat
  sessionStore.prepareForChat();

  nextTick(() => {
    chatMessagesRef.value?.scrollToBottom();
    chatInputAreaRef.value?.focusInput();
  });
}

function onDialogOpened() {
  initializeChat();
}

function handleBeforeClose(done) {
  if (chatLoading.value) {
    ElMessageBox.confirm('正在生成回复，确定要关闭对话框吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(() => {
      done();
      emit('closed');
    }).catch(() => {});
  } else {
    done();
    emit('closed');
  }
}

function requestClose() {
  handleBeforeClose(() => {
    isDialogVisible.value = false;
  });
}

function handleSendMessage(payload) {
  sendMessage(
    payload.content,
    'text',
    payload.imageFile,
    payload.documentFile,
    payload.apiDocFile
  );
}

function openDevSolutionDialog() {
  devSolutionInputContent.value = '';
  showDevSolutionInput.value = true;
}

function sendDevSolutionWrapper() {
  sendMessage(devSolutionInputContent.value, 'dev-solution');
  showDevSolutionInput.value = false;
}

function applyRefinedPrompt() {
  if (!canApplyRefinedPrompt.value) {
    ElMessage.warning('当前没有可应用的优化Prompt。请等待 AI 返回一个完整的优化Prompt。');
    return;
  }

  const promptToApply = sessionStore.activePrompt;

  if (isWaitingForContinuation.value) {
    ElMessageBox.confirm('当前AI的回复可能还不完整，您确定要应用当前已生成的内容吗？输入"继续"可以让AI完成回复。', '提示', {
      confirmButtonText: '仍要应用',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      finalizeApplyPrompt(promptToApply);
    }).catch(() => {});
    return;
  }
  finalizeApplyPrompt(promptToApply);
}

function finalizeApplyPrompt(promptContent) {
  if (promptContent && !promptContent.startsWith("抱歉，处理您的请求时出现了错误") && !promptContent.startsWith("与 AI 对话时出错")) {
    emit('apply-prompt', promptContent, [...sessionStore.chatHistory]);
    isDialogVisible.value = false;
  } else if (!promptContent) {
    ElMessage.warning('没有可应用的有效提示词。');
  } else {
    ElMessage.error('提示词包含错误，无法应用。请修正或重新生成。');
  }
}

async function sendMessage(inputContent, inputType = 'text', imageFile = null, documentFile = null, apiDocFile = null) {
  const userText = inputContent.trim();
  const isContinueCommand = inputType === 'text' && (userText.toLowerCase() === '继续' || userText.toLowerCase() === 'continue');

  if (chatLoading.value) return;
  if (inputType === 'text' && !userText && !imageFile && !documentFile && !apiDocFile && !isContinueCommand) {
    ElMessage.warning('请输入消息内容或上传文件。');
    return;
  }
  if (isContinueCommand && !isWaitingForContinuation.value) {
    ElMessage.warning('AI 目前不需要继续回复。');
    return;
  }
  if (inputType === 'dev-solution' && !userText) {
    ElMessage.warning('请输入技术方案内容。');
    return;
  }

  chatLoading.value = true;
  let messageForApi = userText;
  let currentImageBase64Data = null;
  let currentDocumentContent = null;
  let currentApiDocSummary = null;
  let uploadedImagePreview = null;
  let uploadedDocName = '';
  let uploadedApiDocName = '';

  try {
    // Process uploaded files
    if (imageFile) {
      currentImageBase64Data = await convertFileToBase64(imageFile.raw);
      uploadedImagePreview = currentImageBase64Data;
    }
    if (documentFile) {
      currentDocumentContent = await convertFileToString(documentFile.raw);
      uploadedDocName = documentFile.name;
    }
    if (apiDocFile) {
      const apiDocParsedData = await processApiDocFile(apiDocFile.raw);
      currentApiDocSummary = apiDocParsedData.content;
      uploadedApiDocName = apiDocFile.name;
    }

    // Prepare message for API
    if (inputType === 'dev-solution') {
      messageForApi = `[DEVELOPER_SOLUTION]: ${userText}`;
    } else if (isContinueCommand) {
      const lastAssistantMessage = sessionStore.activePrompt || '';
      const contextLength = Math.min(800, lastAssistantMessage.length);
      const contextPart = lastAssistantMessage.slice(-contextLength);
      messageForApi = `请继续完成上一条回复的剩余部分。上一条回复的结尾部分是：\n\n${contextPart}\n\n请从断点处直接继续生成未完成的内容，不要重复已有内容，不要重新开始，只需要接续上面的内容继续写下去。`;
    } else {
      let docSection = currentDocumentContent ? `\n\n[来自用户上传的文档 - "${uploadedDocName}"]: \`\`\`\n${currentDocumentContent}\n\`\`\`\n请分析此文档中的交互逻辑，并将其整合到主提示中。` : '';
      let apiDocSection = currentApiDocSummary ? `\n\n[API_DOCUMENT]:\n请根据以下API文档信息，为相关字段补充准确的参数类型、字段名等详细信息：\n\n\`\`\`json\n${currentApiDocSummary}\n\`\`\`\n**字段映射优化指南...**` : '';
      
      messageForApi = `${userText}${docSection}${apiDocSection}`;
    }

    // Add user message to chat history (except for continue commands)
    if (!isContinueCommand) {
      let userMessageEntry = { id: `${Date.now()}-user`, role: 'user', text: userText, type: 'text' };
      if (inputType === 'dev-solution') userMessageEntry.type = 'dev-solution-input';
      if (uploadedImagePreview) {
        userMessageEntry.imagePreview = uploadedImagePreview;
        userMessageEntry.type = 'image-upload';
      }
      if (uploadedDocName) {
        userMessageEntry.documentName = uploadedDocName;
        userMessageEntry.type = 'document-upload';
      }
      if (uploadedApiDocName) {
        userMessageEntry.documentName = uploadedApiDocName;
        userMessageEntry.text = currentApiDocSummary;
        userMessageEntry.type = 'api-doc-input';
      }
      sessionStore.chatHistory.push(userMessageEntry);
    }

    nextTick(() => chatMessagesRef.value?.scrollToBottom());

    // Prepare history for API call
    const historyForApi = sessionStore.chatHistory.map(msg => {
      if (msg.role === 'user') {
        if (msg.type === 'dev-solution-input') {
          return { role: 'user', content: `[DEVELOPER_SOLUTION]: ${msg.text}` };
        } else if (msg.type === 'api-doc-input') {
          return { role: 'user', content: `[API_DOCUMENT]: ${msg.text}` };
        } else if (msg.imagePreview && msg.type === 'image-upload') {
          return { 
            role: 'user', 
            content: [
              { type: 'text', text: msg.text || '' }, 
              { type: 'image_url', image_url: { url: msg.imagePreview } }
            ] 
          };
        } else if (msg.documentName && msg.type === 'document-upload') {
          return { role: 'user', content: msg.text || `[用户上传了文档: ${msg.documentName}]` };
        }
        return { role: 'user', content: msg.text || '' };
      }
      return { role: 'assistant', content: msg.content };
    });

    // --- Streaming Logic ---
    streamingContentBuffer.value = '';
    hasDeterminedTypeForCurrentTurn.value = false;
    currentAssistantContentType.value = MESSAGE_TYPES.INITIAL_RESPONSE;
    finalResponseContentForThisTurn.value = '';

    let assistantMessageIndex = -1;
    if (isContinueCommand && isWaitingForContinuation.value) {
      assistantMessageIndex = sessionStore.chatHistory.findIndex(m => m.role === 'assistant');
      if (assistantMessageIndex !== -1) {
        // Remove continuation hint from UI
        sessionStore.chatHistory[assistantMessageIndex].content = sessionStore.chatHistory[assistantMessageIndex].content.replace(/\n\n\*[^)]*\*$/, '').trim();
      }
    } else {
      sessionStore.chatHistory.push({ id: `${Date.now()}-assistant`, role: 'assistant', content: '', type: 'initial-response' });
      assistantMessageIndex = sessionStore.chatHistory.length - 1;
    }
    
    const stream = await refinePromptConversationally({
      currentFullPrompt: sessionStore.basePromptForChat,
      history: historyForApi,
      userTextMessage: messageForApi,
      imageBase64: currentImageBase64Data,
      temperature: 0.2,
      framework: sessionStore.formSettings.framework,
      componentLibrary: sessionStore.formSettings.componentLibrary,
    });

    // Process streaming response
    for await (const chunk of stream) {
      const contentPart = chunk.choices[0]?.delta?.content || '';
      streamingContentBuffer.value += contentPart;

      let cleanContent = streamingContentBuffer.value;
      if (!hasDeterminedTypeForCurrentTurn.value) {
        if (cleanContent.startsWith('Updated Prompt:')) {
          cleanContent = cleanContent.substring('Updated Prompt:'.length).trimStart();
          currentAssistantContentType.value = 'prompt-update';
          hasDeterminedTypeForCurrentTurn.value = true;
        } else if (cleanContent.startsWith('Answer:')) {
          cleanContent = cleanContent.substring('Answer:'.length).trimStart();
          currentAssistantContentType.value = 'answer';
          hasDeterminedTypeForCurrentTurn.value = true;
        } else if (isContinueCommand) {
          currentAssistantContentType.value = 'continuation';
          hasDeterminedTypeForCurrentTurn.value = true;
        }
      } else {
        if (cleanContent.startsWith('Updated Prompt:')) cleanContent = cleanContent.substring('Updated Prompt:'.length).trimStart();
        if (cleanContent.startsWith('Answer:')) cleanContent = cleanContent.substring('Answer:'.length).trimStart();
      }

      if (isContinueCommand && isWaitingForContinuation.value) {
        finalResponseContentForThisTurn.value = sessionStore.activePrompt + cleanContent;
      } else {
        finalResponseContentForThisTurn.value = cleanContent;
      }
      
      const assistantMessage = sessionStore.chatHistory[assistantMessageIndex];
      assistantMessage.type = currentAssistantContentType.value;
      assistantMessage.content = finalResponseContentForThisTurn.value;

      // Check for finish reason
      if (chunk.choices[0]?.finish_reason === 'length') {
        assistantMessage.content += '\n\n---\n\n⚠️ **内容因长度限制被截断**\n\n---';
      }
    }

    sessionStore.activePrompt = finalResponseContentForThisTurn.value;
    lastAssistantMessageType.value = currentAssistantContentType.value;

    // Continuation logic
    const trimmedContent = sessionStore.activePrompt.trim();
    isWaitingForContinuation.value = !trimmedContent.endsWith('```') && 
                                   !trimmedContent.endsWith('。') && 
                                   !trimmedContent.endsWith('.') &&
                                   trimmedContent.length > 200;
    
    if (isWaitingForContinuation.value) {
      sessionStore.chatHistory[assistantMessageIndex].content += "\n\n*(内容可能未完整，请输入\"继续\"获取剩余部分)*";
    }

  } catch (error) {
    const errorMsg = handleApiError(error, '与 AI 对话时');
    ElMessage.error(errorMsg);
    sessionStore.chatHistory.push({ 
      id: `${Date.now()}-error`, 
      role: 'assistant', 
      content: errorMsg, 
      type: MESSAGE_TYPES.ERROR 
    });
    isWaitingForContinuation.value = false;
  } finally {
    chatLoading.value = false;
    nextTick(() => {
      chatMessagesRef.value?.scrollToBottom();
      chatInputAreaRef.value?.focusInput();
    });
  }
}
</script>

<style scoped>
.chat-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 60vh;
}

.dev-solution-dialog :deep(.el-dialog__body) {
  padding: var(--spacing-xl);
}

.dev-solution-dialog :deep(.el-dialog__footer) {
  padding: var(--spacing-md) var(--spacing-xl) var(--spacing-xl);
  border-top: 1px solid var(--color-bg-light);
}

.dev-solution-tip {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
  line-height: 1.6;
}

.dev-solution-editor {
  min-height: 250px;
  border-radius: var(--border-radius);
  transition: all var(--transition-base);
}

.dev-solution-editor:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary-glow);
}

.dev-solution-editor :deep(.el-textarea__inner) {
  border-radius: var(--border-radius);
  font-family: var(--font-family);
  font-size: 14px;
  line-height: 1.6;
  padding: var(--spacing-md);
  min-height: 250px !important;
  background-color: var(--color-bg-dark) !important;
  border: 1px solid var(--color-bg-light) !important;
  color: var(--color-text-primary) !important;
}
</style>
