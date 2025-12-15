import { create } from 'zustand'

export type ViewType = 'dashboard' | 'projects' | 'templates' | 'settings'

export interface Commit {
  hash: string
  message: string
  author: string
  date: Date
  files: string[]
  additions: number
  deletions: number
  repoId?: string
  repoName?: string
  repoDescription?: string
}

export interface Repository {
  id: string
  name: string
  path: string
  type: 'local' | 'github' | 'gitlab' | 'gitee'
  selected: boolean
  alias?: string // 项目别名
  description?: string // 项目解释/描述
}

export interface Template {
  id: string
  name: string
  content: string
  isBuiltin: boolean
}

export interface WritingExample {
  id: string
  templateId: string // 关联的模版 ID
  title: string
  content: string
  createdAt: Date
}

interface AppState {
  initialized: boolean
  initializeStore: () => Promise<void>

  currentView: ViewType
  setCurrentView: (view: ViewType) => void

  repositories: Repository[]
  setRepositories: (repos: Repository[]) => void
  addRepository: (repo: Omit<Repository, 'id' | 'selected'>) => void
  removeRepository: (id: string) => void
  toggleRepository: (id: string) => void
  updateRepository: (id: string, updates: Partial<Pick<Repository, 'alias' | 'description'>>) => void

  commits: Commit[]
  setCommits: (commits: Commit[]) => void
  selectedCommits: string[]
  toggleCommit: (hash: string) => void
  selectAllCommits: () => void
  clearSelectedCommits: () => void

  templates: Template[]
  setTemplates: (templates: Template[]) => void
  addTemplate: (template: Omit<Template, 'id'>) => void
  updateTemplate: (id: string, updates: Partial<Pick<Template, 'name' | 'content'>>) => void
  removeTemplate: (id: string) => void
  selectedTemplate: string | null
  setSelectedTemplate: (id: string | null) => void

  // 日期筛选与模版的关联
  filterTemplateMap: Record<string, string>
  setFilterTemplate: (filter: string, templateId: string) => void
  getFilterTemplate: (filter: string) => string | null

  // 写作示例
  writingExamples: WritingExample[]
  addWritingExample: (example: Omit<WritingExample, 'id' | 'createdAt'>) => boolean
  removeWritingExample: (id: string) => void

  dateRange: { start: Date; end: Date }
  setDateRange: (range: { start: Date; end: Date }) => void

  // 当前日期筛选
  currentDateFilter: string
  setCurrentDateFilter: (filter: string) => void

  // 用户筛选
  selectedAuthor: string | null
  setSelectedAuthor: (author: string | null) => void

  generatedContent: string
  setGeneratedContent: (content: string) => void

  isGenerating: boolean
  setIsGenerating: (value: boolean) => void

  apiStatus: 'connected' | 'disconnected' | 'checking'
  setApiStatus: (status: 'connected' | 'disconnected' | 'checking') => void
}

const defaultTemplates: Template[] = [
  {
    id: 'daily',
    name: '标准日报',
    content: `# 今日完成工作
XXX

# 今日工作总结
XXX

# 明日工作计划
XXX`,
    isBuiltin: true
  },
  {
    id: 'weekly',
    name: '标准周报',
    content: `# 本周完成工作
XXX

# 本周工作总结
XXX

# 下周工作计划
XXX`,
    isBuiltin: true
  }
]

// 保存仓库到本地
const saveRepositories = (repositories: Repository[]) => {
  window.electron.ipcRenderer.invoke('save-repositories', repositories)
}

// 保存模版到本地
const saveTemplates = (templates: Template[]) => {
  const customTemplates = templates.filter((t) => !t.isBuiltin)
  window.electron.ipcRenderer.invoke('save-templates', customTemplates)
}

// 保存选中的模版
const saveSelectedTemplate = (templateId: string | null) => {
  if (templateId) {
    window.electron.ipcRenderer.invoke('save-selected-template', templateId)
  }
}

// 保存写作示例
const saveWritingExamples = (examples: WritingExample[]) => {
  window.electron.ipcRenderer.invoke('save-writing-examples', examples)
}

