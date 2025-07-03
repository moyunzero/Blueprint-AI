import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import healthChecker from './utils/healthCheck'

const app = createApp(App)

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue全局错误:', err)
  console.error('错误信息:', info)
  console.error('组件实例:', instance)

  // 在Vue 3中，我们不能轻易地从instance获取$message
  // 更可靠的方式是在需要的地方注入或使用全局的ElMessage
  // 作为备用方案，我们可以在这里直接调用
  if (app.config.globalProperties.$message) {
    app.config.globalProperties.$message.error('页面出现异常，请刷新重试')
  } else {
    // 如果无法显示Element Plus消息，使用原生alert
    alert('页面出现异常，请刷新重试')
  }
}

// 捕获未处理的Promise错误
window.addEventListener('unhandledrejection', event => {
  console.error('未处理的Promise错误:', event.reason)
  event.preventDefault()

  if (app.config.globalProperties.$message) {
    app.config.globalProperties.$message.error('网络请求异常，请检查网络连接')
  }
})

// 捕获全局JavaScript错误
window.addEventListener('error', event => {
  console.error('全局JavaScript错误:', event.error)
  console.error('错误文件:', event.filename)
  console.error('错误行号:', event.lineno)
})

app.mount('#app')


// 应用启动后进行健康检查
setTimeout(() => {
  healthChecker.runAllChecks().then(results => {
    const summary = healthChecker.getSummary(results)
    console.log('应用健康检查结果:', summary)

    if (summary.overallStatus === 'unhealthy') {
      console.warn('检测到应用健康问题:', results.filter(r => r.status !== 'healthy'))
    }
  }).catch(error => {
    console.error('健康检查失败:', error)
  })
}, 1000)

// 在开发环境下启动定期健康检查
if (import.meta.env.DEV) {
  healthChecker.startPeriodicCheck(60000, (results) => {
    const summary = healthChecker.getSummary(results)
    if (summary.overallStatus === 'unhealthy') {
      console.warn('定期健康检查发现问题:', results.filter(r => r.status !== 'healthy'))
    }
  })
}
