<template>
  <!-- 404 页面主容器 -->
  <div class="not-found">
    <!-- 错误信息卡片 -->
    <el-card class="error-card">
      <div class="error-content">
        <!-- 警告图标 -->
        <div class="error-icon">
          <el-icon><WarningFilled /></el-icon>
        </div>
        <!-- 404 标题 -->
        <h1 class="error-title">404</h1>
        <!-- 副标题 -->
        <h2 class="error-subtitle">页面未找到</h2>
        <!-- 错误描述 -->
        <p class="error-description">
          抱歉，您访问的页面不存在或已被移除。
        </p>
        <!-- 操作按钮：返回首页/返回上页 -->
        <div class="error-actions">
          <el-button type="primary" @click="goHome">
            <el-icon><House /></el-icon>
            返回首页
          </el-button>
          <el-button @click="goBack">
            <el-icon><Back /></el-icon>
            返回上页
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
// 引入 vue-router 的 useRouter 钩子
import { useRouter } from 'vue-router';
// 引入 Element Plus 所需图标
import { WarningFilled, House, Back } from '@element-plus/icons-vue';

// 获取路由实例
const router = useRouter();

// 跳转到首页
const goHome = () => {
  router.push('/');
};

// 返回上一页，若无历史则回首页
const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1);
  } else {
    router.push('/');
  }
};
</script>

<style scoped>
/* 404 页面主容器样式 */
.not-found {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 120px);
  padding: 20px;
}

/* 错误信息卡片样式 */
.error-card {
  max-width: 500px;
  width: 100%;
  text-align: center;
}

/* 错误内容区域样式 */
.error-content {
  padding: 40px 20px;
}

/* 警告图标样式 */
.error-icon {
  font-size: 80px;
  color: var(--color-accent);
  margin-bottom: 20px;
}

/* el-icon 组件样式适配 */
.error-icon .el-icon {
  width: 1em;
  height: 1em;
  font-size: inherit;
}

/* 404 标题样式 */
.error-title {
  font-size: 72px;
  font-weight: bold;
  color: var(--color-text-primary);
  margin: 0 0 10px 0;
  line-height: 1;
}

/* 副标题样式 */
.error-subtitle {
  font-size: 24px;
  color: var(--color-primary);
  margin: 0 0 20px 0;
  font-weight: normal;
}

/* 错误描述样式 */
.error-description {
  font-size: 16px;
  color: var(--color-text-secondary);
  margin: 0 0 40px 0;
  line-height: 1.6;
}

/* 操作按钮区域样式 */
.error-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

/* 按钮内图标间距 */
.error-actions .el-button .el-icon {
  margin-right: 8px;
}

/* 响应式样式：移动端适配 */
@media (max-width: 768px) {
  .error-title {
    font-size: 48px;
  }

  .error-subtitle {
    font-size: 20px;
  }

  .error-actions {
    flex-direction: column;
    align-items: center;
  }

  .error-actions .el-button {
    width: 200px;
  }
}
</style>
