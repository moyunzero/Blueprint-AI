import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env': env
    },
    server: {
      proxy: {
        '/chat/completions': {
          target: env.AI_PROXY_TARGET_BASE_URL || 'https://aigc.sankuai.com/v1/openai/native',
          changeOrigin: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // 添加认证头
              proxyReq.setHeader('Authorization', `Bearer ${env.AI_PROXY_API_KEY}`);
              proxyReq.setHeader('Content-Type', 'application/json');
            });
          }
        }
      }
    }
  }
})
