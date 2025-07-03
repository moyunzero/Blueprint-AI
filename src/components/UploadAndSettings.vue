<template>
  <!-- 上传和设置组件 - 提供文件上传和生成参数配置功能 -->
  <el-card class="controls-card">
    <div class="card-content">
      <!-- 文件上传区域 -->
      <div class="upload-section">
        <!-- 拖拽上传组件：支持图片和设计文件 -->
        <el-upload
          ref="mainUploaderRef"
          class="uploader"
          drag
          action="#"
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleFileChange"
          v-if="!localImagePreview && !localDesignFile"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">
            拖拽图片或设计文件到此
          </div>
          <div class="el-upload__tip">
            或 <em>点击上传</em>
          </div>
        </el-upload>

        <!-- 图片预览：显示已上传的图片 -->
        <div v-if="localImagePreview" class="image-preview">
          <img :src="localImagePreview" alt="Uploaded design" class="preview-image" />
          <div class="image-actions">
            <el-button type="danger" @click="removeFile" :icon="Delete" circle></el-button>
          </div>
        </div>

        <!-- 设计文件预览：显示已上传的设计文件信息 -->
        <div v-if="localDesignFile" class="design-file-preview">
          <div class="file-icon">
            <el-icon><component :is="getFileIcon(localDesignFile.fileInfo.type)" /></el-icon>
          </div>
          <div class="file-info">
            <h4 class="file-name">{{ localDesignFile.fileInfo.name }}</h4>
          </div>
          <div class="file-actions">
            <el-button type="danger" @click="removeFile" :icon="Delete" circle></el-button>
          </div>
        </div>
      </div>

      <!-- 设置表单区域 -->
      <div class="settings-section">
        <el-form :model="localForm" label-position="top" class="settings-form">

          <!-- 核心设置分组 -->
          <el-divider content-position="left" class="section-divider">
            <el-icon><Setting /></el-icon>
            <span style="margin-left: 8px;">核心设置</span>
          </el-divider>

          <!-- 前端框架选择 -->
          <el-form-item label="前端框架">
            <el-select v-model="localForm.framework" placeholder="选择前端框架" class="full-width" @change="onSettingsChange">
              <el-option v-for="item in frameworkOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
            </el-select>
          </el-form-item>

          <!-- UI组件库选择 -->
          <el-form-item label="UI 组件库">
            <el-select v-model="localForm.componentLibrary" placeholder="选择UI组件库" class="full-width" @change="onSettingsChange">
              <el-option v-for="item in libraryOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
            </el-select>
          </el-form-item>

          <!-- 自定义模板选择 -->
          <el-form-item label="自定义 Prompt 模板 (可选)">
            <el-select v-model="selectedTemplateId" placeholder="选择一个 Prompt 模板" class="full-width" clearable @change="onTemplateSelected">
              <el-option v-for="template in templateStore.promptTemplates" :key="template.id" :label="template.name" :value="template.id"></el-option>
            </el-select>
          </el-form-item>

          <!-- 高级设置折叠面板 -->
          <el-collapse class="advanced-settings">
            <el-collapse-item name="1">
                <template #title>
                    <el-icon><MagicStick /></el-icon>
                    <span style="margin-left: 8px;">高级设置</span>
                </template>
                <!-- Temperature 创造力设置 -->
                <div class="temperature-setting">
                    <div class="setting-label">
                        <span>创造力 (Temperature)</span>
                        <span class="temperature-value">{{ (localForm.temperature / 100).toFixed(2) }}</span>
                    </div>
                    <div class="temperature-slider">
                        <span class="slider-label">精准</span>
                        <el-slider v-model="localForm.temperature" :min="0" :max="100" :step="1" :format-tooltip="formatTemperatureTooltip" @change="onSettingsChange"></el-slider>
                        <span class="slider-label">创意</span>
                    </div>
                    <p class="setting-desc">控制随机性。值越低越专注，值越高越有创意。默认: 0.5。</p>
                </div>
            </el-collapse-item>
          </el-collapse>

        </el-form>
      </div>

      <!-- 操作按钮区域 -->
      <div class="action-section">
        <!-- API Key 警告提示 -->
        <div v-if="!apiKeySet" class="api-key-warning">
          <el-alert title="API Key 未设置" type="warning" description="要使用真实的 LLM API，请在 .env 文件中设置您的 API 密钥。当前正在使用模拟数据。" show-icon :closable="false"></el-alert>
        </div>

        <!-- 生成蓝图按钮 -->
        <el-button type="primary" @click="handleGenerateClick" :loading="props.generateButtonLoading" :disabled="!localFile && !localImagePreview" class="generate-button" size="large">
          <el-icon><Lightning /></el-icon>
          {{ props.generateButtonLoading ? '生成中...' : '生成蓝图' }}
        </el-button>

        <!-- 会话管理按钮组 -->
        <el-row :gutter="12" style="margin-top: 16px;">
          <el-col :span="12">
            <el-button @click="handleSaveSessionClick" class="full-width" :icon="Download">保存会话</el-button>
          </el-col>
          <el-col :span="12">
            <!-- 隐藏的文件输入框：用于会话加载 -->
            <input type="file" ref="loadSessionInputRef" @change="handleLoadSessionFileTrigger" accept=".json" style="display: none" />
            <el-button @click="triggerLoadSessionInput" class="full-width" :icon="Upload">加载会话</el-button>
          </el-col>
        </el-row>
      </div>
    </div>
  </el-card>
