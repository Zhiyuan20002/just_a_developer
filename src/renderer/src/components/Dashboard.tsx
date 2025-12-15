import { GitCommit, Plus, Minus, Calendar, RefreshCw, User, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore, Commit } from '@/stores/app-store'
import { cn } from '@/lib/utils'
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

type DateFilter = 'today' | 'week' | 'month' | 'all'

export function Dashboard() {
  const {
    commits,
    selectedCommits,
    toggleCommit,
    selectAllCommits,
    clearSelectedCommits,
    repositories,
    setCommits,
    setSelectedTemplate,
    getFilterTemplate,
    setCurrentDateFilter,
    selectedAuthor,
    setSelectedAuthor
  } = useAppStore()

  const [dateFilter, setDateFilter] = useState<DateFilter>('week')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 刷新提交记录
  const refreshCommits = useCallback(async () => {
    const selectedRepos = repositories.filter((r) => r.selected)
    if (selectedRepos.length === 0) return

    setIsRefreshing(true)
    try {
      const allCommits: Commit[] = []
      for (const repo of selectedRepos) {
        const result = await window.electron.ipcRenderer.invoke('get-commits', repo.path)
        if (result.commits) {
          const commitsWithRepo = result.commits.map((c: Commit) => ({
            ...c,
            repoId: repo.id,
            repoName: repo.alias || repo.name,
            repoDescription: repo.description
          }))
          allCommits.push(...commitsWithRepo)
        }
      }
      // 按日期排序
      allCommits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setCommits(allCommits)
    } catch (error) {
      console.error('刷新提交失败:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [repositories, setCommits])

  // 打开时自动刷新
  useEffect(() => {
    refreshCommits()
  }, []) // 仅在组件挂载时执行一次

  // 切换日期筛选时，自动切换到关联的模版
  const handleFilterChange = (filter: DateFilter) => {
    setDateFilter(filter)
    setCurrentDateFilter(filter)
    const savedTemplate = getFilterTemplate(filter)
    if (savedTemplate) {
      setSelectedTemplate(savedTemplate)
    }
  }

  // 初始化时设置当前筛选
  useEffect(() => {
    setCurrentDateFilter(dateFilter)
  }, [])

  // 获取所有作者列表
  const authors = useMemo(() => {
    const authorSet = new Set(commits.map((c) => c.author))
    return Array.from(authorSet).sort()
  }, [commits])

  // 根据日期和用户筛选提交
  const filteredCommits = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    return commits.filter((commit) => {
      // 用户筛选
      if (selectedAuthor && commit.author !== selectedAuthor) {
        return false
      }

      // 日期筛选
      const commitDate = new Date(commit.date)
      switch (dateFilter) {
        case 'today':
          return commitDate >= today
        case 'week': {
          const weekAgo = new Date(today)
          weekAgo.setDate(weekAgo.getDate() - 7)
          return commitDate >= weekAgo
        }
        case 'month': {
          const monthAgo = new Date(today)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          return commitDate >= monthAgo
        }
        case 'all':
        default:
          return true
      }
    })
  }, [commits, dateFilter, selectedAuthor])

  // 按日期分组提交
  const groupedCommits = useMemo(() => {
    const groups: Record<string, Commit[]> = {}

    filteredCommits.forEach((commit) => {
      const date = new Date(commit.date)
      const dateKey = date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      })

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(commit)
    })

    // 按日期排序（最新的在前）
    return Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[1][0].date)
      const dateB = new Date(b[1][0].date)
      return dateB.getTime() - dateA.getTime()
    })
  }, [filteredCommits])

  const totalAdditions = filteredCommits.reduce((sum, c) => sum + c.additions, 0)
  const totalDeletions = filteredCommits.reduce((sum, c) => sum + c.deletions, 0)

  const filterLabels: Record<DateFilter, string> = {
    today: '今日',
    week: '本周',
    month: '本月',
    all: '全部'
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* 顶部筛选栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-medium">提交记录</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* 用户筛选 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 min-w-[120px] justify-between">
                <User className="w-4 h-4 mr-2" />
                <span className="truncate">{selectedAuthor || '全部用户'}</span>
                <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[150px]">
              <DropdownMenuItem
                onClick={() => setSelectedAuthor(null)}
                className={cn('cursor-pointer', !selectedAuthor && 'bg-primary/10')}
              >
                全部用户
              </DropdownMenuItem>
              {authors.map((author) => (
                <DropdownMenuItem
                  key={author}
                  onClick={() => setSelectedAuthor(author)}
                  className={cn('cursor-pointer', selectedAuthor === author && 'bg-primary/10')}
                >
                  {author}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 日期筛选 */}
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
            {(Object.keys(filterLabels) as DateFilter[]).map((filter) => (
              <Button
                key={filter}
                variant={dateFilter === filter ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3"
                onClick={() => handleFilterChange(filter)}
              >
                {filterLabels[filter]}
              </Button>
            ))}
          </div>

          {/* 刷新按钮 */}
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={refreshCommits}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1', isRefreshing && 'animate-spin')} />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {filterLabels[dateFilter]}提交
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-primary" />
              <span className="text-2xl font-semibold">{filteredCommits.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">新增代码</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-added" />
              <span className="text-2xl font-semibold text-added">{totalAdditions}</span>
              <span className="text-sm text-muted-foreground">行</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">删除代码</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Minus className="w-5 h-5 text-deleted" />
              <span className="text-2xl font-semibold text-deleted">{totalDeletions}</span>
              <span className="text-sm text-muted-foreground">行</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commit 列表 - 按日期分组 */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            提交记录
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({filteredCommits.length} 条)
            </span>
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAllCommits}>
              全选
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelectedCommits}>
              清除
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCommits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GitCommit className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无提交记录</p>
              <p className="text-sm mt-1">请先在项目库中添加 Git 仓库并刷新提交</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedCommits.map(([dateKey, dateCommits]) => (
                <div key={dateKey}>
                  {/* 日期分隔标题 */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground px-2 bg-card">
                      {dateKey}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {/* 该日期下的提交列表 */}
                  <div className="space-y-2">
                    {dateCommits.map((commit) => (
                      <div
                        key={commit.hash}
                        onClick={() => toggleCommit(commit.hash)}
                        className={cn(
                          'p-3 rounded-lg border cursor-pointer transition-all duration-200',
                          selectedCommits.includes(commit.hash)
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent hover:bg-accent'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{commit.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {commit.hash.slice(0, 7)} · {commit.author} ·{' '}
                              {new Date(commit.date).toLocaleTimeString('zh-CN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-added">+{commit.additions}</span>
                            <span className="text-deleted">-{commit.deletions}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
