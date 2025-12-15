import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/stores/app-store'

describe('AppStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useAppStore.setState({
      currentView: 'dashboard',
      repositories: [],
      commits: [],
      selectedCommits: [],
      generatedContent: '',
      isGenerating: false,
      apiStatus: 'disconnected'
    })
  })

  it('应该正确切换视图', () => {
    const { setCurrentView } = useAppStore.getState()
    setCurrentView('projects')
    expect(useAppStore.getState().currentView).toBe('projects')
  })

  it('应该正确添加仓库', () => {
    const { addRepository } = useAppStore.getState()
    addRepository({
      name: 'test-repo',
      path: '/path/to/repo',
      type: 'local'
    })
    const repos = useAppStore.getState().repositories
    expect(repos).toHaveLength(1)
    expect(repos[0].name).toBe('test-repo')
    expect(repos[0].selected).toBe(true)
  })

  it('应该正确切换仓库选中状态', () => {
    const { addRepository, toggleRepository } = useAppStore.getState()
    addRepository({
      name: 'test-repo',
      path: '/path/to/repo',
      type: 'local'
    })
    const repoId = useAppStore.getState().repositories[0].id
    toggleRepository(repoId)
    expect(useAppStore.getState().repositories[0].selected).toBe(false)
  })

  it('应该正确设置提交记录', () => {
    const { setCommits } = useAppStore.getState()
    const mockCommits = [
      {
        hash: 'abc123',
        message: '测试提交',
        author: 'Test',
        date: new Date(),
        files: ['test.ts'],
        additions: 10,
        deletions: 5
      }
    ]
    setCommits(mockCommits)
    expect(useAppStore.getState().commits).toHaveLength(1)
    expect(useAppStore.getState().commits[0].message).toBe('测试提交')
  })

  it('应该正确选择/取消选择提交', () => {
    const { setCommits, toggleCommit, selectAllCommits, clearSelectedCommits } = useAppStore.getState()
    const mockCommits = [
      {
        hash: 'abc123',
        message: '提交1',
        author: 'Test',
        date: new Date(),
        files: [],
        additions: 0,
        deletions: 0
      },
      {
        hash: 'def456',
        message: '提交2',
        author: 'Test',
        date: new Date(),
        files: [],
        additions: 0,
        deletions: 0
      }
    ]
    setCommits(mockCommits)

    // 选择单个
    toggleCommit('abc123')
    expect(useAppStore.getState().selectedCommits).toContain('abc123')

    // 全选
    selectAllCommits()
    expect(useAppStore.getState().selectedCommits).toHaveLength(2)

    // 清除
    clearSelectedCommits()
    expect(useAppStore.getState().selectedCommits).toHaveLength(0)
  })

  it('应该正确设置生成内容', () => {
    const { setGeneratedContent } = useAppStore.getState()
    setGeneratedContent('# 测试报告')
    expect(useAppStore.getState().generatedContent).toBe('# 测试报告')
  })

  it('应该正确设置 API 状态', () => {
    const { setApiStatus } = useAppStore.getState()
    setApiStatus('connected')
    expect(useAppStore.getState().apiStatus).toBe('connected')
  })
})
