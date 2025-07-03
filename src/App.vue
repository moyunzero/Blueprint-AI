<script setup>
/**
 * App.vue - 应用根组件
 *
 * 主要职责：
 * - 提供全局布局（头部、主内容区）
 * - 检查关键依赖加载状态，提升健壮性
 * - 定义全局样式变量和主题，统一 UI 风格
 */

import { onMounted } from 'vue'
import { ElMessage } from 'element-plus'

// ==================== 依赖检查 ====================

/**
 * 检查关键依赖是否正常加载
 * 用于开发环境下的健壮性提示
 */
function checkDependencies() {
  const dependencies = [
    { name: 'Element Plus', check: () => ElMessage }
  ]

  dependencies.forEach(dep => {
    try {
      if (!dep.check()) {
        console.warn(`${dep.name} 未正确加载`)
      }
    } catch (error) {
      console.warn(`${dep.name} 加载检查失败:`, error)
    }
  })
}

// ==================== 生命周期 ====================

onMounted(() => {
  checkDependencies()
})
</script>

<template>
  <!-- 应用主容器，包含头部和主内容区 -->
  <div id="app-container">
    <el-container>
      <!-- 顶部导航栏 -->
      <el-header class="header" role="banner">
        <div class="header-content">
          <h1 class="logo" role="heading" aria-level="1">Blueprint AI</h1>
        </div>
      </el-header>
      <!-- 主内容区，渲染路由页面 -->
      <el-main role="main">
        <router-view></router-view>
      </el-main>
    </el-container>
  </div>
</template>

<style>
/*
  --- 全局主题变量与基础样式 ---
  说明：统一全局色彩、字体、布局、阴影、动画等，提升 UI 一致性和可维护性
*/
:root {
  /* --- 主题色 --- */
  --color-primary: #4F46E5; /* 主色：深靛蓝 */
  --color-primary-rgb: 79, 70, 229;
  --color-primary-light: #6366F1;
  --color-primary-glow: rgba(var(--color-primary-rgb), 0.15);

  --color-accent: #0891B2; /* 强调色：深青色 */
  --color-accent-rgb: 8, 145, 178;
  --color-accent-glow: rgba(var(--color-accent-rgb), 0.2);

  --color-bg-dark: #F8FAFC; /* 背景：极浅灰 */
  --color-bg-medium: #FFFFFF; /* 纯白表面 */
  --color-bg-light: #E2E8F0; /* 浅灰边框 */
  --color-surface: rgba(255, 255, 255, 0.95); /* 半透明白表面 */

  --color-text-primary: #1E293B; /* 主文本色：深石板灰 */
  --color-text-secondary: #475569; /* 次文本色 */
  --color-text-tertiary: #94A3B8; /* 辅助文本色 */

  --color-border: rgba(var(--color-primary-rgb), 0.2);
  --color-border-hover: rgba(var(--color-primary-rgb), 0.4);
  --color-border-focus: var(--color-primary);

  /* --- 阴影与特效 --- */
  --shadow-glow-primary: 0 0 20px var(--color-primary-glow);
  --shadow-glow-accent: 0 0 20px var(--color-accent-glow);
  --text-shadow-primary: 0 0 8px var(--color-primary-glow);
  --shadow-card: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-card-hover: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.08);

  /* --- 字体 --- */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  --font-size-xl: 24px;

  /* --- 布局与间距 --- */
  --header-height: 60px;
  --border-radius: 8px;
  --border-radius-lg: 12px;
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-md: 16px;
  --spacing-lg: 20px;
  --spacing-xl: 24px;

  /* --- 动画 --- */
  --transition-fast: 0.2s ease;
  --transition-base: 0.3s ease-out;
}

/* --- 全局基础样式 --- */
*, *::before, *::after { box-sizing: border-box; }

html { height: 100%; scroll-behavior: smooth; }

body {
  background-color: var(--color-bg-dark);
  background-image: 
    radial-gradient(circle at 25px 25px, rgba(var(--color-primary-rgb), 0.03) 1px, transparent 0),
    radial-gradient(circle at 75px 75px, rgba(var(--color-accent-rgb), 0.02) 1px, transparent 0);
  background-size: 100px 100px;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  font-family: var(--font-family);
  line-height: 1.6;
  color: var(--color-text-primary);
  font-weight: 500; /* 增加字体粗细 */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app-container, #app { /* 兼容 Vite 默认 #app 和旧版 #app */
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.el-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* --- 头部导航栏样式 --- */
.header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-bg-light);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: fixed;
  width: 100%;
  z-index: 1000;
  top: 0;
  height: var(--header-height);
}
.header-content {
  display: flex; justify-content: space-between; align-items: center;
  height: 100%; max-width: 1600px; margin: 0 auto; padding: 0 var(--spacing-xl);
}
.logo {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.5px;
  margin: 0;
}
.logo::first-letter {
  color: var(--color-primary);
  text-shadow: var(--text-shadow-primary);
}

