# SooKool Assistant

智能开发助手 - 自动整合 Git 提交记录并通过 AI 生成工作报告

## 功能特性

- 🔗 支持本地 Git 仓库导入
- 📊 可视化展示提交记录和代码统计
- 🤖 AI 驱动的报告生成（支持 OpenAI/Claude/DeepSeek/Ollama）
- 📝 内置多种报告模版（日报、周报）
- 🎨 Neo-Glassmorphism 设计风格，支持暗黑/亮色主题自动切换
- 📤 支持导出 Markdown 文件

## 技术栈

- **框架**: Electron + React 18 + TypeScript
- **构建工具**: Electron-Vite
- **UI**: Tailwind CSS + Radix UI
- **状态管理**: Zustand
- **Git 操作**: Simple-git
- **测试**: Vitest

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 类型检查
npm run typecheck

# 构建应用
npm run build
```

## 使用说明

1. 启动应用后，点击侧边栏的「项目库」图标
2. 点击「添加本地仓库」选择包含 .git 的文件夹
3. 点击「刷新提交」获取最近的提交记录
4. 返回「仪表盘」查看提交统计
5. 在右侧「生成编辑器」中选择提交并生成报告
6. 可以编辑生成的内容，然后复制或导出

## 许可证

MIT
