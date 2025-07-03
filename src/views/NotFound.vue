<template>
  <div class="not-found">
    <el-card class="error-card">
      <div class="error-content">
        <div class="error-icon">
          <!-- Element Plus uses icon components -->
          <el-icon><WarningFilled /></el-icon>
        </div>
        <h1 class="error-title">404</h1>
        <h2 class="error-subtitle">页面未找到</h2>
        <p class="error-description">
          抱歉，您访问的页面不存在或已被移除。
        </p>
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
import { useRouter } from 'vue-router';
// Import required icons from Element Plus
import { WarningFilled, House, Back } from '@element-plus/icons-vue';

// Get the router instance using the new composition API hook
const router = useRouter();

// Methods from the old component are now just plain functions
const goHome = () => {
  router.push('/');
};

const goBack = () => {
  // window.history is still available
  if (window.history.length > 1) {
    router.go(-1);
  } else {
    router.push('/');
  }
};
</script>

<style scoped>
.not-found {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 120px);
  padding: 20px;
}

.error-card {
  max-width: 500px;
  width: 100%;
  text-align: center;
}

.error-content {
  padding: 40px 20px;
}

.error-icon {
  font-size: 80px;
  color: var(--color-accent);
  margin-bottom: 20px;
}

/* We need to style the el-icon component wrapper */
.error-icon .el-icon {
  width: 1em;
  height: 1em;
  font-size: inherit;
}

.error-title {
  font-size: 72px;
  font-weight: bold;
  color: var(--color-text-primary);
  margin: 0 0 10px 0;
  line-height: 1;
}

.error-subtitle {
  font-size: 24px;
  color: var(--color-primary);
  margin: 0 0 20px 0;
  font-weight: normal;
}

.error-description {
  font-size: 16px;
  color: var(--color-text-secondary);
  margin: 0 0 40px 0;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.error-actions .el-button .el-icon {
  margin-right: 8px;
}

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