/* --- 主内容区样式 --- */
.el-main {
  margin-top: var(--header-height);
  padding: 0;
  flex-grow: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* --- Element Plus 组件样式覆盖 --- */
.el-card {
  background: var(--color-surface) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: var(--border-radius-lg) !important;
  box-shadow: var(--shadow-card) !important;
  backdrop-filter: blur(10px) !important;
  transition: all var(--transition-base) !important;
}
.el-card:hover {
  transform: translateY(-3px) !important;
  box-shadow: var(--shadow-card-hover) !important;
  border-color: var(--color-border-hover) !important;
}
.el-card__header {
  background: rgba(var(--color-primary-rgb), 0.05) !important;
  border-bottom: 1px solid var(--color-border) !important;
  border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0 !important;
  padding: var(--spacing-lg) var(--spacing-xl) !important;
  font-weight: 600 !important;
  color: var(--color-text-primary) !important;
}
.el-card__body { padding: var(--spacing-xl) !important; }

.el-button {
  border-radius: var(--border-radius) !important;
  font-weight: 600 !important;
  transition: all var(--transition-base) !important;
  border: 1px solid transparent !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
}
.el-button--primary {
  background: var(--color-primary) !important;
  border-color: var(--color-primary) !important;
  color: #fff !important;
  font-weight: 700 !important;
  box-shadow: 0 4px 6px rgba(var(--color-primary-rgb), 0.2) !important;
}
.el-button--primary:hover, .el-button--primary:focus {
  transform: translateY(-2px) !important;
  box-shadow: 0 7px 14px rgba(var(--color-primary-rgb), 0.2), 0 3px 6px rgba(0,0,0,0.08) !important;
  background: var(--color-primary-light) !important;
  border-color: var(--color-primary-light) !important;
}
.el-button--default {
  background: var(--color-bg-light) !important;
  border: 1px solid var(--color-bg-light) !important;
  color: var(--color-text-secondary) !important;
}
.el-button--default:hover, .el-button--default:focus {
  border-color: var(--color-border-focus) !important;
  color: var(--color-primary) !important;
  background: var(--color-primary-glow) !important;
}

.el-input__wrapper, .el-textarea__inner {
  background-color: var(--color-bg-medium) !important;
  border: 1px solid var(--color-bg-light) !important;
  border-radius: var(--border-radius) !important;
  transition: all var(--transition-base) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
}
.el-input__inner { 
  color: var(--color-text-primary) !important; 
  font-weight: 500 !important;
}
.el-input.is-focus .el-input__wrapper,
.el-textarea.is-focus .el-textarea__inner {
  border-color: var(--color-border-focus) !important;
  box-shadow: 0 0 0 1px var(--color-border-focus) !important;
}

.el-select-dropdown {
  background: var(--color-bg-medium) !important;
  border: 1px solid var(--color-bg-light) !important;
  border-radius: var(--border-radius) !important;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08) !important;
}
.el-select-dropdown__item {
  color: var(--color-text-primary) !important;
  transition: all var(--transition-fast) !important;
  font-weight: 500 !important;
}
.el-select-dropdown__item:hover {
  background: var(--color-primary-glow) !important;
  color: var(--color-primary) !important;
}
.el-select-dropdown__item.is-selected {
  background: var(--color-primary-glow) !important;
  color: var(--color-primary) !important;
  font-weight: 600 !important;
}

.el-tooltip__popper {
  background: var(--color-bg-light) !important;
  color: var(--color-text-primary) !important;
  border: 1px solid var(--color-border) !important;
  font-weight: 500 !important;
}
.el-popper__arrow::before {
  background: var(--color-bg-light) !important;
  border-color: var(--color-border) !important;
}

.el-dialog {
  background: var(--color-bg-medium) !important;
  border: 1px solid var(--color-bg-light) !important;
  box-shadow: var(--shadow-glow-primary) !important;
}
.el-dialog__title {
  color: var(--color-text-primary) !important;
  font-weight: 600;
}
.el-dialog__header { border-bottom: 1px solid var(--color-bg-light); }
.el-dialog__body { color: var(--color-text-secondary); }

.el-message, .el-notification {
  background: var(--color-bg-medium) !important;
  border: 1px solid var(--color-bg-light) !important;
  color: var(--color-text-primary) !important;
}
.el-message .el-message__content { color: var(--color-text-primary) !important; }
.el-message__icon, .el-notification__icon { color: var(--color-primary) !important; }

.el-tabs__item {
  color: var(--color-text-secondary) !important;
  font-weight: 500 !important;
}
.el-tabs__item.is-active { color: var(--color-primary) !important; }
.el-tabs__active-bar { background-color: var(--color-primary) !important; }
.el-tabs__nav-wrap::after { background-color: var(--color-bg-light) !important; }

/* --- 滚动条美化 --- */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--color-bg-dark); }
::-webkit-scrollbar-thumb {
  background: var(--color-bg-light);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }

</style>
