# 创意发散应用

一个基于 React + TypeScript 的交互式思维导图应用，具有玻璃质感 UI，支持通过 Gemini API 智能生成关联词。

## 功能特性

- 🎨 **精美 UI**：黑黄配色 + 玻璃质感设计
- 🤖 **AI 驱动**：集成 Gemini API 智能生成关联词
- 🌳 **无限发散**：支持多层级创意发散
- 📝 **历史记录**：自动保存，随时恢复
- ✨ **流畅动画**：平滑过渡和加载效果

## 使用说明

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 使用方法

1. **首次使用**：在输入框中输入一个词语，按回车或点击箭头按钮
2. **设置 API Key**：首次点击节点时会提示输入 Gemini API Key
3. **发散创意**：
   - **左键点击**节点：调用 AI 生成 7-8 个关联词
   - **右键点击**节点：选中/取消选中（选中的节点变为黄色）
4. **连接词语**：
   - 有选中节点时输入新词 → 新词与选中词相连
   - 无选中节点时输入新词 → 作为新的独立中心词
5. **历史记录**：点击右上角"历史记录"查看和恢复之前的创意图

## 获取 Gemini API Key

访问 [Google AI Studio](https://makersuite.google.com/app/apikey) 获取免费的 API Key。

## 技术栈

- React 18
- TypeScript
- Vite
- Gemini API
- SVG Canvas
