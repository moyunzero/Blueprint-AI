<template>
  <el-card class="template-manager-card">
    <template #header>
      <div class="header">
        <div class="header-title">
          <el-icon><Collection /></el-icon>
          <span>Prompt 模板管理</span>
        </div>
        <div class="header-actions">
          <el-button
            type="primary"
            :icon="Plus"
            @click="showTemplateForm(null)"
            size="small"
          >
            创建新模板
          </el-button>
          <input type="file" ref="importFileInput" @change="handleImportFile" accept=".json" style="display: none;" />
          <el-button
            :icon="Upload"
            @click="triggerImportFile"
            size="small"
          >
            导入模板
          </el-button>
        </div>
      </div>
    </template>

    <div class="template-list-container">
      <el-empty v-if="templateStore.sortedTemplates.length === 0" description="暂无自定义 Prompt 模板。"></el-empty>
      <el-table
        v-else
        :data="templateStore.sortedTemplates"
        style="width: 100%"
        stripe
        row-key="id"
        class="templates-table"
      >
        <el-table-column type="index" label="序号" width="60"></el-table-column>
        <el-table-column prop="name" label="模板名称" width="180"></el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip></el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="showTemplateForm(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="confirmDelete(row)">删除</el-button>
            <el-button size="small" type="info" @click="exportTemplate(row)">导出</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Template Edit/Create Dialog -->
    <el-dialog
      :title="isEditMode ? '编辑 Prompt 模板' : '创建 Prompt 模板'"
      v-model="templateFormVisible"
      width="60%"
      :before-close="handleFormClose"
      append-to-body
      class="template-edit-dialog"
    >
      <el-form :model="currentTemplate" ref="templateFormRef" :rules="formRules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="currentTemplate.name" placeholder="模板名称"></el-input>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input type="textarea" :rows="2" v-model="currentTemplate.description" placeholder="模板简要描述"></el-input>
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="currentTemplate.content"
            type="textarea"
            :rows="15"
            placeholder="在此处输入 Prompt 模板内容（支持 Markdown 格式）..."
            ref="mdeEditorRef"
            class="template-editor"
          />
        </el-form-item>
        <el-alert
            title="请注意：当您使用自定义 Prompt 模板时，系统将不再使用默认的系统级 Prompt。"
            type="info"
            show-icon
            :closable="false"
            style="margin-bottom: 20px;"
        />
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleFormClose">取消</el-button>
          <el-button type="primary" @click="saveTemplate">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Collection, Plus, Upload } from '@element-plus/icons-vue';
import { usePromptTemplateStore } from '@/stores/promptTemplateStore';

// --- Store ---
const templateStore = usePromptTemplateStore();

// --- State ---
const templateFormVisible = ref(false);
const isEditMode = ref(false);
const currentTemplate = reactive({
  id: null,
  name: '',
  description: '',
  content: '',
  createdAt: null,
});

const formRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  content: [{ required: true, message: '请输入模板内容', trigger: 'blur' }],
};



// --- Template Refs ---
const importFileInput = ref(null);
const templateFormRef = ref(null);
const mdeEditorRef = ref(null);

// --- Lifecycle Hooks ---
onMounted(() => {
  templateStore.loadPromptTemplates();
});

// --- Methods ---
function showTemplateForm(template) {
  if (template) {
    isEditMode.value = true;
    Object.assign(currentTemplate, template);
  } else {
    isEditMode.value = false;
    Object.assign(currentTemplate, {
      id: null,
      name: '',
      description: '',
      content: '',
      createdAt: Date.now(),
    });
  }
  templateFormVisible.value = true;
  
  nextTick(() => {
    templateFormRef.value?.clearValidate();
  });
}

async function saveTemplate() {
  if (!templateFormRef.value) return;
  await templateFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await templateStore.savePromptTemplate({ ...currentTemplate });
        ElMessage.success(isEditMode.value ? '模板更新成功！' : '模板创建成功！');
        templateFormVisible.value = false;
      } catch (error) {
        ElMessage.error('保存模板失败：' + error.message);
      }
    }
  });
}

