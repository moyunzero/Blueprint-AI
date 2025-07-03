<template>
  <!-- 错误边界组件 - 捕获子组件错误并提供友好的错误界面 -->
  <div class="error-boundary">
    <!-- 错误显示界面：当发生错误时展示 -->
    <div v-if="hasError" class="error-display">
      <el-card class="error-card">
        <div class="error-content">
          <!-- 错误图标 -->
          <div class="error-icon">
            <el-icon><Warning /></el-icon>
          </div>
          
          <!-- 错误标题和消息 -->
          <h3 class="error-title">组件加载失败</h3>
          <p class="error-message">{{ errorMessage }}</p>
          
          <!-- 操作按钮组 -->
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
          
          <!-- 错误详情：可折叠显示技术细节 -->
          <details v-if="errorDetails" class="error-details">
            <summary>错误详情</summary>
            <pre>{{ errorDetails }}</pre>
          </details>
        </div>
      </el-card>
    </div>
    
    <!-- 正常内容插槽：无错误时渲染子组件 -->
    <slot v-else></slot>
  </div>
</template>

<script setup>
/**
 * 错误边界组件 - 捕获子组件错误并提供友好的错误界面
 * 
 * 主要功能：
 * - 捕获子组件中的JavaScript错误
 * - 显示用户友好的错误界面
 * - 提供错误重试和报告功能
 * - 防止错误向上传播导致整个应用崩溃
 * - 记录详细的错误信息用于调试
 */

import { ref, onErrorCaptured } from 'vue'
import { ElMessage } from 'element-plus'
import { Warning, Refresh, Message } from '@element-plus/icons-vue'

// ===== 响应式状态 =====
const hasError = ref(false) // 是否发生错误
const errorMessage = ref('') // 错误消息
const errorDetails = ref('') // 错误详细信息

// ===== 错误捕获 =====
/**
 * 捕获子组件中的错误
 * 使用 Composition API 的错误捕获钩子
 */
onErrorCaptured((err, instance, info) => {
  console.error('ErrorBoundary捕获到错误:', err)
  console.error('错误组件实例:', instance)
  console.error('错误信息:', info)

  // 更新状态以显示错误界面
  hasError.value = true
  errorMessage.value = err.message || '未知错误'
  errorDetails.value = `错误: ${err.stack}\n组件信息: ${info}`

  // 阻止错误继续向上传播
  return false
})

// ===== 错误处理方法 =====
/**
 * 重试功能 - 重置错误状态，重新渲染子组件
 */
function retry() {
  hasError.value = false
  errorMessage.value = ''
  errorDetails.value = ''
}

/**
 * 报告错误功能 - 收集错误信息并进行上报
 */
function reportError() {
  const errorReport = {
    message: errorMessage.value,
    details: errorDetails.value,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  }

  console.log('错误报告:', errorReport)
  ElMessage.info('错误报告已记录到控制台')
  
  // TODO: 在实际项目中，这里可以发送错误报告到监控服务
  // 例如：sendErrorReport(errorReport)
}
</script>

<style scoped>
/* ===== 错误边界容器 ===== */
.error-boundary {
  width: 100%;
  height: 100%;
}

/* ===== 错误显示界面 ===== */
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

/* ===== 错误图标样式 ===== */
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

/* ===== 错误信息样式 ===== */
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

/* ===== 操作按钮样式 ===== */
.error-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.error-actions .el-button .el-icon {
  margin-right: 8px;
}

/* ===== 错误详情样式 ===== */
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

/* ===== 响应式样式 ===== */
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
