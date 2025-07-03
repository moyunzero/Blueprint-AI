<script setup>
import { onMounted } from 'vue';
import { ElMessage } from 'element-plus'; // 直接导入以备用

// 检查关键依赖是否正常
function checkDependencies() {
  const dependencies = [
    { name: 'Element Plus', check: () => ElMessage },
  ];

  dependencies.forEach(dep => {
    try {
      if (!dep.check()) {
        console.warn(`${dep.name} 未正确加载`);
      }
    } catch (e) {
      console.warn(`${dep.name} 加载检查失败:`, e);
    }
  });
}

onMounted(() => {
  checkDependencies();
});
</script>

<template>
  <div id="app-container">
    <el-container>
      <el-header class="header" role="banner">
        <div class="header-content">
          <h1 class="logo" role="heading" aria-level="1">Blueprint AI</h1>
        </div>
      </el-header>
      <el-main role="main">
        <router-view></router-view>
      </el-main>
    </el-container>
  </div>
</template>

<style>
/* --- Professional Light Theme CSS Variables --- */
:root {
  /* --- Colors --- */
  --color-primary: #4F46E5; /* Strong Indigo for better contrast */
  --color-primary-rgb: 79, 70, 229;
  --color-primary-light: #6366F1;
  --color-primary-glow: rgba(var(--color-primary-rgb), 0.15);

  --color-accent: #0891B2; /* Darker cyan for better readability */
  --color-accent-rgb: 8, 145, 178;
  --color-accent-glow: rgba(var(--color-accent-rgb), 0.2);

  --color-bg-dark: #F8FAFC; /* Very light gray background */
  --color-bg-medium: #FFFFFF; /* Pure white for surfaces */
  --color-bg-light: #E2E8F0; /* Light gray for borders */
  --color-surface: rgba(255, 255, 255, 0.95); /* Semi-transparent white surface */

  --color-text-primary: #1E293B; /* Dark slate for primary text */
  --color-text-secondary: #475569; /* Medium gray for secondary text */
  --color-text-tertiary: #94A3B8; /* Light gray for hints and disabled states */

  --color-border: rgba(var(--color-primary-rgb), 0.2);
  --color-border-hover: rgba(var(--color-primary-rgb), 0.4);
  --color-border-focus: var(--color-primary);

  /* --- Effects --- */
  --shadow-glow-primary: 0 0 20px var(--color-primary-glow);
  --shadow-glow-accent: 0 0 20px var(--color-accent-glow);
  --text-shadow-primary: 0 0 8px var(--color-primary-glow);
  --shadow-card: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-card-hover: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.08);

  /* --- Fonts --- */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  --font-size-xl: 24px;

  /* --- Layout & Spacing --- */
  --header-height: 60px;
  --border-radius: 8px;
  --border-radius-lg: 12px;
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-md: 16px;
  --spacing-lg: 20px;
  --spacing-xl: 24px;

  /* --- Animation --- */
  --transition-fast: 0.2s ease;
  --transition-base: 0.3s ease-out;
}

/* --- Global Styles --- */
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

#app-container, #app { /* 兼容旧的 #app 和 Vite 的默认 #app */
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.el-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* --- Header --- */
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

/* --- Main Content --- */
.el-main {
  margin-top: var(--header-height);
  padding: 0;
  flex-grow: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* --- Element Plus Component Overrides --- */
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

/* --- Scrollbar --- */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--color-bg-dark); }
::-webkit-scrollbar-thumb {
  background: var(--color-bg-light);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }


</style>
