import { app, shell, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron'
import { join, basename } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { simpleGit, SimpleGit } from 'simple-git'
import { readdirSync, statSync, unlinkSync, existsSync } from 'fs'
import { initDatabase, closeDatabase } from './database'
import { getAllRepositories, saveRepositories } from './database/repositories/repository'
import { getAllTemplates, saveTemplates } from './database/repositories/template'
import { getAllNotes, saveNotes } from './database/repositories/note'
import { getAllWritingExamples, saveWritingExamples } from './database/repositories/writing-example'
import {
  getSetting,
  setSetting,
  getSettingAsJson,
  setSettingAsJson
} from './database/repositories/settings'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 选择文件夹
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择 Git 仓库'
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const folderPath = result.filePaths[0]
  return {
    path: folderPath,
    name: basename(folderPath)
  }
})

// 获取 Git 提交记录
ipcMain.handle('get-commits', async (_event, repoPath: string, since?: string) => {
  try {
    const git: SimpleGit = simpleGit(repoPath)
    const isRepo = await git.checkIsRepo()

    if (!isRepo) {
      return { error: '不是有效的 Git 仓库' }
    }

    const logOptions: Record<string, string | number | undefined> = {
      '--max-count': 100
    }

    if (since) {
      logOptions['--since'] = since
    }

    const log = await git.log(logOptions)

    const commits = await Promise.all(
      log.all.map(async (commit) => {
        let additions = 0
        let deletions = 0
        let files: string[] = []

        try {
          const diff = await git.diffSummary([`${commit.hash}^`, commit.hash])
          additions = diff.insertions
          deletions = diff.deletions
          files = diff.files.map((f) => f.file)
        } catch {
          // 首次提交没有父提交
        }

        return {
          hash: commit.hash,
          message: commit.message,
          author: commit.author_name,
          date: new Date(commit.date),
          files,
          additions,
          deletions
        }
      })
    )

    return { commits }
  } catch (error) {
    return { error: String(error) }
  }
})

// 保存 API Key
ipcMain.handle('save-api-key', async (_event, { provider, key }) => {
  setSetting(`apiKeys_${provider}`, key)
  return { success: true }
})

// 获取 API Key
ipcMain.handle('get-api-key', async (_event, provider: string) => {
  return getSetting(`apiKeys_${provider}`)
})

