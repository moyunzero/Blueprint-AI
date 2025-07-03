<template>
  <div>
    <el-dialog
      title="Prompt 版本历史"
      v-model="isDialogVisible"
      width="60%"
      append-to-body
      @closed="onDialogClosed"
    >
      <div class="dialog-header-actions">
        <el-button
          v-if="selectedVersionIds.length > 0"
          size="small"
          @click="clearCompareSelection"
          :icon="Close"
        >
          清空对比选择 ({{ selectedVersionIds.length }}/2)
        </el-button>
        <el-button
          v-if="canCompare"
          size="small"
          type="primary"
          @click="performDiff"
          :icon="Files"
        >
          对比已选版本
        </el-button>
      </div>

      <el-timeline v-if="sortedPromptVersions.length > 0">
        <el-timeline-item
          v-for="version in sortedPromptVersions"
          :key="version.id"
          :timestamp="new Date(version.timestamp).toLocaleString()"
          placement="top"
        >
          <el-card
            :class="{ 'selected-for-diff': selectedVersionIds.includes(version.id) }"
          >
            <h4>
              {{ version.source === 'initial' ? '初始生成' : (version.source === 'refined' ? '优化版本' : '加载/编辑') }}
            </h4>
            <p class="prompt-preview">{{ version.content.substring(0, 150) }}...</p>
            <div class="card-actions">
              <el-button size="small" @click="handleViewFullPromptVersion(version)">
                查看
              </el-button>
              <el-button size="small" type="primary" @click="handleUsePromptVersion(version)">
                使用此版本
              </el-button>
              <el-button
                size="small"
                :type="selectedVersionIds.includes(version.id) ? 'warning' : 'info'"
                @click="toggleSelectionForCompare(version.id)"
                :disabled="selectedVersionIds.length === 2 && !selectedVersionIds.includes(version.id)"
              >
                {{ selectedVersionIds.includes(version.id) ? '已选择' : '选择对比' }}
              </el-button>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
      <el-empty description="暂无 Prompt 历史记录。" v-else></el-empty>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="isDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- View Full Prompt Version Dialog -->
    <el-dialog
      title="完整 Prompt 版本"
      v-model="viewFullPromptContentDialogVisible"
      width="70%"
      append-to-body
    >
      <div class="result-content-viewer" style="max-height: 60vh; overflow-y: auto;">
        <div v-if="currentViewingPromptContent" v-html="marked(currentViewingPromptContent)"></div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="viewFullPromptContentDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Diff Viewer Dialog -->
    <el-dialog
      :title="`Prompt 差异对比： ${version1Timestamp} vs ${version2Timestamp}`"
      v-model="diffDialogVisible"
      width="80%"
      top="5vh"
      append-to-body
      @closed="onDiffDialogClosed"
    >
      <div class="diff-viewer-content" style="max-height: 70vh; overflow-y: auto;">
        <div v-html="diffHtmlContent" class="diff-container"></div>
      </div>
       <template #footer>
        <span class="dialog-footer">
          <el-button @click="diffDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="clearCompareSelection">重新选择</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { marked } from 'marked';
import { diff_match_patch } from 'diff-match-patch';
import { Files, Close } from '@element-plus/icons-vue';

// --- Props and Emits ---
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  versions: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:visible', 'use-version', 'closed']);

// --- State ---
const viewFullPromptContentDialogVisible = ref(false);
const currentViewingPromptContent = ref(null);
const selectedVersionIds = ref([]);
const diffDialogVisible = ref(false);
const diffHtmlContent = ref('');
const version1Timestamp = ref('');
const version2Timestamp = ref('');

// --- Computed Properties for v-model and logic ---
const isDialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const sortedPromptVersions = computed(() => {
  return [...props.versions].sort((a, b) => b.timestamp - a.timestamp);
});

const selectedVersions = computed(() => {
  const versions = selectedVersionIds.value
    .map(id => props.versions.find(v => v.id === id))
    .filter(Boolean);
  return versions.sort((a, b) => a.timestamp - b.timestamp);
});

const canCompare = computed(() => {
  return selectedVersionIds.value.length === 2;
});

