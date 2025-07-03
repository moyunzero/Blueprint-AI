<template>
  <!-- 聊天对话框组件 - 提供AI交互式优化提示词功能 -->
  <div>
    <!-- 主聊天对话框 -->
    <el-dialog
      title="优化提示词"
      v-model="isDialogVisible"
      width="70%"
      :before-close="handleBeforeClose"
      class="chat-dialog"
      append-to-body
      @opened="onDialogOpened"
    >
      <!-- 聊天容器：消息展示区 + 输入区 -->
      <div class="chat-container">
        <!-- 消息展示组件：显示对话历史和流式响应 -->
        <ChatMessages
          ref="chatMessagesRef"
          :chat-history="sessionStore.chatHistory"
          :chat-loading="chatLoading"
          :is-waiting-for-continuation="isWaitingForContinuation"
        />
        <!-- 输入区组件：支持文本、图片、文档等多种输入方式 -->
        <ChatInputArea
          ref="chatInputAreaRef"
          :loading="chatLoading"
          :is-waiting-for-continuation="isWaitingForContinuation"
          @send-message="handleSendMessage"
          @open-dev-solution-dialog="openDevSolutionDialog"
        />
      </div>
      
      <!-- 对话框底部操作按钮 -->
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="requestClose">取消</el-button>
          <el-button 
            type="primary" 
            @click="applyRefinedPrompt" 
            :disabled="chatLoading || !canApplyRefinedPrompt"
          >
            应用优化后的提示词
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 技术方案输入对话框：用于收集详细的开发实现方案 -->
    <el-dialog
      title="添加开发技术方案"
      v-model="showDevSolutionInput"
      width="60%"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      append-to-body
      custom-class="dev-solution-dialog"
    >
      <!-- 使用说明 -->
      <p class="dev-solution-tip">
        请在此处输入您的技术实现方案、具体的组件名称、字段定义、交互逻辑等。这些信息将用于优化和润色主 Prompt。
      </p>
      
      <!-- 技术方案输入框 -->
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
      
      <!-- 技术方案对话框底部按钮 -->
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
/**
 * 聊天对话框组件 - 提供AI交互式优化提示词功能
 * 
 * 主要功能：
 * - 与AI进行多轮对话优化提示词
 * - 支持文本、图片、文档等多种输入方式
 * - 处理流式响应和消息类型识别
 * - 管理开发技术方案输入和处理
 */

import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 配置和工具
import { MESSAGE_TYPES } from '@/config/constants.js'
import { handleApiError } from '@/utils/errorHandler.js'
import { convertFileToBase64, convertFileToString, processApiDocFile } from '@/utils/fileUtils'
import { refinePromptConversationally } from '@/services/aiService.js'

// 状态管理
import { useSessionStore } from '@/stores/sessionStore'

// 子组件
import ChatMessages from './ChatMessages.vue'
import ChatInputArea from './ChatInputArea.vue'

// ===== 组件属性和事件 =====
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'apply-prompt', 'closed'])

// ===== 状态管理 =====
const sessionStore = useSessionStore()

// 聊天状态
const chatLoading = ref(false)
const isWaitingForContinuation = ref(false)
const lastAssistantMessageType = ref(null)

// 流式响应状态
const streamingContentBuffer = ref('')
const hasDeterminedTypeForCurrentTurn = ref(false)
const currentAssistantContentType = ref(MESSAGE_TYPES.INITIAL_RESPONSE)
const finalResponseContentForThisTurn = ref('')

// 开发方案输入状态
const showDevSolutionInput = ref(false)
const devSolutionInputContent = ref('')

// 组件引用
const chatMessagesRef = ref(null)
const chatInputAreaRef = ref(null)

// ===== 计算属性 =====
/**
 * 对话框显示状态 - 双向绑定
 */
const isDialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

/**
 * 是否可以应用优化后的提示词
 */
const canApplyRefinedPrompt = computed(() => {
  return !chatLoading.value && sessionStore.activePrompt &&
         (lastAssistantMessageType.value === 'prompt-update' || 
          lastAssistantMessageType.value === 'initial-response' || 
          lastAssistantMessageType.value === 'continuation');
});

// ===== 监听器 =====
/**
 * 监听对话框显示状态变化
 */
watch(() => props.visible, (newVal) => {
  if (newVal) {
    initializeChat();
  }
});

// ===== 方法定义 =====
/**
 * 初始化聊天状态 - 重置所有相关状态变量
 */
function initializeChat() {
  // 重置流式响应状态
  isWaitingForContinuation.value = false;
  lastAssistantMessageType.value = null;
  streamingContentBuffer.value = '';
  hasDeterminedTypeForCurrentTurn.value = false;
  currentAssistantContentType.value = MESSAGE_TYPES.INITIAL_RESPONSE;
  finalResponseContentForThisTurn.value = '';
  
  // 关闭并清空技术方案对话框
  showDevSolutionInput.value = false;
  devSolutionInputContent.value = '';

  // 准备聊天环境
  sessionStore.prepareForChat();

  nextTick(() => {
    chatMessagesRef.value?.scrollToBottom();
    chatInputAreaRef.value?.focusInput();
  });
}

/**
 * 对话框打开时的回调
 */
function onDialogOpened() {
  initializeChat();
}

/**
 * 对话框关闭前的确认处理
 */
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

/**
 * 请求关闭对话框
 */
function requestClose() {
  handleBeforeClose(() => {
    isDialogVisible.value = false;
  });
}

/**
 * 处理发送消息事件 - 来自输入组件的统一入口
 */
