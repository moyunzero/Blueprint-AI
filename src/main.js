/**
 * Blueprint AI - 主应用入口文件
 * 
 * 功能说明：
 * - 初始化Vue 3应用实例
 * - 配置全局插件和组件
 * - 设置全局错误处理机制
 * - 启动应用健康检查系统
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import healthChecker from './utils/healthCheck'
import { setupAutoSave } from './stores/sessionStore'

// ==================== 应用初始化 ====================

const app = createApp(App)

// 批量注册 Element Plus 图标组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 创建 Pinia 实例并设置自动保存
const pinia = createPinia()
setupAutoSave(pinia)

// 注册全局插件
app.use(pinia)          // 状态管理
app.use(router)         // 路由管理
app.use(ElementPlus)    // UI组件库

// ==================== 全局错误处理 ====================

/**
 * Vue组件错误处理器
 * 捕获组件渲染和生命周期中的错误
 */
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue组件错误:', err)
  console.error('错误上下文:', info)
  console.error('组件实例:', instance)

  // 显示用户友好的错误提示
  if (app.config.globalProperties.$message) {
    app.config.globalProperties.$message.error('页面出现异常，请刷新重试')
  } else {
    alert('页面出现异常，请刷新重试')
  }
}

/**
 * 未处理的Promise错误捕获
 * 主要用于捕获异步操作中的错误
 */
window.addEventListener('unhandledrejection', event => {
  console.error('未处理的Promise错误:', event.reason)
  event.preventDefault()

  if (app.config.globalProperties.$message) {
    app.config.globalProperties.$message.error('网络请求异常，请检查网络连接')
  }
})

/**
 * 全局JavaScript运行时错误捕获
 * 捕获同步代码执行中的错误
 */
window.addEventListener('error', event => {
  console.error('全局JavaScript错误:', {
    error: event.error,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  })
})

// ==================== 应用启动 ====================

app.mount('#app')

// ==================== 健康检查系统 ====================

/**
 * 应用启动后执行一次性健康检查
 * 检查关键功能是否正常工作
 */
setTimeout(async () => {
  try {
    const results = await healthChecker.runAllChecks()
    const summary = healthChecker.getSummary(results)
    
    console.log('应用健康检查结果:', summary)
    
    if (summary.overallStatus === 'unhealthy') {
      const unhealthyChecks = results.filter(r => r.status !== 'healthy')
      console.warn('检测到应用健康问题:', unhealthyChecks)
    }
  } catch (error) {
    console.error('健康检查失败:', error)
  }
}, 1000)

/**
 * 开发环境下启动定期健康检查
 * 每分钟检查一次应用状态
 */
if (import.meta.env.DEV) {
  healthChecker.startPeriodicCheck(60000, (results) => {
    const summary = healthChecker.getSummary(results)
    if (summary.overallStatus === 'unhealthy') {
      const unhealthyChecks = results.filter(r => r.status !== 'healthy')
      console.warn('定期健康检查发现问题:', unhealthyChecks)
    }
  })
}