async function confirmDelete(template) {
  try {
    await ElMessageBox.confirm(`确定要删除模板 "${template.name}" 吗？`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await templateStore.deletePromptTemplate(template.id);
    ElMessage.success('模板删除成功！');
  } catch (action) {
    if (action === 'cancel') {
      ElMessage.info('已取消删除。');
    }
  }
}

function exportTemplate(template) {
  const templateToExport = {
    formatVersion: '1.0.0',
    type: 'prompt_template',
    templates: [template],
  };
  const dataStr = JSON.stringify(templateToExport, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prompt_template_${template.name.replace(/\s+/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  ElMessage.success('模板已导出！');
}

function triggerImportFile() {
  importFileInput.value?.click();
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const importedData = JSON.parse(e.target.result);
      if (importedData.type !== 'prompt_template' || !Array.isArray(importedData.templates)) {
        ElMessage.error('导入失败：文件格式不正确。请确保导入的是有效的 Prompt 模板文件。');
        return;
      }
      if (importedData.formatVersion !== '1.0.0') {
        ElMessage.warning('导入文件的版本可能不兼容，请注意内容。');
      }

      const { importedCount, addedCount, updatedCount } = await templateStore.importPromptTemplates(importedData.templates);
      ElMessage.success(`成功导入 ${importedCount} 个模板，其中新增 ${addedCount} 个，更新 ${updatedCount} 个。`);

    } catch (error) {
      ElMessage.error('导入失败：文件读取或解析错误。' + error.message);
    } finally {
      if (event.target) {
        event.target.value = ''; // Clear file input
      }
    }
  };
  reader.readAsText(file);
}

function handleFormClose() {
  templateFormVisible.value = false;
  templateFormRef.value?.resetFields();
}
</script>

<style scoped>
.template-manager-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.template-manager-card :deep(.el-card__header) {
  padding: var(--spacing-lg) var(--spacing-xl) !important;
  border-bottom: 1px solid var(--color-bg-light) !important;
  background: var(--color-surface) !important;
  position: relative !important;
  z-index: 5 !important;
  overflow: visible !important;
}

.template-manager-card :deep(.el-card__body) {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-xl);
  overflow: hidden;
}

/* Use template slot syntax for header */
.header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  width: 100% !important;
  min-height: 40px !important;
  flex-wrap: wrap !important;
  gap: 12px !important;
  position: relative !important;
  z-index: 10 !important;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  flex-shrink: 0;
}

.header-icon {
  font-size: 20px;
  color: var(--color-primary);
}

.header-actions {
  display: flex !important;
  gap: 8px !important;
  flex-shrink: 0 !important;
  align-items: center !important;
  position: relative !important;
  z-index: 11 !important;
}
.header-actions .el-button {
  white-space: nowrap !important;
  position: relative !important;
  z-index: 3 !important;
  display: inline-flex !important;
  align-items: center !important;
  visibility: visible !important;
  opacity: 1 !important;
}
.header-actions .el-button .el-icon {
  margin-right: 4px;
}

.template-list-container {
  flex-grow: 1;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.templates-table {
  background: transparent !important;
  position: relative;
  z-index: 0;
}

.templates-table :deep(.el-table__header-wrapper) {
  background: var(--color-bg-medium);
  border-radius: var(--border-radius);
}
.templates-table :deep(.el-table__header-wrapper th) {
  background: transparent !important;
  font-weight: 600;
  color: var(--color-text-primary);
}

.templates-table :deep(.el-table__body tr) {
    background-color: transparent !important;
}

.templates-table :deep(.el-table__body tr.el-table__row--striped) {
    background-color: var(--color-bg-medium) !important;
}

.templates-table :deep(.el-table__cell) {
    background: transparent !important;
    border-bottom: 1px solid var(--color-bg-light);
    padding: 12px 0;
}

.templates-table :deep(.el-button--small) {
    padding: 5px 10px;
    font-size: 12px;
    border-radius: 6px;
}

/* Dialog styles */
.template-edit-dialog :deep(.el-dialog__body) {
  padding: var(--spacing-xl);
}
.template-edit-dialog :deep(.el-dialog__footer) {
  padding: var(--spacing-md) var(--spacing-xl) var(--spacing-xl);
  border-top: 1px solid var(--color-bg-light);
}

.template-editor {
  border-radius: var(--border-radius-lg);
  transition: all var(--transition-base);
}
.template-editor:focus-within {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 1px var(--color-primary-glow);
}
.template-editor :deep(.el-textarea__inner) {
    border-radius: var(--border-radius-lg);
    font-family: var(--font-family);
    font-size: 14px;
    line-height: 1.6;
    padding: var(--spacing-md);
    min-height: 300px !important;
    background-color: var(--color-bg-dark) !important;
    border: 1px solid var(--color-bg-light) !important;
    color: var(--color-text-primary) !important;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .header-title {
    justify-content: center;
  }
  
  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .template-manager-card :deep(.el-card__header) {
    padding: var(--spacing-md);
  }
  
  .template-manager-card :deep(.el-card__body) {
    padding: var(--spacing-md);
  }
  
  .templates-table :deep(.el-table__cell) {
    padding: 8px 4px;
  }
  
  .templates-table :deep(.el-button--small) {
    padding: 4px 8px;
    font-size: 11px;
  }
}
</style>
