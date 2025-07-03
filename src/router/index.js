import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../views/Home.vue'
import { ElMessage } from 'element-plus'

const routes = [
  {
    path: '/',
    name: 'HomePage',
    component: HomePage,
    meta: {
      title: 'Blueprint AI - 视觉驱动的开发加速器'
    }
  },
  // 404页面处理
  {
    path: '/:pathMatch(.*)*', // Vue Router 4 的 404 路由语法
    name: 'NotFound',
    component: () => import('../views/NotFound.vue').catch(() => {
      // 如果NotFound组件加载失败，返回一个简单的组件
      return {
        template: '<div style="text-align: center; padding: 50px;"><h2>页面未找到</h2><p>请检查URL是否正确</p></div>'
      }
    })
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

// 路由前置守卫
router.beforeEach((to, from, next) => {
  try {
    // 设置页面标题
    if (to.meta && to.meta.title) {
      document.title = to.meta.title
    }

    // 在Vue Router 4中，检查路由是否存在的方式略有不同
    if (to.matched.length === 0) {
      console.warn('路由不存在:', to.path)
      // 在Vue Router 4中，我们已经在路由表中定义了通配符路由，所以不需要手动 next('/404')
      // 它会自动匹配到NotFound组件
    }

    next()
  } catch (error) {
    console.error('路由守卫错误:', error)
    next(false) // 阻止路由跳转
  }
})

// 路由错误处理
router.onError((error) => {
  console.error('路由错误:', error)
  ElMessage.error('页面加载失败，请刷新重试')
})

export default router