// 保存日期筛选与模版的关联
const saveFilterTemplateMap = (map: Record<string, string>) => {
  window.electron.ipcRenderer.invoke('save-filter-template-map', map)
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  initializeStore: async () => {
    try {
      // 加载仓库列表
      const savedRepos = await window.electron.ipcRenderer.invoke('get-repositories')
      if (savedRepos && Array.isArray(savedRepos) && savedRepos.length > 0) {
        set({ repositories: savedRepos })
      }

      // 加载自定义模版
      const savedTemplates = await window.electron.ipcRenderer.invoke('get-templates')
      if (savedTemplates && Array.isArray(savedTemplates)) {
        set({ templates: [...defaultTemplates, ...savedTemplates] })
      }

      // 加载选中的模版
      const savedSelectedTemplate = await window.electron.ipcRenderer.invoke('get-selected-template')
      if (savedSelectedTemplate) {
        set({ selectedTemplate: savedSelectedTemplate })
      }

      // 加载写作示例
      const savedExamples = await window.electron.ipcRenderer.invoke('get-writing-examples')
      if (savedExamples && Array.isArray(savedExamples)) {
        set({ writingExamples: savedExamples })
      }

      // 加载日期筛选与模版的关联
      const savedFilterTemplateMap = await window.electron.ipcRenderer.invoke('get-filter-template-map')
      if (savedFilterTemplateMap && typeof savedFilterTemplateMap === 'object') {
        set({ filterTemplateMap: savedFilterTemplateMap })
      }

      // 加载选中的用户
      const savedAuthor = await window.electron.ipcRenderer.invoke('get-selected-author')
      if (savedAuthor) {
        set({ selectedAuthor: savedAuthor })
      }

      // 自动连接 API
      try {
        const savedProvider = await window.electron.ipcRenderer.invoke('get-current-provider')
        if (savedProvider) {
          const savedApiKey = await window.electron.ipcRenderer.invoke('get-api-key', savedProvider)
          if (savedApiKey || savedProvider === 'ollama') {
            // 有保存的 API Key 或是 Ollama，尝试连接
            set({ apiStatus: 'checking' })
            const result = await window.electron.ipcRenderer.invoke('get-models', savedProvider)
            if (result.models && result.models.length > 0) {
              set({ apiStatus: 'connected' })
            } else {
              set({ apiStatus: savedApiKey ? 'connected' : 'disconnected' })
            }
          }
        }
      } catch {
        // 连接失败，保持断开状态
      }

      set({ initialized: true })
    } catch (error) {
      console.error('初始化 store 失败:', error)
      set({ initialized: true })
    }
  },

  currentView: 'dashboard',
  setCurrentView: (view) => set({ currentView: view }),

  repositories: [],
  setRepositories: (repos) => {
    set({ repositories: repos })
    saveRepositories(repos)
  },
  addRepository: (repo) => {
    const newRepo = { ...repo, id: crypto.randomUUID(), selected: true }
    const newRepos = [...get().repositories, newRepo]
    set({ repositories: newRepos })
    saveRepositories(newRepos)
  },
  removeRepository: (id) => {
    const newRepos = get().repositories.filter((r) => r.id !== id)
    set({ repositories: newRepos })
    saveRepositories(newRepos)
  },
  toggleRepository: (id) => {
    const newRepos = get().repositories.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    set({ repositories: newRepos })
    saveRepositories(newRepos)
  },
  updateRepository: (id, updates) => {
    const newRepos = get().repositories.map((r) => (r.id === id ? { ...r, ...updates } : r))
    set({ repositories: newRepos })
    saveRepositories(newRepos)
  },

  commits: [],
  setCommits: (commits) => set({ commits }),
  selectedCommits: [],
  toggleCommit: (hash) =>
    set((state) => ({
      selectedCommits: state.selectedCommits.includes(hash)
        ? state.selectedCommits.filter((h) => h !== hash)
        : [...state.selectedCommits, hash]
    })),
  selectAllCommits: () =>
    set((state) => ({
      selectedCommits: state.commits.map((c) => c.hash)
    })),
  clearSelectedCommits: () => set({ selectedCommits: [] }),

  templates: defaultTemplates,
  setTemplates: (templates) => {
    set({ templates })
    saveTemplates(templates)
  },
  addTemplate: (template) => {
    const newTemplate = { ...template, id: crypto.randomUUID() }
    const newTemplates = [...get().templates, newTemplate]
    set({ templates: newTemplates })
    saveTemplates(newTemplates)
  },
  updateTemplate: (id, updates) => {
    const newTemplates = get().templates.map((t) => (t.id === id ? { ...t, ...updates } : t))
    set({ templates: newTemplates })
    saveTemplates(newTemplates)
  },
  removeTemplate: (id) => {
    const newTemplates = get().templates.filter((t) => t.id !== id)
    set({ templates: newTemplates })
    saveTemplates(newTemplates)
  },
  selectedTemplate: 'daily',
  setSelectedTemplate: (id) => {
    set({ selectedTemplate: id })
    saveSelectedTemplate(id)
  },

  // 日期筛选与模版的关联
  filterTemplateMap: {},
  setFilterTemplate: (filter, templateId) => {
    const newMap = { ...get().filterTemplateMap, [filter]: templateId }
    set({ filterTemplateMap: newMap })
    saveFilterTemplateMap(newMap)
  },
  getFilterTemplate: (filter) => {
    return get().filterTemplateMap[filter] || null
  },

  // 写作示例
  writingExamples: [],
  addWritingExample: (example) => {
    const examples = get().writingExamples
    const templateCount = examples.filter((e) => e.templateId === example.templateId).length
    // 每个模版最多2个示例
    if (templateCount >= 2) {
      return false
    }
    const newExample: WritingExample = {
      ...example,
      id: crypto.randomUUID(),
      createdAt: new Date()
    }
    const newExamples = [...examples, newExample]
    set({ writingExamples: newExamples })
    saveWritingExamples(newExamples)
    return true
  },
  removeWritingExample: (id) => {
    const newExamples = get().writingExamples.filter((e) => e.id !== id)
    set({ writingExamples: newExamples })
    saveWritingExamples(newExamples)
  },

  dateRange: {
    start: new Date(new Date().setHours(0, 0, 0, 0)),
    end: new Date()
  },
  setDateRange: (range) => set({ dateRange: range }),

  // 当前日期筛选
  currentDateFilter: 'week',
  setCurrentDateFilter: (filter) => set({ currentDateFilter: filter }),

  // 用户筛选
  selectedAuthor: null,
  setSelectedAuthor: (author) => {
    set({ selectedAuthor: author })
    window.electron.ipcRenderer.invoke('save-selected-author', author)
  },

  generatedContent: '',
  setGeneratedContent: (content) => set({ generatedContent: content }),

  isGenerating: false,
  setIsGenerating: (value) => set({ isGenerating: value }),

  apiStatus: 'disconnected',
  setApiStatus: (status) => set({ apiStatus: status })
}))
