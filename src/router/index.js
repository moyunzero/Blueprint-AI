import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../views/Home.vue'
import { ElMessage } from 'element-plus'

// ==================== 路由表定义 ====================
const routes = [
  {
    path: '/',
    name: 'HomePage',
    component: HomePage,
    meta: {
      title: 'Blueprint AI - 视觉驱动的开发加速器'
    }
  },
  // 404页面处理，通配符匹配所有未定义路由
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue').catch(() => {
      // NotFound 组件加载失败时的兜底渲染
      return {
        template: '<div style="text-align: center; padding: 50px;"><h2>页面未找到</h2><p>请检查URL是否正确</p></div>'
      }
    })
  }
]

// ==================== 路由实例创建 ====================
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

// ==================== 路由前置守卫 ====================
/**
 * 路由跳转前处理：
 * - 设置页面标题
 * - 404自动交由通配符路由处理
 */
router.beforeEach((to, from, next) => {
  try {
    // 设置页面标题（如有）
    if (to.meta && to.meta.title) {
      document.title = to.meta.title
    }
    // Vue Router 4 已自动处理 404，无需手动跳转
    if (to.matched.length === 0) {
      console.warn('路由不存在:', to.path)
    }
    next()
  } catch (error) {
    console.error('路由守卫错误:', error)
    next(false) // 阻止路由跳转
  }
})

// ==================== 路由错误处理 ====================
/**
 * 全局路由错误处理，弹出消息提示
 */
router.onError((error) => {
  console.error('路由错误:', error)
  ElMessage.error('页面加载失败，请刷新重试')
})

export default router
