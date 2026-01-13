import {
  Key,
  Bot,
  Database,
  RefreshCw,
  Plus,
  Trash2,
  HardDrive,
  MessageSquare,
  Sun,
  Moon,
  Monitor,
  GitBranch,
  Search
} from 'lucide-react'
import { Card, CardHeader, CardBody, Button, Input, Textarea } from '@heroui/react'
import { useAppStore, ThemeMode } from '@/stores/app-store'
import { useState, useEffect, useRef, useMemo } from 'react'

const PROMPT_VARIABLES = [
  { name: '{{template}}', label: '报告格式模版', description: '当前选中的报告格式模版内容' },
  { name: '{{commit_list}}', label: '提交列表', description: '按项目分组的提交记录' },
  { name: '{{project_context}}', label: '项目上下文', description: '涉及的项目及其描述' },
  { name: '{{writing_examples}}', label: '写作示例', description: '用户上传的历史报告示例' },
  { name: '{{date}}', label: '当前日期', description: '今天的日期' },
  { name: '{{notes}}', label: '笔记内容', description: '选中的笔记内容' }
]

const DEFAULT_SYSTEM_PROMPT = `你是一个专业的工作报告撰写助手。请根据用户提供的 Git 提交记录和笔记内容，生成一份结构清晰、内容专业的工作报告。

## 你的任务
1. 分析提交记录，理解每个提交的工作内容
2. 结合笔记内容，补充工作细节和思考
3. 按照指定的报告格式模版生成报告
4. 使用简洁专业的语言描述工作内容
5. 学习写作示例的风格（如果有）

## 报告格式模版
{{template}}

## 项目信息
{{project_context}}

## 提交记录
{{commit_list}}

## 笔记内容
{{notes}}

## 写作示例参考
{{writing_examples}}

## 注意事项
- 保持报告简洁明了，避免冗余
- 使用中文撰写
- 按项目分组展示工作内容
- 突出重要的功能开发和问题修复
- 结合笔记内容丰富报告细节
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

// 获取用户名首字母（支持中英文）
function getInitial(name: string | null): string {
  if (!name || name.trim() === '') return 'U'
  const trimmed = name.trim()
  const firstChar = trimmed[0]
  if (/[a-zA-Z]/.test(firstChar)) {
    return firstChar.toUpperCase()
  }
  return firstChar
}

// 智能补全 API URL
function getFullApiUrl(baseUrl: string): string {
  if (!baseUrl) return ''

  let url = baseUrl.trim()

  // 移除末尾斜杠
  url = url.replace(/\/+$/, '')

  // 1. 已包含 chat/completions，直接返回
  if (url.includes('/chat/completions')) {
    return url
  }

  // 2. 已包含 /completions（如某些兼容接口），直接返回
  if (url.endsWith('/completions')) {
    return url
  }

  // 3. 以 /v数字 结尾（如 /v1, /v4），追加 /chat/completions
  if (/\/v\d+$/.test(url)) {
    return `${url}/chat/completions`
  }

  // 4. 以 /api 结尾，追加 /v1/chat/completions
  if (url.endsWith('/api')) {
    return `${url}/v1/chat/completions`
  }

  // 5. 包含版本路径但不以版本结尾（如 /api/paas/v4/xxx）
  if (/\/v\d+\//.test(url)) {
    return `${url}/chat/completions`
  }

  // 6. 默认追加 /v1/chat/completions
  return `${url}/v1/chat/completions`
}

export function Settings() {
  const { apiStatus, setApiStatus, themeMode, setThemeMode, gitUsername, setGitUsername } =
    useAppStore()
  const [apiKey, setApiKey] = useState('')
  const [apiProvider, setApiProvider] = useState('openai')
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [loadingModels, setLoadingModels] = useState(false)
  const [storageSize, setStorageSize] = useState<string>('计算中...')
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([])
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [newCustomProvider, setNewCustomProvider] = useState({
    name: '',
    baseUrl: ''
  })
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const [localGitUsername, setLocalGitUsername] = useState(gitUsername || '')
  const [modelSearch, setModelSearch] = useState('')
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setLocalGitUsername(gitUsername || '')
  }, [gitUsername])

  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const size = await window.electron.ipcRenderer.invoke('get-storage-size')
        setStorageSize(formatBytes(size))
        const savedProviders = await window.electron.ipcRenderer.invoke('get-custom-providers')
        if (savedProviders && Array.isArray(savedProviders)) {
          setCustomProviders(savedProviders)
        }
        const savedModel = await window.electron.ipcRenderer.invoke('get-selected-model')
        if (savedModel) setSelectedModel(savedModel)
        const savedProvider = await window.electron.ipcRenderer.invoke('get-current-provider')
        if (savedProvider) setApiProvider(savedProvider)
        const savedPrompt = await window.electron.ipcRenderer.invoke('get-system-prompt')
        if (savedPrompt) setSystemPrompt(savedPrompt)
      } catch {
        setStorageSize('无法获取')
      }
    }
    loadSavedData()
  }, [])

  useEffect(() => {
    const loadApiKeyAndConnect = async () => {
      try {
        const savedKey = await window.electron.ipcRenderer.invoke('get-api-key', apiProvider)
        if (savedKey) {
          setApiKey(savedKey)
          setApiStatus('connected')
          setLoadingModels(true)
          try {
            const result = await window.electron.ipcRenderer.invoke('get-models', apiProvider)
            if (result.models) setModels(result.models)
          } catch {
            setModels([])
          }
          setLoadingModels(false)
        } else if (apiProvider === 'ollama') {
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
      await window.electron.ipcRenderer.invoke('save-api-key', {
        provider: apiProvider,
        key: apiKey
      })
      setApiStatus('connected')
      handleRefreshModels()
    } catch {
      setApiStatus('disconnected')
    }
  }

  const handleRefreshModels = async () => {
    setLoadingModels(true)
    try {
      const result = await window.electron.ipcRenderer.invoke('get-models', apiProvider)
      if (result.models) setModels(result.models)
    } catch {
      setModels([])
    }
    setLoadingModels(false)
  }

  const handleAddCustomProvider = () => {
    if (!newCustomProvider.name || !newCustomProvider.baseUrl) return
    const provider: CustomProvider = {
      id: `custom_${Date.now()}`,
      name: newCustomProvider.name,
      baseUrl: newCustomProvider.baseUrl,
      apiKey: ''
    }
    setCustomProviders([...customProviders, provider])
    setNewCustomProvider({ name: '', baseUrl: '' })
    setShowAddCustom(false)
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

  const handleSaveGitUsername = () => {
    setGitUsername(localGitUsername.trim() || null)
  }

  const insertPromptVariable = (variable: string) => {
    const textarea = promptTextareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newValue = systemPrompt.substring(0, start) + variable + systemPrompt.substring(end)
    setSystemPrompt(newValue)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  const builtinProviders = ['openai', 'claude', 'gemini', 'deepseek', 'siliconflow', 'zhipu', 'openrouter', 'ollama']

  // 服务商显示名称映射
  const providerNames: Record<string, string> = {
    openai: 'OpenAI',
    claude: 'Claude',
    gemini: 'Gemini',
    deepseek: 'DeepSeek',
    siliconflow: '硅基流动',
    zhipu: '智谱AI',
    openrouter: 'OpenRouter',
    ollama: 'Ollama'
  }
  const userInitial = getInitial(gitUsername)

  // 过滤模型列表
  const filteredModels = useMemo(() => {
    if (!modelSearch.trim()) return models
    const search = modelSearch.toLowerCase()
    return models.filter(
      (m) => m.id.toLowerCase().includes(search) || m.name.toLowerCase().includes(search)
    )
  }, [models, modelSearch])

  // 排序模型列表，将选中的模型放在第一位
  const sortedModels = useMemo(() => {
    if (!selectedModel) return filteredModels
    const selected = filteredModels.find((m) => m.id === selectedModel)
    const others = filteredModels.filter((m) => m.id !== selectedModel)
    return selected ? [selected, ...others] : filteredModels
  }, [filteredModels, selectedModel])

  // 计算补全后的完整 URL
  const fullApiUrl = useMemo(() => getFullApiUrl(newCustomProvider.baseUrl), [newCustomProvider.baseUrl])

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium">设置</h2>
        {/* 右上角用户信息 */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-default-600">{gitUsername || '未设置用户名'}</span>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-medium text-sm">
            {userInitial}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Git 设置 */}
          <Card className="card-flat">
            <CardHeader className="flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-primary" />
                <p className="text-base font-medium">Git 设置</p>
              </div>
              <p className="text-sm text-default-500">配置 Git 用户信息，用于筛选提交记录</p>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">用户名</label>
                <div className="flex gap-2">
                  <Input
                    size="sm"
                    placeholder="输入 Git 用户名（如 zhangsan）"
                    value={localGitUsername}
                    onValueChange={setLocalGitUsername}
                    className="flex-1"
                  />
                  <Button size="sm" color="primary" onPress={handleSaveGitUsername}>
                    保存
                  </Button>
                </div>
              </div>
              <p className="text-xs text-default-400">
                💡 设置后将自动在首页筛选该用户的提交记录
              </p>
            </CardBody>
          </Card>

          {/* API 配置 */}
          <Card className="card-flat">
            <CardHeader className="flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                <p className="text-base font-medium">API 配置</p>
              </div>
              <p className="text-sm text-default-500">配置 AI 模型的 API 密钥</p>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">AI 服务商</label>
                <div className="flex gap-2 flex-wrap">
                  {builtinProviders.map((provider) => (
                    <Button
                      key={provider}
                      size="sm"
                      variant={apiProvider === provider ? 'solid' : 'bordered'}
                      color={apiProvider === provider ? 'primary' : 'default'}
                      onPress={() => {
                        setApiProvider(provider)
                        setModels([])
                        window.electron.ipcRenderer.invoke('save-current-provider', provider)
                      }}
                    >
                      {providerNames[provider] || provider}
                    </Button>
                  ))}
                  {customProviders.map((provider) => (
                    <Button
                      key={provider.id}
                      size="sm"
                      variant={apiProvider === provider.id ? 'solid' : 'bordered'}
                      color={apiProvider === provider.id ? 'primary' : 'default'}
                      onPress={() => {
                        setApiProvider(provider.id)
                        setModels([])
                        window.electron.ipcRenderer.invoke('save-current-provider', provider.id)
                      }}
                    >
                      {provider.name}
                    </Button>
                  ))}
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => setShowAddCustom(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {showAddCustom && (
                <div className="p-4 border border-divider rounded-lg space-y-3 bg-default-100">
                  <p className="text-sm font-medium">添加自定义供应商 (OpenAI 兼容格式)</p>
                  <Input
                    size="sm"
                    placeholder="供应商名称"
                    value={newCustomProvider.name}
                    onValueChange={(v) => setNewCustomProvider({ ...newCustomProvider, name: v })}
                  />
                  <div>
                    <Input
                      size="sm"
                      placeholder="API Base URL (如 https://api.siliconflow.cn)"
                      value={newCustomProvider.baseUrl}
                      onValueChange={(v) =>
                        setNewCustomProvider({ ...newCustomProvider, baseUrl: v })
                      }
                    />
                    {newCustomProvider.baseUrl && (
                      <p className="text-xs text-default-400 mt-1 break-all">
                        完整地址: {fullApiUrl}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" color="primary" onPress={handleAddCustomProvider}>
                      添加
                    </Button>
                    <Button size="sm" variant="light" onPress={() => setShowAddCustom(false)}>
                      取消
                    </Button>
                  </div>
                </div>
              )}

              {customProviders.length > 0 && !showAddCustom && (
                <div className="space-y-2">
                  <p className="text-sm text-default-500">自定义供应商</p>
                  {customProviders.map((provider) => (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between p-2 rounded bg-default-100"
                    >
                      <div>
                        <p className="text-sm font-medium">{provider.name}</p>
                        <p className="text-xs text-default-500 break-all">
                          {getFullApiUrl(provider.baseUrl)}
                        </p>
                      </div>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => handleRemoveCustomProvider(provider.id)}
                      >
                        <Trash2 className="w-4 h-4" />
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
                    size="sm"
                    placeholder={apiProvider === 'ollama' ? '本地模式无需密钥' : '输入 API Key'}
                    value={apiKey}
                    onValueChange={setApiKey}
                    isDisabled={apiProvider === 'ollama'}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    color="primary"
                    onPress={handleSaveApiKey}
                    isDisabled={apiProvider === 'ollama' && !apiKey}
                  >
                    保存
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div
                  className={`w-2 h-2 rounded-full ${
                    apiStatus === 'connected'
                      ? 'bg-success'
                      : apiStatus === 'checking'
                        ? 'bg-warning'
                        : 'bg-danger'
                  }`}
                />
                <span className="text-default-500">
                  {apiStatus === 'connected' && '已连接'}
                  {apiStatus === 'checking' && '检查中...'}
                  {apiStatus === 'disconnected' && '未连接'}
                </span>
              </div>
            </CardBody>
          </Card>

          {/* 模型设置 */}
          <Card className="card-flat">
            <CardHeader className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  <p className="text-base font-medium">模型设置</p>
                </div>
                <p className="text-sm text-default-500">
                  选择用于生成报告的 AI 模型
                  {selectedModel && (
                    <span className="text-primary ml-2">当前选择: {selectedModel}</span>
                  )}
                </p>
              </div>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                isLoading={loadingModels}
                onPress={handleRefreshModels}
              >
                {!loadingModels && <RefreshCw className="w-4 h-4" />}
              </Button>
            </CardHeader>
            <CardBody className="space-y-3">
              {/* 搜索框 - 仅当模型数量超过10个时显示 */}
              {models.length > 10 && (
                <Input
                  size="sm"
                  placeholder="搜索模型..."
                  value={modelSearch}
                  onValueChange={setModelSearch}
                  startContent={<Search className="w-4 h-4 text-default-400" />}
                  classNames={{
                    inputWrapper: 'bg-default-100'
                  }}
                />
              )}

              {/* 模型列表区域 */}
              {sortedModels.length > 0 ? (
                <div className="max-h-[300px] overflow-auto">
                  <div className="flex gap-2 flex-wrap">
                    {sortedModels.map((model) => (
                      <Button
                        key={model.id}
                        size="sm"
                        variant={selectedModel === model.id ? 'solid' : 'bordered'}
                        color={selectedModel === model.id ? 'primary' : 'default'}
                        onPress={() => {
                          setSelectedModel(model.id)
                          window.electron.ipcRenderer.invoke('save-selected-model', model.id)
                        }}
                      >
                        {model.name || model.id}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : models.length === 0 ? (
                <div className="text-sm text-default-500">
                  <p>点击右上角刷新按钮获取模型列表</p>
                  <div className="flex gap-2 flex-wrap mt-3">
                    {['gpt-4o', 'gpt-3.5-turbo', 'claude-3-5-sonnet'].map((m) => (
                      <Button
                        key={m}
                        size="sm"
                        variant={selectedModel === m ? 'solid' : 'bordered'}
                        color={selectedModel === m ? 'primary' : 'default'}
                        onPress={() => {
                          setSelectedModel(m)
                          window.electron.ipcRenderer.invoke('save-selected-model', m)
                        }}
                      >
                        {m === 'gpt-4o'
                          ? 'GPT-4o'
                          : m === 'gpt-3.5-turbo'
                            ? 'GPT-3.5'
                            : 'Claude 3.5 Sonnet'}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-default-500">未找到匹配的模型</p>
              )}
            </CardBody>
          </Card>

          {/* 数据存储 */}
          <Card className="card-flat">
            <CardHeader className="flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <p className="text-base font-medium">数据存储</p>
              </div>
              <p className="text-sm text-default-500">管理本地存储的数据</p>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-default-100">
                <HardDrive className="w-5 h-5 text-default-500" />
                <div>
                  <p className="text-sm font-medium">当前占用</p>
                  <p className="text-lg font-semibold text-primary">{storageSize}</p>
                </div>
              </div>
              <Button size="sm" variant="bordered" onPress={handleClearCache}>
                清除缓存
              </Button>
            </CardBody>
          </Card>

          {/* 外观设置 */}
          <Card className="card-flat">
            <CardHeader className="flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-primary" />
                <p className="text-base font-medium">外观设置</p>
              </div>
              <p className="text-sm text-default-500">选择应用的显示主题</p>
            </CardHeader>
            <CardBody>
              <div className="flex gap-2">
                {[
                  { mode: 'light' as ThemeMode, icon: Sun, label: '浅色' },
                  { mode: 'dark' as ThemeMode, icon: Moon, label: '深色' },
                  { mode: 'system' as ThemeMode, icon: Monitor, label: '跟随系统' }
                ].map(({ mode, icon: Icon, label }) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={themeMode === mode ? 'solid' : 'bordered'}
                    color={themeMode === mode ? 'primary' : 'default'}
                    startContent={<Icon className="w-4 h-4" />}
                    onPress={() => setThemeMode(mode)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 右侧：系统提示词编辑 */}
        <div>
          <Card className="card-flat h-full">
            <CardHeader className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <p className="text-base font-medium">系统提示词</p>
                </div>
                <p className="text-sm text-default-500">
                  自定义 AI 生成报告时使用的系统提示词，影响生成风格和内容
                </p>
              </div>
              <Button size="sm" variant="light" onPress={handleResetSystemPrompt}>
                重置默认
              </Button>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="text-xs text-default-500 mb-2">点击插入变量：</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {PROMPT_VARIABLES.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => insertPromptVariable(v.name)}
                      className="text-xs px-2 py-1 rounded bg-default-100 hover:bg-default-200 transition-colors"
                      title={v.description}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <Textarea
                  ref={promptTextareaRef}
                  value={systemPrompt}
                  onValueChange={setSystemPrompt}
                  minRows={15}
                  placeholder="输入系统提示词..."
                  classNames={{
                    input: 'font-mono text-xs'
                  }}
                />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-default-500">变量会在生成时自动替换为实际内容</p>
                <Button size="sm" color="primary" onPress={handleSaveSystemPrompt}>
                  保存提示词
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