// --- Methods ---
function handleViewFullPromptVersion(version) {
  currentViewingPromptContent.value = version.content;
  viewFullPromptContentDialogVisible.value = true;
}

function handleUsePromptVersion(version) {
  emit('use-version', version.content);
  isDialogVisible.value = false;
  clearCompareSelection();
}

function onDialogClosed() {
  viewFullPromptContentDialogVisible.value = false;
  currentViewingPromptContent.value = null;
  clearCompareSelection();
  emit('closed');
}

function onDiffDialogClosed() {
  diffHtmlContent.value = '';
}

function toggleSelectionForCompare(versionId) {
  const index = selectedVersionIds.value.indexOf(versionId);
  if (index > -1) {
    selectedVersionIds.value.splice(index, 1);
  } else {
    if (selectedVersionIds.value.length < 2) {
      selectedVersionIds.value.push(versionId);
    } else {
      const oldestId = selectedVersions.value[0].id;
      const oldestIndex = selectedVersionIds.value.indexOf(oldestId);
      selectedVersionIds.value.splice(oldestIndex, 1);
      selectedVersionIds.value.push(versionId);
      ElMessage.info('已替换最早的选择。');
    }
  }
}

function clearCompareSelection() {
  selectedVersionIds.value = [];
  if(diffDialogVisible.value) {
    ElMessage.info('已清空对比选择。');
  }
  diffDialogVisible.value = false;
  diffHtmlContent.value = '';
  version1Timestamp.value = '';
  version2Timestamp.value = '';
}

function performDiff() {
  if (!canCompare.value) {
    ElMessage.warning('请选择两个 Prompt 版本进行对比。');
    return;
  }
  
  const [version1, version2] = selectedVersions.value;

  if (!version1 || !version2) {
    ElMessage.error('无法找到选定的版本内容。');
    clearCompareSelection();
    return;
  }

  version1Timestamp.value = new Date(version1.timestamp).toLocaleString();
  version2Timestamp.value = new Date(version2.timestamp).toLocaleString();

  diffHtmlContent.value = generateUnifiedDiffHtml(version1.content, version2.content);
  diffDialogVisible.value = true;
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

function diffPrettyHtmlCustom(diffs, removedClass, addedClass) {
    let html = [];
    for (let i = 0; i < diffs.length; i++) {
        const op = diffs[i][0];
        const text = diffs[i][1];
        const escapedText = escapeHtml(text);
        switch (op) {
            case 1: html.push(`<span class="${addedClass}">${escapedText}</span>`); break;
            case -1: html.push(`<span class="${removedClass}">${escapedText}</span>`); break;
            case 0: html.push(escapedText); break;
        }
    }
    return html.join('');
}

function generateUnifiedDiffHtml(oldText, newText) {
    const dmp = new diff_match_patch();
    const lineMap = dmp.diff_linesToChars_(oldText, newText);
    const diff = dmp.diff_main(lineMap.chars1, lineMap.chars2);
    dmp.diff_charsToLines_(diff, lineMap.lineArray);
    dmp.diff_cleanupSemantic(diff);

    let html = '';
    let oldLineNum = 1;
    let newLineNum = 1;

    for (let i = 0; i < diff.length; i++) {
        const op = diff[i][0];
        const text = diff[i][1];
        const linesInSegment = text.split('\n');
        const hasTrailingNewline = text.endsWith('\n');

        linesInSegment.forEach((lineContent, index) => {
            if (index === linesInSegment.length - 1 && lineContent.length === 0 && hasTrailingNewline) return;

            let currentOldLineNum = '';
            let currentNewLineNum = '';
            let prefixChar = ' ';
            let lineClass = '';
            let renderedContent = '';

            const isModifiedLine = (op === -1 && i + 1 < diff.length && diff[i + 1][0] === 1 && linesInSegment.length === 1 && diff[i + 1][1].split('\n').length === 1);

            if (op === 0) {
                lineClass = 'diff-line-unchanged';
                currentOldLineNum = oldLineNum++;
                currentNewLineNum = newLineNum++;
                renderedContent = escapeHtml(lineContent);
            } else if (op === -1) {
                if (isModifiedLine) {
                    lineClass = 'diff-line-modified-old';
                    prefixChar = '-';
                    currentOldLineNum = oldLineNum++;
                    const nextLineContent = diff[i + 1][1];
                    const inlineDiffs = dmp.diff_main(lineContent, nextLineContent);
                    dmp.diff_cleanupSemantic(inlineDiffs);
                    renderedContent = diffPrettyHtmlCustom(inlineDiffs, 'diff-removed-inline', 'diff-added-inline');
                    newLineNum++;
                    i++;
                } else {
                    lineClass = 'diff-line-removed';
                    prefixChar = '-';
                    currentOldLineNum = oldLineNum++;
                    renderedContent = `<span class="diff-removed-inline">${escapeHtml(lineContent)}</span>`;
                }
            } else if (op === 1) {
                lineClass = 'diff-line-added';
                prefixChar = '+';
                currentNewLineNum = newLineNum++;
                renderedContent = `<span class="diff-added-inline">${escapeHtml(lineContent)}</span>`;
            }

            html += `<div class="diff-line ${lineClass}">`;
            html += `<span class="diff-line-num old-num">${currentOldLineNum}</span>`;
            html += `<span class="diff-line-num new-num">${currentNewLineNum}</span>`;
            html += `<span class="diff-prefix">${prefixChar}</span>`;
            html += `<span class="diff-content">${renderedContent}</span>`;
            html += `</div>`;
        });
    }
    return html;
}
</script>

<style scoped>
.prompt-preview {
  font-size: 0.9em;
  color: #666;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 0.85em;
  color: #888;
}
.el-timeline-item .el-card h4 {
    margin-top: 0;
    margin-bottom: 10px;
}
.el-timeline-item .el-card {
    transition: all 0.2s ease-in-out;
}
.el-timeline-item .el-card.selected-for-diff {
    border: 2px solid #e6a23c;
    box-shadow: 0 4px 15px rgba(230, 162, 60, 0.2);
    transform: translateY(-1px);
}
.card-actions {
    margin-top: 15px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}
.result-content-viewer {
  padding: 15px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  border: 1px solid #e0e6ed;
  background-color: #fdfdfd;
}
.dialog-header-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    padding-bottom: 15px;
    border-bottom: 1px solid #ebeef5;
    margin-bottom: 20px;
}
.dialog-header-actions .el-button .el-icon {
  margin-right: 4px;
}