function handleSendMessage(payload) {
  sendMessage(
    payload.content,
    'text',
    payload.imageFile,
    payload.documentFile,
    payload.apiDocFile
  );
}

/**
 * 打开技术方案输入对话框
 */
function openDevSolutionDialog() {
  devSolutionInputContent.value = '';
  showDevSolutionInput.value = true;
}

/**
 * 发送技术方案内容的包装方法
 */
function sendDevSolutionWrapper() {
  sendMessage(devSolutionInputContent.value, 'dev-solution');
  showDevSolutionInput.value = false;
}

/**
 * 应用优化后的提示词 - 主要业务逻辑入口
 */
function applyRefinedPrompt() {
  if (!canApplyRefinedPrompt.value) {
    ElMessage.warning('当前没有可应用的优化Prompt。请等待 AI 返回一个完整的优化Prompt。');
    return;
  }

  const promptToApply = sessionStore.activePrompt;

  // 如果AI回复可能未完整，需要用户确认
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

/**
 * 最终应用提示词 - 验证内容有效性并触发应用事件
 */
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

/**
 * 发送消息的核心方法 - 处理各种类型的用户输入并与AI进行对话
 * @param {string} inputContent - 用户输入的文本内容
 * @param {string} inputType - 输入类型：'text'、'dev-solution'等
 * @param {File} imageFile - 上传的图片文件
 * @param {File} documentFile - 上传的文档文件
 * @param {File} apiDocFile - 上传的API文档文件
 */
async function sendMessage(inputContent, inputType = 'text', imageFile = null, documentFile = null, apiDocFile = null) {
  const userText = inputContent.trim();
  const isContinueCommand = inputType === 'text' && (userText.toLowerCase() === '继续' || userText.toLowerCase() === 'continue');

  // 输入验证
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
    // 处理上传的文件
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

    // 根据输入类型准备API消息
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

    // 添加用户消息到聊天历史（继续命令除外）
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

    // 为API调用准备历史记录
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

    // 初始化流式响应状态
    streamingContentBuffer.value = '';
    hasDeterminedTypeForCurrentTurn.value = false;
    currentAssistantContentType.value = MESSAGE_TYPES.INITIAL_RESPONSE;
    finalResponseContentForThisTurn.value = '';

    // 处理助手消息的索引
    let assistantMessageIndex = -1;
    if (isContinueCommand && isWaitingForContinuation.value) {
      // 查找最后一条助手消息
      for (let i = sessionStore.chatHistory.length - 1; i >= 0; i--) {
        if (sessionStore.chatHistory[i].role === 'assistant') {
          assistantMessageIndex = i;
          break;
        }
      }
      if (assistantMessageIndex !== -1) {
        // 移除UI中的继续提示
        sessionStore.chatHistory[assistantMessageIndex].content = sessionStore.chatHistory[assistantMessageIndex].content.replace(/\n\n\*[^)]*\*$/, '').trim();
      }
    } else {
      sessionStore.chatHistory.push({ id: `${Date.now()}-assistant`, role: 'assistant', content: '', type: 'initial-response' });
      assistantMessageIndex = sessionStore.chatHistory.length - 1;
    }
    
    // 调用AI服务获取流式响应
    const stream = await refinePromptConversationally({
      currentFullPrompt: sessionStore.basePromptForChat,
      history: historyForApi,
      userTextMessage: messageForApi,
      imageBase64: currentImageBase64Data,
      temperature: 0.2,
      framework: sessionStore.formSettings.framework,
      componentLibrary: sessionStore.formSettings.componentLibrary,
      isContinuation: isContinueCommand,
    });

    // 处理流式响应
    for await (const chunk of stream) {
      const contentPart = chunk.choices[0]?.delta?.content || '';
      streamingContentBuffer.value += contentPart;

      let cleanContent = streamingContentBuffer.value;
      
      // 确定消息类型（仅在首次确定时）
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
        // 清理已确定类型的内容前缀
        if (cleanContent.startsWith('Updated Prompt:')) cleanContent = cleanContent.substring('Updated Prompt:'.length).trimStart();
        if (cleanContent.startsWith('Answer:')) cleanContent = cleanContent.substring('Answer:'.length).trimStart();
      }

      const assistantMessage = sessionStore.chatHistory[assistantMessageIndex];
      
      if (isContinueCommand && isWaitingForContinuation.value) {
        // 继续模式：追加新内容到现有内容
        assistantMessage.content = assistantMessage.content + contentPart;
        finalResponseContentForThisTurn.value = assistantMessage.content;
      } else {
        // 新消息：使用清理后的内容
        finalResponseContentForThisTurn.value = cleanContent;
        assistantMessage.content = finalResponseContentForThisTurn.value;
      }
      
      assistantMessage.type = currentAssistantContentType.value;

      // 检查是否因长度限制被截断
      if (chunk.choices[0]?.finish_reason === 'length') {
        assistantMessage.content += '\n\n---\n\n⚠️ **内容因长度限制被截断**\n\n---';
      }
    }

    // 更新活跃提示词
    if (currentAssistantContentType.value === 'prompt-update' || currentAssistantContentType.value === 'continuation') {
      sessionStore.activePrompt = finalResponseContentForThisTurn.value;
    }
    lastAssistantMessageType.value = currentAssistantContentType.value;

    // 判断是否需要继续生成
    const trimmedContent = finalResponseContentForThisTurn.value.trim();
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
/* ===== 聊天对话框样式 ===== */
.chat-dialog :deep(.el-dialog__body) {
  padding: 0; /* 移除默认内边距，由子组件控制布局 */
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 60vh; /* 固定高度，确保消息区域可滚动 */
}

/* ===== 技术方案对话框样式 ===== */
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
