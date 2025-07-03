<div align="center">

  <h1 align="center">Blueprint AI</h1>

  <p align="center">
    <strong>您的视觉驱动开发副驾</strong>
    <br />
    一个开源的 AI 工具，能将任何 UI 视觉稿（图片、设计文件）瞬间转化为结构清晰、可执行的前端开发蓝图。
  </p>
  
  <p align="center">
    <a href="https://github.com/moyunzero/blueprint-ai-vue/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/moyunzero/blueprint-ai-vue?style=flat-square" alt="License">
    </a>
    <a href="https://github.com/moyunzero/blueprint-ai-vue/issues">
      <img src="https://img.shields.io/github/issues/moyunzero/blueprint-ai-vue?style=flat-square" alt="GitHub issues">
    </a>
    <a href="https://github.com/moyunzero/blueprint-ai-vue/stargazers">
      <img src="https://img.shields.io/github/stars/moyunzero/blueprint-ai-vue?style=flat-square" alt="GitHub stars">
    </a>
    <a href="https://github.com/moyunzero/blueprint-ai-vue/network/members">
      <img src="https://img.shields.io/github/forks/moyunzero/blueprint-ai-vue?style=flat-square" alt="GitHub forks">
    </a>
    <a href="#">
      <img src="https://img.shields.io/badge/vue.js-3.x-green?style=flat-square" alt="Vue.js">
    </a>
    <a href="#">
      <img src="https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat-square" alt="Contributions welcome">
    </a>
    <a href="https://github.com/moyunzero/blueprint-ai-vue/releases">
      <img src="https://img.shields.io/github/v/release/moyunzero/blueprint-ai-vue?style=flat-square" alt="Latest Release">
    </a>
    <a href="https://github.com/moyunzero/blueprint-ai-vue/commits/main">
      <img src="https://img.shields.io/github/last-commit/moyunzero/blueprint-ai-vue?style=flat-square" alt="Last Commit">
    </a>
    <a href="https://github.com/moyunzero/blueprint-ai-vue">
      <img src="https://img.shields.io/github/languages/top/moyunzero/blueprint-ai-vue?style=flat-square" alt="Top Language">
    </a>
  </p>
</div>

---

**Blueprint AI** 不仅仅是又一个 "image-to-code" 工具。它的核心哲学是 **增强而非取代** 开发者。我们相信，最好的 AI 协作模式是让 AI 处理繁琐的视觉分析和文档撰写工作，生成一份高质量的、机器和人都易于理解的开发蓝图（Blueprint），然后让开发者在此基础上进行创造性的编码工作。

这个项目旨在弥合设计师与开发者之间的鸿沟，将模糊的视觉需求转化为精确、可执行的任务清单。

## ✨ 核心特性

- **🤖 智能视觉分析**: 上传任何 UI 图片（JPG, PNG, WebP...），AI 会自动识别布局、组件、颜色、字体和样式，并将其结构化。

- **📝 高质量蓝图生成**: 一键生成以 Markdown 格式呈现的开发蓝图，内容包括组件层级、属性定义和实现建议，专为开发者设计。

- **💬 对话式迭代优化**:
    - 通过自然语言对话，对生成的蓝图进行微调和重构。
    - **上传上下文**: 可在对话中上传 API 文档 (`.json`) 或技术文档 (`.txt`, `.md`)，AI 会自动吸收信息，完善蓝图中的数据结构和交互逻辑。
    - **注入技术方案**: 直接提供您的技术细节（组件名、字段定义等），AI 会遵从您的指令，并将其无缝融合到蓝图中。

- **✅ AI 驱动的蓝图校验**: 内置一个 AI "Linter"，可以自动审查生成的蓝图，检查其结构完整性、内容清晰度和可执行性，并提供优化建议。

- **🕰️ 版本历史与差异对比**:
    - 自动保存蓝图的每一个版本（初始生成、每次优化后）。
    - 提供直观的 **Diff Viewer**，清晰地对比任意两个版本之间的差异，让您的决策过程有迹可循。

- **💾 会话管理**: 完整的工作区（包括原始图片、设置、所有历史版本、聊天记录）可以一键保存到本地 `.json` 文件，随时加载，无缝继续工作。

- **🧩 Prompt 模板引擎**: 创建、管理和使用您自己的系统级 Prompt 模板，以标准化、定制化 AI 的输出，满足团队或项目的特定规范。

## 🚀 快速开始

### 1. 环境要求
- Node.js `v16.0` 或更高版本
- `npm`, `yarn` 或 `pnpm`

### 2. 克隆与安装

```bash
# 克隆仓库
git clone https://github.com/moyunzero/blueprint-ai-vue.git

# 进入目录
cd blueprint-ai-vue

# 安装依赖
npm install
```

### 3. 配置环境

项目通过环境变量来管理敏感的 API 密钥。

```bash
# 复制环境文件模板
cp .env.example .env.local
```

然后，编辑新建的 `.env.local` 文件，填入您的 AI 服务提供商的密钥和基础 URL。本项目兼容所有与 OpenAI API 格式兼容的服务（如 OpenRouter, Groq, etc.）。

