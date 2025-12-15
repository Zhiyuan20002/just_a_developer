import { Key, Bot, Database, RefreshCw, Plus, Trash2, HardDrive, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/stores/app-store'
import { useState, useEffect, useRef } from 'react'

// 可用变量列表
const PROMPT_VARIABLES = [
  { name: '{{template}}', label: '报告格式模版', description: '当前选中的报告格式模版内容' },
  { name: '{{commit_list}}', label: '提交列表', description: '按项目分组的提交记录' },
  { name: '{{project_context}}', label: '项目上下文', description: '涉及的项目及其描述' },
  { name: '{{writing_examples}}', label: '写作示例', description: '用户上传的历史报告示例' },
  { name: '{{date}}', label: '当前日期', description: '今天的日期' },
  { name: '{{additions}}', label: '新增行数', description: '新增代码的总行数' },
  { name: '{{deletions}}', label: '删除行数', description: '删除代码的总行数' }
]

// 默认系统提示词
const DEFAULT_SYSTEM_PROMPT = `你是一个专业的工作报告撰写助手。请根据用户提供的 Git 提交记录，生成一份结构清晰、内容专业的工作报告。

## 你的任务
1. 分析提交记录，理解每个提交的工作内容
2. 按照指定的报告格式模版生成报告
3. 使用简洁专业的语言描述工作内容
4. 学习写作示例的风格（如果有）

## 报告格式模版
{{template}}

## 项目信息
{{project_context}}

## 提交记录
{{commit_list}}

## 代码统计
- 新增: {{additions}} 行
- 删除: {{deletions}} 行

## 写作示例参考
{{writing_examples}}

## 注意事项
- 保持报告简洁明了，避免冗余
- 使用中文撰写
- 按项目分组展示工作内容
- 突出重要的功能开发和问题修复
- 直接输出报告内容，不要有多余的解释`

interface CustomProvider {
  id: string
  name: string
  baseUrl: string
  apiKey: string
}

interface ModelInfo {
  id: string
  name: string
}

export function Settings() {
  const { apiStatus, setApiStatus } = useAppStore()
  const [apiKey, setApiKey] = useState('')
  const [apiProvider, setApiProvider] = useState('openai')
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [loadingModels, setLoadingModels] = useState(false)
  const [storageSize, setStorageSize] = useState<string>('计算中...')

  // 自定义供应商
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([])
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [newCustomProvider, setNewCustomProvider] = useState({
    name: '',
    baseUrl: '',
    apiKey: ''
  })

  // 系统提示词
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null)

  // 初始化加载已保存的数据
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        // 获取存储占用
        const size = await window.electron.ipcRenderer.invoke('get-storage-size')
        setStorageSize(formatBytes(size))

        // 获取已保存的自定义供应商
        const savedProviders = await window.electron.ipcRenderer.invoke('get-custom-providers')
        if (savedProviders && Array.isArray(savedProviders)) {
          setCustomProviders(savedProviders)
        }

        // 获取已保存的选中模型
        const savedModel = await window.electron.ipcRenderer.invoke('get-selected-model')
        if (savedModel) {
          setSelectedModel(savedModel)
        }

        // 获取已保存的当前供应商
        const savedProvider = await window.electron.ipcRenderer.invoke('get-current-provider')
        if (savedProvider) {
          setApiProvider(savedProvider)
        }

        // 获取已保存的系统提示词
        const savedPrompt = await window.electron.ipcRenderer.invoke('get-system-prompt')
        if (savedPrompt) {
          setSystemPrompt(savedPrompt)
        }
      } catch {
        setStorageSize('无法获取')
      }
    }
    loadSavedData()
  }, [])

  // 当切换供应商时，加载对应的 API Key 并自动连接
  useEffect(() => {
    const loadApiKeyAndConnect = async () => {
      try {
        const savedKey = await window.electron.ipcRenderer.invoke('get-api-key', apiProvider)
        if (savedKey) {
          setApiKey(savedKey)
          setApiStatus('connected')
          // 自动刷新模型列表
          setLoadingModels(true)
          try {
            const result = await window.electron.ipcRenderer.invoke('get-models', apiProvider)
            if (result.models) {
              setModels(result.models)
            }
          } catch {
            setModels([])
          }
          setLoadingModels(false)
        } else if (apiProvider === 'ollama') {
          // Ollama 本地模式无需 API Key，直接尝试连接
          setApiKey('')
          setLoadingModels(true)
          try {
            const result = await window.electron.ipcRenderer.invoke('get-models', apiProvider)
            if (result.models && result.models.length > 0) {
              setModels(result.models)
              setApiStatus('connected')
            } else {
              setApiStatus('disconnected')
            }
          } catch {
            setModels([])
            setApiStatus('disconnected')
          }
          setLoadingModels(false)
        } else {
          setApiKey('')
          setApiStatus('disconnected')
        }
      } catch {
        setApiKey('')
        setApiStatus('disconnected')
      }
    }
    loadApiKeyAndConnect()
  }, [apiProvider, setApiStatus])

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleSaveApiKey = async () => {
    if (!apiKey.trim() && apiProvider !== 'ollama') return
    setApiStatus('checking')
    try {
      await window.electron.ipcRenderer.invoke('save-api-key', { provider: apiProvider, key: apiKey })
      setApiStatus('connected')
      // 保存成功后自动刷新模型列表
      handleRefreshModels()
    } catch {
      setApiStatus('disconnected')
    }
  }

  const handleRefreshModels = async () => {
    setLoadingModels(true)
    try {
      const result = await window.electron.ipcRenderer.invoke('get-models', apiProvider)
      if (result.models) {
        setModels(result.models)
      }
    } catch {
      setModels([])
    }
    setLoadingModels(false)
  }

  const handleAddCustomProvider = () => {
    if (!newCustomProvider.name || !newCustomProvider.baseUrl) return
    const provider: CustomProvider = {
      id: `custom_${Date.now()}`,
      ...newCustomProvider
    }
    setCustomProviders([...customProviders, provider])
    setNewCustomProvider({ name: '', baseUrl: '', apiKey: '' })
    setShowAddCustom(false)
    // 保存到本地
    window.electron.ipcRenderer.invoke('save-custom-providers', [...customProviders, provider])
  }

  const handleRemoveCustomProvider = (id: string) => {
    const updated = customProviders.filter((p) => p.id !== id)
    setCustomProviders(updated)
    window.electron.ipcRenderer.invoke('save-custom-providers', updated)
  }

  const handleClearCache = async () => {
    await window.electron.ipcRenderer.invoke('clear-cache')
    const size = await window.electron.ipcRenderer.invoke('get-storage-size')
    setStorageSize(formatBytes(size))
  }

  const handleSaveSystemPrompt = async () => {
    await window.electron.ipcRenderer.invoke('save-system-prompt', systemPrompt)
  }

  const handleResetSystemPrompt = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT)
    window.electron.ipcRenderer.invoke('save-system-prompt', DEFAULT_SYSTEM_PROMPT)
  }

  // 插入变量到提示词
  const insertPromptVariable = (variable: string) => {
    const textarea = promptTextareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newValue = systemPrompt.substring(0, start) + variable + systemPrompt.substring(end)
    setSystemPrompt(newValue)

    // 恢复焦点和光标位置
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  const builtinProviders = ['openai', 'claude', 'gemini', 'deepseek', 'ollama']

  return (
    <div className="flex-1 p-6 overflow-auto">
      <h2 className="text-lg font-medium mb-6">设置</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* 左侧：API 和模型设置 */}
        <div className="space-y-6">
        {/* API 配置 */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">API 配置</CardTitle>
            </div>
            <CardDescription>配置 AI 模型的 API 密钥</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">AI 服务商</label>
              <div className="flex gap-2 flex-wrap">
                {builtinProviders.map((provider) => (
                  <Button
                    key={provider}
                    variant={apiProvider === provider ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setApiProvider(provider)
                      setModels([])
                      window.electron.ipcRenderer.invoke('save-current-provider', provider)
                    }}
                  >
                    {provider === 'openai' && 'OpenAI'}
                    {provider === 'claude' && 'Claude'}
                    {provider === 'gemini' && 'Gemini'}
                    {provider === 'deepseek' && 'DeepSeek'}
                    {provider === 'ollama' && 'Ollama'}
                  </Button>
                ))}
                {customProviders.map((provider) => (
                  <Button
                    key={provider.id}
                    variant={apiProvider === provider.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setApiProvider(provider.id)
                      setModels([])
                      window.electron.ipcRenderer.invoke('save-current-provider', provider.id)
                    }}
                  >
                    {provider.name}
                  </Button>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setShowAddCustom(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 添加自定义供应商表单 */}
            {showAddCustom && (
              <div className="p-4 border rounded-lg space-y-3 bg-secondary/30">
                <p className="text-sm font-medium">添加自定义供应商 (OpenAI 兼容格式)</p>
                <Input
                  placeholder="供应商名称"
                  value={newCustomProvider.name}
                  onChange={(e) => setNewCustomProvider({ ...newCustomProvider, name: e.target.value })}
                />
                <Input
                  placeholder="API Base URL (如 https://api.example.com/v1)"
                  value={newCustomProvider.baseUrl}
                  onChange={(e) => setNewCustomProvider({ ...newCustomProvider, baseUrl: e.target.value })}
                />
                <Input
                  type="password"
                  placeholder="API Key"
                  value={newCustomProvider.apiKey}
                  onChange={(e) => setNewCustomProvider({ ...newCustomProvider, apiKey: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddCustomProvider}>
                    添加
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddCustom(false)}>
                    取消
                  </Button>
                </div>
              </div>
            )}

            {/* 自定义供应商列表 */}
            {customProviders.length > 0 && !showAddCustom && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">自定义供应商</p>
                {customProviders.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between p-2 rounded bg-secondary/30"
                  >
                    <div>
                      <p className="text-sm font-medium">{provider.name}</p>
                      <p className="text-xs text-muted-foreground">{provider.baseUrl}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemoveCustomProvider(provider.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">API Key</label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder={apiProvider === 'ollama' ? '本地模式无需密钥' : '输入 API Key'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={apiProvider === 'ollama'}
                />
                <Button onClick={handleSaveApiKey} disabled={apiProvider === 'ollama' && !apiKey}>
                  保存
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div
                className={`w-2 h-2 rounded-full ${
                  apiStatus === 'connected'
                    ? 'bg-green-500'
                    : apiStatus === 'checking'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
              />
              <span className="text-muted-foreground">
                {apiStatus === 'connected' && '已连接'}
                {apiStatus === 'checking' && '检查中...'}
                {apiStatus === 'disconnected' && '未连接'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 模型设置 */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">模型设置</CardTitle>
              </div>
              <CardDescription>选择用于生成报告的 AI 模型</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefreshModels}
              disabled={loadingModels}
              title="刷新模型列表"
            >
              <RefreshCw className={`w-4 h-4 ${loadingModels ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {models.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {models.map((model) => (
                  <Button
                    key={model.id}
                    variant={selectedModel === model.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedModel(model.id)
                      window.electron.ipcRenderer.invoke('save-selected-model', model.id)
                    }}
                  >
                    {model.name || model.id}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                <p>点击右上角刷新按钮获取模型列表</p>
                <div className="flex gap-2 flex-wrap mt-3">
                  <Button
                    variant={selectedModel === 'gpt-4o' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedModel('gpt-4o')
                      window.electron.ipcRenderer.invoke('save-selected-model', 'gpt-4o')
                    }}
                  >
                    GPT-4o
                  </Button>
                  <Button
                    variant={selectedModel === 'gpt-3.5-turbo' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedModel('gpt-3.5-turbo')
                      window.electron.ipcRenderer.invoke('save-selected-model', 'gpt-3.5-turbo')
                    }}
                  >
                    GPT-3.5
                  </Button>
                  <Button
                    variant={selectedModel === 'claude-3-5-sonnet' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedModel('claude-3-5-sonnet')
                      window.electron.ipcRenderer.invoke('save-selected-model', 'claude-3-5-sonnet')
                    }}
                  >
                    Claude 3.5 Sonnet
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 数据存储 */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">数据存储</CardTitle>
            </div>
            <CardDescription>管理本地存储的数据</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <HardDrive className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">当前占用</p>
                <p className="text-lg font-semibold text-primary">{storageSize}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearCache}>
              清除缓存
            </Button>
          </CardContent>
        </Card>
        </div>

        {/* 右侧：系统提示词编辑 */}
        <div>
          <Card className="bg-card/50 backdrop-blur h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">系统提示词</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={handleResetSystemPrompt}>
                  重置默认
                </Button>
              </div>
              <CardDescription>
                自定义 AI 生成报告时使用的系统提示词，影响生成风格和内容
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">点击插入变量：</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {PROMPT_VARIABLES.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => insertPromptVariable(v.name)}
                      className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                      title={v.description}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <Textarea
                  ref={promptTextareaRef}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="min-h-[350px] font-mono text-xs"
                  placeholder="输入系统提示词..."
                />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  变量会在生成时自动替换为实际内容
                </p>
                <Button size="sm" onClick={handleSaveSystemPrompt}>
                  保存提示词
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