</template>

<script setup>
/**
 * 上传和设置组件 - 提供文件上传和生成参数配置功能
 * 
 * 主要功能：
 * - 支持图片和设计文件的拖拽上传
 * - 提供前端框架和UI组件库选择
 * - 支持自定义Prompt模板选择
 * - 提供Temperature等高级参数设置
 * - 会话的保存和加载功能
 */

import { ref, reactive, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { convertFileToBase64, detectFileType, processDesignFile } from '@/utils/fileUtils';
import { usePromptTemplateStore } from '@/stores/promptTemplateStore';
import { FRAMEWORK_OPTIONS, COMPONENT_LIBRARY_OPTIONS } from '@/config/constants';
import { UploadFilled, Delete, Download, Upload, Edit, Brush, MagicStick, Picture, Setting, Lightning } from '@element-plus/icons-vue';

// ===== 组件属性和事件 =====
const props = defineProps({
  generateButtonLoading: {
    type: Boolean,
    default: false,
  },
  initialImageBase64: {
    type: String,
    default: ''
  },
  initialFormSettings: {
    type: Object,
    default: () => ({
      appType: 'web',
      componentLibrary: 'ElementPlus',
      framework: 'Vue',
      temperature: 50,
    })
  }
});

const emit = defineEmits([
  'file-updated',
  'settings-changed',
  'generate-prompt-requested',
  'save-session-requested',
  'load-session-file-selected'
]);

// ===== 状态管理 =====
const templateStore = usePromptTemplateStore();

// ===== 响应式状态 =====
const localFile = ref(null); // 当前上传的文件对象
const localImagePreview = ref(props.initialImageBase64); // 图片预览Base64
const localDesignFile = ref(null); // 设计文件数据
const localForm = reactive({ ...props.initialFormSettings }); // 表单设置
const selectedTemplateId = ref(null); // 选中的模板ID
const selectedTemplateContent = ref(null); // 选中的模板内容

const frameworkOptions = ref(FRAMEWORK_OPTIONS);
const libraryOptions = ref(COMPONENT_LIBRARY_OPTIONS);
const apiKeySet = ref(process.env.VUE_APP_INITIAL_GEN_API_KEY && process.env.VUE_APP_INITIAL_GEN_API_KEY !== 'YOUR_API_KEY_HERE');

// ===== 模板引用 =====
const mainUploaderRef = ref(null);
const loadSessionInputRef = ref(null);

// ===== 监听器 =====
watch(() => props.initialImageBase64, (newVal) => {
  localImagePreview.value = newVal;
  if (newVal) {
    localFile.value = null; // 清空文件对象，避免冲突
    mainUploaderRef.value?.clearFiles();
  }
});

watch(() => props.initialFormSettings, (newVal) => {
  if (newVal) {
    Object.assign(localForm, newVal);
  }
}, { deep: true, immediate: true });

// ===== 方法定义 =====
/**
 * 处理文件上传 - 支持图片和设计文件
 */
async function handleFileChange(file) {
  localFile.value = file;
  const fileType = detectFileType(file.raw);

  if (fileType === 'image') {
    try {
      const base64 = await convertFileToBase64(file.raw);
      localImagePreview.value = base64;
      localDesignFile.value = null;
      emit('file-updated', { base64Image: base64, fileObject: file.raw, fileType: 'image' });
      onSettingsChange();
    } catch(e) {
      ElMessage.error(`图片处理失败: ${e.message || '请尝试其他图片。'}`);
      removeFile();
    }
  } else if (['figma', 'sketch', 'xd', 'design'].includes(fileType)) {
    try {
      const designFileData = await processDesignFile(file.raw);
      localDesignFile.value = designFileData;
      localImagePreview.value = '';
      emit('file-updated', { base64Image: null, fileObject: file.raw, fileType: fileType, designFileData: designFileData });
      onSettingsChange();
    } catch(e) {
      ElMessage.error(`设计文件处理失败: ${e.message || '请尝试其他文件。'}`);
      removeFile();
    }
  } else {
    ElMessage.error('不支持的文件类型！请上传图片文件或设计文件。');
    mainUploaderRef.value?.clearFiles();
  }
}

/**
 * 移除已上传的文件
 */
function removeFile() {
  localFile.value = null;
  localImagePreview.value = '';
  localDesignFile.value = null;
  mainUploaderRef.value?.clearFiles();
  emit('file-updated', { base64Image: null, fileObject: null });
  onSettingsChange();
}

/**
 * 格式化Temperature提示
 */
function formatTemperatureTooltip(val) {
  return `${(val / 100).toFixed(2)}`;
}

/**
 * 设置变更处理
 */
function onSettingsChange() {
  emit('settings-changed', { ...localForm });
}

/**
 * 模板选择处理
 */
function onTemplateSelected(templateId) {
  if (templateId) {
    const template = templateStore.promptTemplates.find(t => t.id === templateId);
    selectedTemplateContent.value = template ? template.content : null;
  } else {
    selectedTemplateContent.value = null;
  }
}

/**
 * 生成蓝图按钮点击处理
 */
function handleGenerateClick() {
  if (!localImagePreview.value) {
    ElMessage.warning('请先上传一张图片或设计文件。');
    return;
  }
  emit('generate-prompt-requested', {
    ...localForm,
    temperature: localForm.temperature / 100,
    customSystemPrompt: selectedTemplateContent.value,
  });
}

/**
 * 保存会话处理
 */
function handleSaveSessionClick() {
  emit('save-session-requested', {
    imageBase64: localImagePreview.value,
    formSettings: { ...localForm }
  });
}

/**
 * 触发会话文件选择
 */
function triggerLoadSessionInput() {
  loadSessionInputRef.value?.click();
}

/**
 * 处理会话文件加载
 */
function handleLoadSessionFileTrigger(event) {
  const file = event.target.files[0];
  if (!file) return;
  emit('load-session-file-selected', file);
  if (loadSessionInputRef.value) {
    loadSessionInputRef.value.value = null;
  }
}

/**
 * 清空上传状态
 */
function clearUploadState() {
  localFile.value = null;
  localImagePreview.value = '';
  localDesignFile.value = null;
  selectedTemplateId.value = null;
  selectedTemplateContent.value = null;
  mainUploaderRef.value?.clearFiles();
}

/**
 * 获取文件类型对应的图标
 */
function getFileIcon(fileType) {
  const iconMap = {
    'figma': Edit,
    'sketch': Brush,
    'xd': MagicStick,
    'design': Picture
  };
  return iconMap[fileType] || 'Document';
}

defineExpose({
    clearUploadState
});
</script>

<style scoped>
/* ===== 主容器样式 ===== */
.controls-card {
  width: 100%; 
  display: flex; 
  flex-direction: column;
}
.controls-card :deep(.el-card__body) {
  padding: 0 !important; 
  display: flex; 
  flex-direction: column; 
  flex-grow: 1;
}
.card-content {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  padding: var(--spacing-xl);
}

/* ===== 上传区域样式 ===== */
.upload-section {
  min-height: 250px;
  margin-bottom: var(--spacing-xl);
}

.uploader :deep(.el-upload-dragger) {
  border: 1px dashed var(--color-bg-light);
  border-radius: var(--border-radius-lg);
  background: var(--color-bg-medium);
  padding: 40px 20px;
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center;
  width: 100%; 
  height: 250px; 
  box-sizing: border-box;
  transition: all var(--transition-base);
}
.uploader :deep(.el-upload-dragger:hover) {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-glow-primary);
}
.uploader :deep(.el-icon--upload) {
  font-size: 56px; 
  color: var(--color-text-tertiary); 
  margin-bottom: 20px; 
  transition: all var(--transition-base);
}
.uploader :deep(.el-upload-dragger:hover .el-icon--upload) {
  color: var(--color-primary); 
  transform: scale(1.05);
}
.uploader :deep(.el-upload__text) { 
  color: var(--color-text-secondary); 
  font-size: 16px; 
}
.uploader :deep(.el-upload__text em) { 
  color: var(--color-primary); 
  font-style: normal; 
}
.uploader :deep(.el-upload__tip) { 
  color: var(--color-text-tertiary); 
  font-size: 13px; 
  margin-top: 10px; 
}

