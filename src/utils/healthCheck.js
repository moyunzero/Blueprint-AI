/**
 * 应用健康检查工具
 * 用于监控应用的关键功能是否正常工作
 */

class HealthChecker {
  constructor() {
    this.checks = new Map()
    this.isRunning = false
    this.checkInterval = null
  }

  /**
   * 添加健康检查项
   * @param {string} name 检查项名称
   * @param {Function} checkFn 检查函数，返回Promise<boolean>
   * @param {number} timeout 超时时间（毫秒）
   */
  addCheck(name, checkFn, timeout = 5000) {
    this.checks.set(name, { checkFn, timeout })
  }

  /**
   * 执行单个检查
   * @param {string} name 检查项名称
   * @returns {Promise<{name: string, status: 'healthy'|'unhealthy'|'timeout', error?: string}>}
   */
  async runSingleCheck(name) {
    const check = this.checks.get(name)
    if (!check) {
      return { name, status: 'unhealthy', error: '检查项不存在' }
    }

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('检查超时')), check.timeout)
      })

      const result = await Promise.race([
        check.checkFn(),
        timeoutPromise
      ])

      return {
        name,
        status: result ? 'healthy' : 'unhealthy',
        error: result ? undefined : '检查失败'
      }
    } catch (error) {
      return {
        name,
        status: error.message === '检查超时' ? 'timeout' : 'unhealthy',
        error: error.message
      }
    }
  }

  /**
   * 执行所有健康检查
   * @returns {Promise<Array>}
   */
  async runAllChecks() {
    const results = []
    for (const [name] of this.checks) {
      const result = await this.runSingleCheck(name)
      results.push(result)
    }
    return results
  }

  /**
   * 开始定期健康检查
   * @param {number} interval 检查间隔（毫秒）
   * @param {Function} callback 结果回调函数
   */
  startPeriodicCheck(interval = 30000, callback) {
    if (this.isRunning) {
      console.warn('健康检查已在运行中')
      return
    }

    this.isRunning = true
    this.checkInterval = setInterval(async () => {
      try {
        const results = await this.runAllChecks()
        if (callback) {
          callback(results)
        }
      } catch (error) {
        console.error('定期健康检查失败:', error)
      }
    }, interval)

    console.log('健康检查已启动，间隔:', interval, 'ms')
  }

  /**
   * 停止定期健康检查
   */
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.isRunning = false
    console.log('健康检查已停止')
  }

  /**
   * 获取健康检查摘要
   * @param {Array} results 检查结果
   * @returns {Object}
   */
  getSummary(results) {
    const summary = {
      total: results.length,
      healthy: 0,
      unhealthy: 0,
      timeout: 0,
      overallStatus: 'healthy'
    }

    results.forEach(result => {
      summary[result.status]++
    })

    if (summary.unhealthy > 0 || summary.timeout > 0) {
      summary.overallStatus = 'unhealthy'
    }

    return summary
  }
}

// 创建全局健康检查器实例
const healthChecker = new HealthChecker()

// 添加默认的健康检查项
healthChecker.addCheck('localStorage', async () => {
  try {
    const testKey = '__health_check_test__'
    localStorage.setItem(testKey, 'test')
    const value = localStorage.getItem(testKey)
    localStorage.removeItem(testKey)
    return value === 'test'
  } catch {
    return false
  }
})

healthChecker.addCheck('console', async () => {
  try {
    console.log('健康检查: console功能正常')
    return true
  } catch {
    return false
  }
})

healthChecker.addCheck('fetch', async () => {
  try {
    // 检查fetch API是否可用
    return typeof fetch === 'function'
  } catch {
    return false
  }
})

healthChecker.addCheck('vue', async () => {
  try {
    // 检查Vue 3应用实例是否已挂载到DOM上
    const appEl = document.getElementById('app');
    return !!(appEl && appEl.__vue_app__);
  } catch {
    return false
  }
})

export default healthChecker