```env
# .env.local

# --- API 代理配置 ---
# Vercel Edge Function 会使用这个密钥，它不会暴露在前端
AI_PROXY_API_KEY="YOUR_API_KEY_HERE"

# 代理的目标 URL，前端会将请求发送到这个地址
AI_PROXY_TARGET_BASE_URL="https://openrouter.ai/api/v1"

# --- 蓝图生成与优化共享配置 ---
# 前端现在将请求发送到自己的相对路径 /api/proxy
VUE_APP_API_PROXY_PATH="/api/proxy"
VUE_APP_INITIAL_GEN_MODEL="gpt-4.1"
VUE_APP_INITIAL_GEN_MAX_TOKENS="20000"
VUE_APP_REFINEMENT_MODEL="gpt-4.1"

# --- 会话管理配置 ---
# 设置为 'true' 可禁用自动保存功能，每次重启应用将不会恢复之前的会话
# VUE_APP_DISABLE_AUTO_SAVE="false"
```

### 4. 运行应用

```bash
# 启动开发服务器
npm run dev
```

打开浏览器访问 `http://localhost:5173` (或 Vite 指定的其他端口)。

## 🛠️ 技术栈与架构理念

我们选择了一套现代化且高效的技术栈，以确保最佳的开发体验和性能。

- **前端**: **Vue 3** (Composition API) + **Vite** — 提供闪电般的启动速度和热更新，以及极佳的 TypeScript 支持。
- **状态管理**: **Pinia** — Vue 官方推荐的状态管理库，轻量、直观且类型安全。
- **UI & 图标**: **Element Plus** — 成熟、可靠的企业级 UI 组件库。
- **AI 交互**: **OpenAI SDK v4** — 官方最新的 SDK，原生支持流式（Streaming）响应，带来流畅的 "打字机" 体验。

### 架构亮点

项目的核心逻辑被清晰地划分在以下几个模块中，体现了关注点分离的设计原则：

- **`src/stores`**: 应用的 **中枢神经系统**。使用 Pinia 管理所有核心状态，如会话数据 (`sessionStore`)、模板 (`promptTemplateStore`) 和校验结果 (`promptValidationStore`)。所有核心业务逻辑都由 Store 的 Actions 驱动。

- **`src/prompts`**: 应用的 **“灵魂”**。这里存放着精心设计的系统级 Prompt 指令。这些 Prompt 是整个应用能够生成高质量、结构化输出的关键，是 Prompt Engineering 的核心实践区。

- **`src/services` & `src/lib`**: **服务调用层**。`services` 封装了对外的业务功能（如 `generateInitialPrompt`），而 `lib` 则处理与 OpenAI SDK 的直接交互。这种分层使得更换底层 AI 服务或调整业务逻辑变得简单。

- **`src/utils`**: **强大的工具集**。提供了文件处理（Base64 转换、设计文件解析）、错误处理、文件校验和应用健康检查等一系列可复用的工具函数。

## 🛣️ 未来路线图

我们对 Blueprint AI 有着长远的规划，欢迎社区成员一同参与实现：

- [ ] **增强设计文件支持**: 深度集成 Figma API，直接从设计文件中提取图层、样式和原型信息。
- [ ] **代码生成能力**: 在生成蓝图的基础上，提供一键生成对应前端框架（Vue/React）代码的实验性功能。
- [ ] **团队协作**: 引入简单的云端同步功能，支持团队成员共享会话和 Prompt 模板。
- [ ] **插件系统**: 允许开发者为特定的技术栈（如 Nuxt, Next.js）或代码规范编写自定义的 Prompt 插件。
- [ ] **更智能的校验**: 引入更复杂的校验规则，例如检查蓝图与 API 文档的一致性。

## 🤝 如何贡献

我们热烈欢迎各种形式的贡献！无论是提交 Issue、发起 Pull Request，还是改进文档，都是对社区的宝贵支持。

在开始之前，请查阅我们的贡献指南（待创建 `CONTRIBUTING.md`）。

1.  **Fork** 本仓库
2.  创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3.  提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4.  推送到分支 (`git push origin feature/AmazingFeature`)
5.  发起一个 **Pull Request**

## 📄 许可证

本项目基于 **MIT License**。详情请见 `LICENSE` 文件。

## 🌟 支持项目

如果这个项目对你有帮助，请考虑：

- ⭐ 给项目点个星星
- 🐛 [报告问题](https://github.com/moyunzero/blueprint-ai-vue/issues)
- 💡 [提出功能建议](https://github.com/moyunzero/blueprint-ai-vue/issues)
- 🔄 分享给你的朋友和同事
- 📝 写一篇博客介绍这个工具

---
<div align="center">
  <p>Made with ❤️ by the open-source community</p>
  <p>
    <a href="https://github.com/moyunzero/blueprint-ai-vue/stargazers">⭐ Star us on GitHub</a> •
    <a href="https://github.com/moyunzero/blueprint-ai-vue/issues">🐛 Report Bug</a> •
    <a href="https://github.com/moyunzero/blueprint-ai-vue/issues">💡 Request Feature</a>
  </p>
</div>