/* ===== 文件预览样式 ===== */
.image-preview, .design-file-preview {
  position: relative; 
  width: 100%; 
  height: 250px; 
  overflow: hidden;
  border-radius: var(--border-radius-lg); 
  display: flex; 
  align-items: center; 
  justify-content: center;
  background: var(--color-bg-medium); 
  border: 1px solid var(--color-bg-light);
}
.preview-image { 
  max-width: 100%; 
  max-height: 100%; 
  object-fit: contain; 
}
.image-actions, .file-actions {
  position: absolute; 
  top: 0; 
  left: 0; 
  right: 0; 
  bottom: 0;
  display: flex; 
  align-items: center; 
  justify-content: center;
  background: rgba(255, 255, 255, 0.9); 
  backdrop-filter: blur(4px);
  opacity: 0; 
  transition: all var(--transition-base);
}
.image-preview:hover .image-actions, 
.design-file-preview:hover .file-actions { 
  opacity: 1; 
}

.design-file-preview { 
  flex-direction: column; 
  gap: 1rem; 
  text-align: center; 
}
.file-icon .el-icon { 
  font-size: 56px; 
  color: var(--color-text-tertiary); 
}
.file-info .file-name { 
  font-size: 16px; 
  margin: 0; 
  color: var(--color-text-primary); 
}