// 获取模型列表
ipcMain.handle('get-models', async (_event, provider: string) => {
  try {
    const apiKey = getSetting(`apiKeys_${provider}`)

    // 根据不同供应商获取模型列表
    let baseUrl = ''
    switch (provider) {
      case 'openai':
        baseUrl = 'https://api.openai.com/v1/models'
        break
      case 'gemini':
        baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models'
        break
      case 'deepseek':
        baseUrl = 'https://api.deepseek.com/v1/models'
        break
      case 'siliconflow':
        baseUrl = 'https://api.siliconflow.cn/v1/models'
        break
      case 'zhipu':
        baseUrl = 'https://open.bigmodel.cn/api/paas/v4/models'
        break
      case 'openrouter':
        baseUrl = 'https://openrouter.ai/api/v1/models'
        break
      case 'ollama':
        baseUrl = 'http://localhost:11434/api/tags'
        break
      default: {
        // 检查是否是自定义供应商
        const customProviders =
          getSettingAsJson<Array<{ id: string; baseUrl: string; apiKey: string }>>(
            'customProviders'
          ) || []
        const custom = customProviders.find((p) => p.id === provider)
        if (custom) {
          // 智能补全模型列表 URL
          let customBaseUrl = custom.baseUrl.replace(/\/+$/, '')
          if (customBaseUrl.includes('/chat/completions')) {
            customBaseUrl = customBaseUrl.replace('/chat/completions', '/models')
          } else if (/\/v\d+$/.test(customBaseUrl)) {
            customBaseUrl = `${customBaseUrl}/models`
          } else if (/\/v\d+\//.test(customBaseUrl)) {
            customBaseUrl = `${customBaseUrl}/models`
          } else {
            customBaseUrl = `${customBaseUrl}/v1/models`
          }
          baseUrl = customBaseUrl
        }
      }
    }

    if (!baseUrl) {
      return { models: [] }
    }

    // Ollama 特殊处理
    if (provider === 'ollama') {
      const response = await fetch(baseUrl)
      const data = await response.json()
      return {
        models: (data.models || []).map((m: { name: string }) => ({
          id: m.name,
          name: m.name
        }))
      }
    }

    // Gemini 特殊处理
    if (provider === 'gemini') {
      const response = await fetch(`${baseUrl}?key=${apiKey}`)
      const data = await response.json()
      return {
        models: (data.models || [])
          .filter((m: { name: string }) => m.name.includes('gemini'))
          .map((m: { name: string; displayName?: string }) => ({
            id: m.name.replace('models/', ''),
            name: m.displayName || m.name.replace('models/', '')
          }))
      }
    }

    // OpenAI 兼容格式
    const response = await fetch(baseUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    return {
      models: (data.data || []).map((m: { id: string }) => ({
        id: m.id,
        name: m.id
      }))
    }
  } catch (error) {
    console.error('获取模型列表失败:', error)
    return { models: [], error: String(error) }
  }
})

// 保存自定义供应商
ipcMain.handle('save-custom-providers', async (_event, providers) => {
  setSettingAsJson('customProviders', providers)
  return { success: true }
})

// 获取自定义供应商
ipcMain.handle('get-custom-providers', async () => {
  return getSettingAsJson('customProviders') || []
})

// 保存选中的模型
ipcMain.handle('save-selected-model', async (_event, model: string) => {
  setSetting('selectedModel', model)
  return { success: true }
})

// 获取选中的模型
ipcMain.handle('get-selected-model', async () => {
  return getSetting('selectedModel')
})

// 保存仓库列表
ipcMain.handle('save-repositories', async (_event, repositories) => {
  saveRepositories(repositories)
  return { success: true }
})

// 获取仓库列表
ipcMain.handle('get-repositories', async () => {
  return getAllRepositories()
})

// 保存模版列表
ipcMain.handle('save-templates', async (_event, templates) => {
  saveTemplates(templates)
  return { success: true }
})

// 获取模版列表
ipcMain.handle('get-templates', async () => {
  return getAllTemplates()
})

// 保存选中的模版
ipcMain.handle('save-selected-template', async (_event, templateId: string) => {
  setSetting('selectedTemplate', templateId)
  return { success: true }
})

// 获取选中的模版
ipcMain.handle('get-selected-template', async () => {
  return getSetting('selectedTemplate')
})

// 保存当前供应商
ipcMain.handle('save-current-provider', async (_event, provider: string) => {
  setSetting('currentProvider', provider)
  return { success: true }
})

// 获取当前供应商
ipcMain.handle('get-current-provider', async () => {
  return getSetting('currentProvider') || 'openai'
})

// 保存写作示例
ipcMain.handle('save-writing-examples', async (_event, examples) => {
  saveWritingExamples(examples)
  return { success: true }
})

// 获取写作示例
ipcMain.handle('get-writing-examples', async () => {
  return getAllWritingExamples()
})

// 保存日期筛选与模版的关联
ipcMain.handle('save-filter-template-map', async (_event, map) => {
  setSettingAsJson('filterTemplateMap', map)
  return { success: true }
})

// 获取日期筛选与模版的关联
ipcMain.handle('get-filter-template-map', async () => {
  return getSettingAsJson('filterTemplateMap') || {}
})

// 保存选中的用户
ipcMain.handle('save-selected-author', async (_event, author: string | null) => {
  setSetting('selectedAuthor', author || '')
  return { success: true }
})

// 获取选中的用户
ipcMain.handle('get-selected-author', async () => {
  return getSetting('selectedAuthor') || null
})

// 保存系统提示词
ipcMain.handle('save-system-prompt', async (_event, prompt: string) => {
  setSetting('systemPrompt', prompt)
  return { success: true }
})

// 获取系统提示词
ipcMain.handle('get-system-prompt', async () => {
  return getSetting('systemPrompt') || null
})

// 保存笔记
ipcMain.handle('save-notes', async (_event, notes) => {
  saveNotes(notes)
  return { success: true }
})

// 获取笔记
ipcMain.handle('get-notes', async () => {
  return getAllNotes()
})

// 保存主题设置
ipcMain.handle('save-theme-mode', async (_event, mode) => {
  setSetting('themeMode', mode)
  return { success: true }
})

// 获取主题设置
ipcMain.handle('get-theme-mode', async () => {
  return getSetting('themeMode') || 'system'
})

// 保存 Git 用户名
ipcMain.handle('save-git-username', async (_event, username: string) => {
  setSetting('gitUsername', username)
  return { success: true }
})

// 获取 Git 用户名
ipcMain.handle('get-git-username', async () => {
  return getSetting('gitUsername') || null
})

// 用于存储当前流式生成的 reader，以便取消
let currentStreamReader: ReadableStreamDefaultReader<Uint8Array> | null = null
let isGenerationStopped = false

// 停止生成报告
ipcMain.on('stop-generate-report', (event) => {
  isGenerationStopped = true
  if (currentStreamReader) {
    currentStreamReader.cancel().catch(() => {})
    currentStreamReader = null
  }
  event.reply('generate-report-stopped')
})

// AI 流式生成报告
ipcMain.on(
  'generate-report-stream',
  async (
    event,
    {
      prompt,
      provider,
      model
    }: {
      prompt: string
      provider: string
      model: string
    }
  ) => {
    try {
      // 重置停止标志
      isGenerationStopped = false
      currentStreamReader = null

      console.log('=== 主进程：开始流式生成 ===')
      console.log('供应商:', provider)
      console.log('模型:', model)

      const apiKey = getSetting(`apiKeys_${provider}`)

      // 根据不同供应商调用 API
      let baseUrl = ''
      let actualApiKey = apiKey

      switch (provider) {
        case 'openai':
          baseUrl = 'https://api.openai.com/v1/chat/completions'
          break
        case 'deepseek':
          baseUrl = 'https://api.deepseek.com/v1/chat/completions'
          break
        case 'siliconflow':
          baseUrl = 'https://api.siliconflow.cn/v1/chat/completions'
          break
        case 'zhipu':
          baseUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
          break
        case 'openrouter':
          baseUrl = 'https://openrouter.ai/api/v1/chat/completions'
          break
        case 'gemini': {
          // Gemini 流式生成
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`
          const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          })

          if (!geminiResponse.body) {
            event.reply('generate-report-error', '无法获取响应流')
            return
          }

          const reader = geminiResponse.body.getReader()
          currentStreamReader = reader
          const decoder = new TextDecoder()

          while (true) {
            if (isGenerationStopped) break
            const { done, value } = await reader.read()
            if (done) break

            const text = decoder.decode(value)
            // Gemini 返回 JSON 数组格式
            try {
              const lines = text.split('\n').filter((line) => line.trim())
              for (const line of lines) {
                if (line.startsWith('[') || line.startsWith(',')) {
                  const jsonStr = line.startsWith(',') ? line.slice(1) : line.slice(1)
                  const parsed = JSON.parse(jsonStr.replace(/]$/, ''))
                  if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                    event.reply('generate-report-chunk', parsed.candidates[0].content.parts[0].text)
                  }
                }
              }
            } catch {
              // 解析失败，尝试直接提取文本
            }
          }
          currentStreamReader = null
          if (!isGenerationStopped) event.reply('generate-report-done')
          return
        }
        case 'ollama': {
          // Ollama 流式生成
          const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: model,
              prompt: prompt,
              stream: true
            })
          })

          if (!ollamaResponse.body) {
            event.reply('generate-report-error', '无法获取响应流')
            return
          }

          const reader = ollamaResponse.body.getReader()
          currentStreamReader = reader
          const decoder = new TextDecoder()

          while (true) {
            if (isGenerationStopped) break
            const { done, value } = await reader.read()
            if (done) break

            const text = decoder.decode(value)
            const lines = text.split('\n').filter((line) => line.trim())
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line)
                if (parsed.response) {
                  event.reply('generate-report-chunk', parsed.response)
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
          currentStreamReader = null
          if (!isGenerationStopped) event.reply('generate-report-done')
          return
        }
        default: {
          // 检查是否是自定义供应商
          const customProviders =
            getSettingAsJson<Array<{ id: string; baseUrl: string; apiKey: string }>>(
              'customProviders'
            ) || []
          const custom = customProviders.find((p) => p.id === provider)
          if (custom) {
            baseUrl = `${custom.baseUrl}/chat/completions`
            actualApiKey = custom.apiKey || apiKey
          }
        }
      }

      if (!baseUrl) {
        event.reply('generate-report-error', '未知的 AI 供应商')
        return
      }

      console.log('请求 URL:', baseUrl)
      console.log('使用模型:', model)

      // OpenAI 兼容格式的流式 API 调用
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${actualApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          stream: true
        })
      })

      console.log('响应状态:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API 错误响应:', errorText)
        event.reply('generate-report-error', `API 错误: ${response.status} - ${errorText}`)
        return
      }

      if (!response.body) {
        event.reply('generate-report-error', '无法获取响应流')
        return
      }

      const reader = response.body.getReader()
      currentStreamReader = reader
      const decoder = new TextDecoder()

      // 处理单行 SSE 数据的函数
      const processLine = (line: string): void => {
        const trimmedLine = line.trim()
        if (!trimmedLine) return
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6)
          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              console.log('收到内容片段:', content.substring(0, 20) + '...')
              event.reply('generate-report-chunk', content)
            }
          } catch {
            console.log('JSON 解析失败，原始数据:', data.substring(0, 100))
          }
        }
      }

      let buffer = ''

      while (true) {
        if (isGenerationStopped) break
        const { done, value } = await reader.read()
        if (done) {
          console.log('流读取完成')
          break
        }

        const text = decoder.decode(value, { stream: true })
        console.log('收到原始数据长度:', text.length)
        buffer += text

        // 按行分割处理
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留最后一个可能不完整的行

        for (const line of lines) {
          processLine(line)
        }
      }

      // 处理剩余的 buffer
      if (buffer.trim()) {
        processLine(buffer)
      }

      currentStreamReader = null
      console.log('流式生成完成')
      if (!isGenerationStopped) event.reply('generate-report-done')
    } catch (error) {
      console.error('AI 流式生成失败:', error)
      event.reply('generate-report-error', String(error))
    }
  }
)

// 获取存储大小
ipcMain.handle('get-storage-size', async () => {
  const userDataPath = app.getPath('userData')
  return getDirSize(userDataPath)
})

// 清除缓存
ipcMain.handle('clear-cache', async () => {
  const userDataPath = app.getPath('userData')
  const cacheFiles = ['Cache', 'Code Cache', 'GPUCache']
  for (const cache of cacheFiles) {
    const cachePath = join(userDataPath, cache)
    if (existsSync(cachePath)) {
      try {
        // 简单删除缓存目录中的文件
        const files = readdirSync(cachePath)
        for (const file of files) {
          try {
            unlinkSync(join(cachePath, file))
          } catch {
            // 忽略无法删除的文件
          }
        }
      } catch {
        // 忽略错误
      }
    }
  }
  return { success: true }
})

// 计算目录大小
function getDirSize(dirPath: string): number {
  let size = 0
  try {
    const files = readdirSync(dirPath)
    for (const file of files) {
      const filePath = join(dirPath, file)
      try {
        const stat = statSync(filePath)
        if (stat.isFile()) {
          size += stat.size
        } else if (stat.isDirectory()) {
          size += getDirSize(filePath)
        }
      } catch {
        // 忽略无法访问的文件
      }
    }
  } catch {
    // 忽略错误
  }
  return size
}

app.whenReady().then(() => {
  // 初始化数据库
  initDatabase()

  electronApp.setAppUserModelId('com.sookool.assistant')

  if (process.platform === 'darwin') {
    const appIcon = nativeImage.createFromPath(icon)
    if (!appIcon.isEmpty()) {
      app.dock?.setIcon(appIcon)
    }
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  closeDatabase()
})
