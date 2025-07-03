# Blueprint AI - 视觉驱动的开发加速器

从设计稿到开发蓝图，一步到位。Blueprint AI 将您的 UI 视觉稿瞬间转化为结构清晰、可执行的前端开发任务。

## ✨ 特性

- 🎨 **智能设计解析**: 上传 UI 设计稿，AI 自动识别组件结构和布局
- 🛠️ **开发蓝图生成**: 生成详细的前端开发实现指南
- 📝 **Prompt 模板管理**: 自定义和管理 AI 提示词模板
- 💬 **交互式优化**: 通过对话进一步优化生成的开发蓝图
- 📚 **历史版本管理**: 保存和管理不同版本的蓝图
- 💾 **会话保存**: 保存和加载完整的工作会话

## 🚀 快速开始

### 环境要求

- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 🔧 配置

1. 复制 `.env.example` 为 `.env`
2. 配置您的 AI API 密钥（如 OpenAI、Gemini 等）
3. 根据需要调整其他配置项

## 📖 使用指南

1. **上传设计稿**: 拖拽或点击上传您的 UI 设计图片
2. **配置参数**: 选择应用类型、组件库等生成参数
3. **生成蓝图**: 点击"生成蓝图"按钮，AI 将分析设计并生成开发指南
4. **优化调整**: 使用对话功能进一步优化生成的蓝图
5. **保存会话**: 保存当前工作会话以便后续继续

## 🛠️ 技术栈

- **前端框架**: Vue 3 + Vite
- **UI 组件库**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **样式**: CSS Variables + 响应式设计
- **AI 集成**: OpenAI API / Gemini API

## 📁 项目结构

```
src/
├── components/          # 可复用组件
├── views/              # 页面组件
├── stores/             # Pinia 状态管理
├── router/             # 路由配置
├── services/           # API 服务
├── utils/              # 工具函数
├── config/             # 配置文件
└── assets/             # 静态资源
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进项目！

## 📄 许可证

MIT License
