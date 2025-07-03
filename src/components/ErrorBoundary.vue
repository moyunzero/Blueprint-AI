<template>
  <div class="error-boundary">
    <div v-if="hasError" class="error-display">
      <el-card class="error-card">
        <div class="error-content">
          <div class="error-icon">
            <el-icon><Warning /></el-icon>
          </div>
          <h3 class="error-title">组件加载失败</h3>
          <p class="error-message">{{ errorMessage }}</p>
          <div class="error-actions">
            <el-button type="primary" @click="retry">
              <el-icon><Refresh /></el-icon>
              重试
            </el-button>
            <el-button @click="reportError">
              <el-icon><Message /></el-icon>
              报告问题
            </el-button>
          </div>
          <details v-if="errorDetails" class="error-details">
            <summary>错误详情</summary>
            <pre>{{ errorDetails }}</pre>
          </details>
        </div>
      </el-card>
    </div>
    <!-- When hasError is false, the content in the slot will be rendered -->
    <slot v-else></slot>
  </div>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue';
import { ElMessage } from 'element-plus';
import { Warning, Refresh, Message } from '@element-plus/icons-vue';

// Reactive state using ref()
const hasError = ref(false);
const errorMessage = ref('');
const errorDetails = ref('');

// The Composition API equivalent of the errorCaptured lifecycle hook
onErrorCaptured((err, instance, info) => {
  console.error('ErrorBoundary捕获到错误:', err);
  console.error('错误组件实例:', instance);
  console.error('错误信息:', info);

  // Update the state to show the error message
  hasError.value = true;
  errorMessage.value = err.message || '未知错误';
  errorDetails.value = `错误: ${err.stack}\n组件信息: ${info}`;

  // Prevent the error from propagating further up
  return false;
});

// Methods are now plain functions
function retry() {
  // Simply resetting the state will cause Vue to re-render the slot content
  hasError.value = false;
  errorMessage.value = '';
  errorDetails.value = '';
}

function reportError() {
  // Here we can implement the error reporting logic
  const errorReport = {
    message: errorMessage.value,
    details: errorDetails.value,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  console.log('错误报告:', errorReport);
  // Use the imported ElMessage
  ElMessage.info('错误报告已记录到控制台');
}
</script>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100%;
}

.error-display {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  padding: 20px;
}

.error-card {
  max-width: 600px;
  width: 100%;
}

.error-content {
  text-align: center;
  padding: 20px;
}

.error-icon {
  font-size: 64px;
  color: #f56c6c;
  margin-bottom: 20px;
}

.error-icon .el-icon {
  width: 1em;
  height: 1em;
  font-size: inherit;
}

.error-title {
  font-size: 20px;
  color: #303133;
  margin: 0 0 16px 0;
}

.error-message {
  font-size: 14px;
  color: #606266;
  margin: 0 0 24px 0;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.error-actions .el-button .el-icon {
  margin-right: 8px;
}

.error-details {
  text-align: left;
  margin-top: 20px;
  border-top: 1px solid #ebeef5;
  padding-top: 20px;
}

.error-details summary {
  cursor: pointer;
  font-weight: 500;
  color: #606266;
  margin-bottom: 10px;
}

.error-details pre {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  color: #303133;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

@media (max-width: 768px) {
  .error-actions {
    flex-direction: column;
    align-items: center;
  }

  .error-actions .el-button {
    width: 200px;
  }
}
</style>