/* ===== 设置表单样式 ===== */
.settings-section {
  flex-grow: 1;
}

.settings-form :deep(.el-form-item__label) {
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.5 !important;
  margin-bottom: 6px !important;
}

.section-divider {
  margin-bottom: 24px !important;
  border-color: var(--color-border);
}
.section-divider :deep(.el-divider__text) {
    background-color: var(--color-bg-medium);
    color: var(--color-text-primary);
    font-weight: 600;
    padding: 0 16px;
}
.section-divider .el-icon {
    font-size: 16px;
    color: var(--color-primary);
}

/* ===== 高级设置样式 ===== */
.advanced-settings {
    margin-top: 24px;
    border-top: none;
    border-bottom: none;
}
.advanced-settings :deep(.el-collapse-item__header) {
    background-color: transparent;
    color: var(--color-text-primary);
    font-weight: 600;
    border-bottom: 1px solid var(--color-bg-light);
}
.advanced-settings :deep(.el-collapse-item__wrap) {
    background-color: transparent;
    border-bottom: none;
}
.advanced-settings :deep(.el-collapse-item__content) {
    padding: 20px 0 0 0;
    color: var(--color-text-secondary);
}

.temperature-setting {
    padding: 0 4px;
}
.setting-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--color-text-primary);
    font-size: 14px;
    margin-bottom: 8px;
}
.temperature-value { 
  font-weight: 500; 
  color: var(--color-text-secondary); 
}
.temperature-slider { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
}
.slider-label { 
  font-size: 13px; 
  color: var(--color-text-tertiary); 
}
.temperature-slider .el-slider { 
  flex-grow: 1; 
}

.setting-desc { 
  font-size: 12px; 
  color: var(--color-text-tertiary); 
  margin-top: 8px; 
}

/* ===== 操作按钮样式 ===== */
.action-section {
    margin-top: auto;
    padding-top: var(--spacing-xl);
}

.api-key-warning { 
  margin-bottom: 16px; 
}
.generate-button {
  width: 100%; 
  height: 48px; 
  font-size: 16px;
}
.generate-button .el-icon { 
  font-size: 18px; 
  margin-right: 8px; 
}
.full-width { 
  width: 100%; 
}
.full-width .el-icon { 
  margin-right: 6px; 
}
</style>
