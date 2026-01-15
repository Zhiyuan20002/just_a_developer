<div align="center">
  <img src="resources/icon.png" alt="Just a Developer" width="120" />
  <h1>Just a Developer</h1>
  <p>智能开发助手 - 自动整合 Git 提交记录与笔记，通过 AI 生成日报/周报。</p>
  <p>
    <img src="https://img.shields.io/badge/Electron-47848F?logo=electron&logoColor=white" alt="Electron" />
    <img src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=0B1120" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38BDF8?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  </p>
</div>

## 功能特性

- 本地 Git 仓库管理，支持别名与项目描述
- 仪表盘按日期与作者筛选提交，统计增删行数
- 选择提交与笔记生成报告，支持一键复制与导出 Markdown
- AI 报告生成支持 OpenAI/Claude/DeepSeek/Ollama 及自定义兼容接口
- 模版中心支持日报/周报模版维护与写作示例训练
- 笔记中心提供日/周视图、周/月日历与 Markdown 编辑
- 设置中可配置模型、系统提示词与主题（亮色/暗色/跟随系统）

## 技术栈

- **框架**: Electron + React 19 + TypeScript
- **构建工具**: Electron-Vite
- **UI**: Tailwind CSS + Radix UI + HeroUI
- **状态管理**: Zustand
- **数据存储**: Electron Store + SQLite (better-sqlite3)
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

1. 进入「项目库」添加本地 Git 仓库，并填写别名与项目描述
2. 在「仪表盘」刷新提交记录，并按时间/作者筛选
3. 在「笔记」中按日或按周记录工作内容
4. 在「模版中心」维护日报/周报模版并补充写作示例
5. 回到「仪表盘」选择提交与笔记，在右侧生成器中生成报告
6. 对生成内容进行编辑后复制或导出 Markdown

## 发布流程

推荐使用 `release.sh` 自动检测平台并发布 Release：

```bash
./release.sh 0.0.2
```

脚本会自动完成：

- 校验 `CHANGELOG.md` 是否包含对应版本段落
- 更新 `package.json` 版本号
- 根据平台运行构建命令：
  - macOS：`npm run build:mac`
  - Windows：`npm run build:win`
  - Linux：`npm run build:linux`
- 上传构建产物到 GitHub Release

发布说明会从 `CHANGELOG.md` 中截取当前版本段落生成。

## 许可证

MIT
