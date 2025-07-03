/**
 * healthCheck.js - 应用健康检查工具
 *
 * 用途：
 * - 监控应用关键功能的运行状态
 * - 支持自定义检查项、超时、定期检查、健康摘要
 */

// ==================== 健康检查器类 ====================

class HealthChecker {
  constructor() {
    /** @type {Map<string, Object>} 检查项映射表，key为检查名，value为{checkFn, timeout} */
    this.checks = new Map()
    /** @type {boolean} 定期检查运行状态 */
    this.isRunning = false
    /** @type {number|null} 定期检查定时器ID */
    this.checkInterval = null
  }

  // ==================== 检查项管理 ====================

  /**
   * 添加健康检查项
   * @param {string} name - 检查项名称
   * @param {Function} checkFn - 检查函数，返回Promise<boolean>
   * @param {number} timeout - 超时时间（毫秒），默认5秒
   */
  addCheck(name, checkFn, timeout = 5000) {
    this.checks.set(name, { checkFn, timeout })
  }

  // ==================== 检查执行 ====================

  /**
   * 执行单个健康检查
   * @param {string} name - 检查项名称
   * @returns {Promise<{name: string, status: 'healthy'|'unhealthy'|'timeout', error?: string}>}
   */
  async runSingleCheck(name) {
    const check = this.checks.get(name)
    if (!check) {
      return { name, status: 'unhealthy', error: '检查项不存在' }
    }
    try {
      // 超时Promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('检查超时')), check.timeout)
      })
      // 检查函数与超时竞争
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
   * @returns {Promise<Array>} 检查结果数组
   */
  async runAllChecks() {
    const results = []
    for (const [name] of this.checks) {
      const result = await this.runSingleCheck(name)
      results.push(result)
    }
    return results
  }

  // ==================== 定期检查管理 ====================

  /**
   * 启动定期健康检查
   * @param {number} interval - 检查间隔（毫秒），默认30秒
   * @param {Function} callback - 检查结果回调
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
        if (callback) callback(results)
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

  // ==================== 结果分析 ====================

  /**
   * 统计健康检查摘要
   * @param {Array} results - 检查结果数组
   * @returns {Object} 摘要统计对象 {total, healthy, unhealthy, timeout, overallStatus}
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

// ==================== 全局实例和默认检查项 ====================

/**
 * 全局健康检查器实例，自动注册常用检查项
 * 用法：
 *   import healthChecker from '@/utils/healthCheck'
 *   await healthChecker.runAllChecks()
 */
const healthChecker = new HealthChecker()

// 默认检查项：localStorage
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

// 默认检查项：console
healthChecker.addCheck('console', async () => {
  try {
    console.log('健康检查: console功能正常')
    return true
  } catch {
    return false
  }
})

// 默认检查项：fetch API
healthChecker.addCheck('fetch', async () => {
  try {
    return typeof fetch === 'function'
  } catch {
    return false
  }
})

// 默认检查项：Vue 应用实例
healthChecker.addCheck('vue', async () => {
  try {
    const appEl = document.getElementById('app')
    return !!(appEl && appEl.__vue_app__)
  } catch {
    return false
  }
})

export default healthChecker