.diff-viewer-content {
  background-color: #f8f8f8;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}

.diff-container {
  margin: 0;
  padding: 0;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
  font-size: 13px;
  line-height: 1.5;
  overflow-x: auto;
  min-height: 100px;
  color: #333;
}

.diff-container :deep(.diff-line) {
  display: flex;
  align-items: flex-start;
  padding: 2px 0;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.diff-container :deep(.diff-line:last-child) {
  border-bottom: none;
}

.diff-container :deep(.diff-line-num) {
  flex-shrink: 0;
  width: 30px;
  text-align: right;
  padding-right: 10px;
  color: #888;
  user-select: none;
}

.diff-container :deep(.diff-prefix) {
  flex-shrink: 0;
  width: 20px;
  text-align: center;
  color: #888;
  user-select: none;
}

.diff-container :deep(.diff-content) {
  flex-grow: 1;
  padding-left: 5px;
  white-space: pre-wrap;
  word-break: break-word;
}

.diff-container :deep(.diff-line-added) {
  background-color: #e6ffed;
}

.diff-container :deep(.diff-line-removed) {
  background-color: #ffeef0;
}

.diff-container :deep(.diff-line-modified-old) {
  background-color: #fffbdd;
}

.diff-container :deep(.diff-line-unchanged) {
  background-color: transparent;
}

.diff-container :deep(.diff-added-inline) {
  background-color: #b3f7d1;
  color: #228b22;
  padding: 0 1px;
  border-radius: 2px;
}

.diff-container :deep(.diff-removed-inline) {
  background-color: #ffd8d8;
  color: #d12222;
  text-decoration: line-through;
  padding: 0 1px;
  border-radius: 2px;
}
</style>
