import {
  GitCommit,
  Plus,
  Minus,
  Calendar,
  RefreshCw,
  User,
  ChevronDown,
  ChevronUp,
  NotebookPen,
  CheckCheck
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@heroui/react'
import { useAppStore, Commit } from '@/stores/app-store'
import { useState, useMemo, useEffect, useCallback } from 'react'

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
    setSelectedAuthor,
    notes,
    selectedNotes,
    toggleNote,
    clearSelectedNotes
  } = useAppStore()

  const [dateFilter, setDateFilter] = useState<DateFilter>('week')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [commitsExpanded, setCommitsExpanded] = useState(true)
  const [notesExpanded, setNotesExpanded] = useState(true)

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
      allCommits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setCommits(allCommits)
    } catch (error) {
      console.error('刷新提交失败:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [repositories, setCommits])

  useEffect(() => {
    refreshCommits()
  }, [])

  const handleFilterChange = (filter: DateFilter) => {
    setDateFilter(filter)
    setCurrentDateFilter(filter)
    const savedTemplate = getFilterTemplate(filter)
    if (savedTemplate) {
      setSelectedTemplate(savedTemplate)
    }
  }

  useEffect(() => {
    setCurrentDateFilter(dateFilter)
  }, [])

  const authors = useMemo(() => {
    const authorSet = new Set(commits.map((c) => c.author))
    return Array.from(authorSet).sort()
  }, [commits])

  const filteredCommits = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    return commits.filter((commit) => {
      if (selectedAuthor && commit.author !== selectedAuthor) {
        return false
      }
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
    return Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[1][0].date)
      const dateB = new Date(b[1][0].date)
      return dateB.getTime() - dateA.getTime()
    })
  }, [filteredCommits])

  const totalAdditions = filteredCommits.reduce((sum, c) => sum + c.additions, 0)
  const totalDeletions = filteredCommits.reduce((sum, c) => sum + c.deletions, 0)

  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const filteredNotes = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    return notes
      .filter((note) => {
        if (!note.content || note.content.trim() === '') return false
        const noteDate = parseLocalDate(note.date)
        switch (dateFilter) {
          case 'today':
            return note.date === todayStr
          case 'week': {
            const weekAgo = new Date(today)
            weekAgo.setDate(weekAgo.getDate() - 7)
            return noteDate >= weekAgo && noteDate <= today
          }
          case 'month': {
            const monthAgo = new Date(today)
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            return noteDate >= monthAgo && noteDate <= today
          }
          case 'all':
          default:
            return true
        }
      })
      .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
  }, [notes, dateFilter])

  const filteredNotesStats = useMemo(() => {
    const totalLines = filteredNotes.reduce((sum, note) => {
      return sum + (note.content ? note.content.split('\n').length : 0)
    }, 0)
    return {
      count: filteredNotes.length,
      lines: totalLines,
      dates: filteredNotes.map((n) => n.date)
    }
  }, [filteredNotes])

  const clearAllSelections = () => {
    clearSelectedCommits()
    clearSelectedNotes()
  }

  const selectAllFiltered = () => {
    filteredCommits.forEach((commit) => {
      if (!selectedCommits.includes(commit.hash)) {
        toggleCommit(commit.hash)
      }
    })
    filteredNotes.forEach((note) => {
      if (!selectedNotes.includes(note.date)) {
        toggleNote(note.date)
      }
    })
  }

  const selectAllFilteredNotes = () => {
    filteredNotes.forEach((note) => {
      if (!selectedNotes.includes(note.date)) {
        toggleNote(note.date)
      }
    })
  }

  const hasFilteredContent = filteredCommits.length > 0 || filteredNotesStats.count > 0

  const filterLabels: Record<DateFilter, string> = {
    today: '今日',
    week: '本周',
    month: '本月',
    all: '全部'
  }

  return (
    <div className="flex-1 p-6 overflow-auto scrollbar-hide">
      {/* 顶部筛选栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-medium">提交记录</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* 用户筛选 */}
          <Dropdown>
            <DropdownTrigger>
              <Button variant="bordered" size="sm" startContent={<User className="w-4 h-4" />}>
                {selectedAuthor || '全部用户'}
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="用户筛选"
              selectionMode="single"
              selectedKeys={selectedAuthor ? [selectedAuthor] : ['all']}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string
                setSelectedAuthor(selected === 'all' ? null : selected)
              }}
              items={[{ key: 'all', label: '全部用户' }, ...authors.map((a) => ({ key: a, label: a }))]}
            >
              {(item) => <DropdownItem key={item.key}>{item.label}</DropdownItem>}
            </DropdownMenu>
          </Dropdown>

          {/* 日期筛选 */}
          <div className="flex items-center gap-1 bg-default-100 rounded-lg p-1">
            {(Object.keys(filterLabels) as DateFilter[]).map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={dateFilter === filter ? 'solid' : 'light'}
                color={dateFilter === filter ? 'primary' : 'default'}
                onPress={() => handleFilterChange(filter)}
              >
                {filterLabels[filter]}
              </Button>
            ))}
          </div>

          {/* 刷新按钮 */}
          <Button
            variant="bordered"
            size="sm"
            isLoading={isRefreshing}
            startContent={!isRefreshing && <RefreshCw className="w-4 h-4" />}
            onPress={refreshCommits}
          >
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card className="bg-content1/50 backdrop-blur">
          <CardHeader className="pb-0">
            <p className="text-sm text-default-500">{filterLabels[dateFilter]}提交</p>
          </CardHeader>
          <CardBody className="pt-2">
            <div className="flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-primary" />
              <span className="text-2xl font-semibold">{filteredCommits.length}</span>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-content1/50 backdrop-blur">
          <CardHeader className="pb-0">
            <p className="text-sm text-default-500">新增代码</p>
          </CardHeader>
          <CardBody className="pt-2">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-success" />
              <span className="text-2xl font-semibold text-success">{totalAdditions}</span>
              <span className="text-sm text-default-500">行</span>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-content1/50 backdrop-blur">
          <CardHeader className="pb-0">
            <p className="text-sm text-default-500">删除代码</p>
          </CardHeader>
          <CardBody className="pt-2">
            <div className="flex items-center gap-2">
              <Minus className="w-5 h-5 text-danger" />
              <span className="text-2xl font-semibold text-danger">{totalDeletions}</span>
              <span className="text-sm text-default-500">行</span>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-content1/50 backdrop-blur">
          <CardHeader className="pb-0">
            <p className="text-sm text-default-500">{filterLabels[dateFilter]}笔记</p>
          </CardHeader>
          <CardBody className="pt-2">
            <div className="flex items-center gap-2">
              <NotebookPen className="w-5 h-5 text-primary" />
              <span className="text-2xl font-semibold">{filteredNotesStats.count}</span>
              <span className="text-sm text-default-500">篇</span>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-content1/50 backdrop-blur">
          <CardHeader className="pb-0">
            <p className="text-sm text-default-500">笔记行数</p>
          </CardHeader>
          <CardBody className="pt-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold">{filteredNotesStats.lines}</span>
              <span className="text-sm text-default-500">行</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 一键全选按钮 */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <Button
          color="primary"
          size="sm"
          isDisabled={!hasFilteredContent}
          startContent={<CheckCheck className="w-4 h-4" />}
          onPress={selectAllFiltered}
        >
          一键全选
        </Button>
        <Button variant="bordered" size="sm" onPress={clearAllSelections}>
          清除选中
        </Button>
      </div>

      {/* Commit 列表 */}
      <Card className="bg-content1/50 backdrop-blur mb-6">
        <CardHeader className="flex justify-between items-center py-3">
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={() => setCommitsExpanded(!commitsExpanded)}
            >
              {commitsExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <p className="text-base font-medium">
              提交记录
              <span className="text-sm font-normal text-default-500 ml-2">
                ({filteredCommits.length} 条)
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="light" size="sm" onPress={selectAllCommits}>
              全选
            </Button>
            <Button variant="light" size="sm" onPress={clearSelectedCommits}>
              清除
            </Button>
          </div>
        </CardHeader>
        {commitsExpanded && (
          <CardBody className="pt-0">
            {filteredCommits.length === 0 ? (
              <div className="text-center py-12 text-default-500">
                <GitCommit className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无提交记录</p>
                <p className="text-sm mt-1">请先在项目库中添加 Git 仓库并刷新提交</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedCommits.map(([dateKey, dateCommits]) => (
                  <div key={dateKey}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-divider" />
                      <span className="text-xs text-default-500 px-2">{dateKey}</span>
                      <div className="h-px flex-1 bg-divider" />
                    </div>
                    <div className="space-y-2">
                      {dateCommits.map((commit) => (
                        <div
                          key={commit.hash}
                          onClick={() => toggleCommit(commit.hash)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                            selectedCommits.includes(commit.hash)
                              ? 'border-primary bg-primary/5'
                              : 'border-transparent hover:bg-default-100'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{commit.message}</p>
                              <p className="text-xs text-default-500 mt-1">
                                {commit.hash.slice(0, 7)} · {commit.author} ·{' '}
                                {new Date(commit.date).toLocaleTimeString('zh-CN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-success">+{commit.additions}</span>
                              <span className="text-danger">-{commit.deletions}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        )}
      </Card>

      {/* 笔记列表 */}
      <Card className="bg-content1/50 backdrop-blur">
        <CardHeader className="flex justify-between items-center py-3">
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={() => setNotesExpanded(!notesExpanded)}
            >
              {notesExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <p className="text-base font-medium">
              笔记记录
              <span className="text-sm font-normal text-default-500 ml-2">
                ({filteredNotes.length} 篇)
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="light" size="sm" onPress={selectAllFilteredNotes}>
              全选
            </Button>
            <Button variant="light" size="sm" onPress={clearSelectedNotes}>
              清除
            </Button>
          </div>
        </CardHeader>
        {notesExpanded && (
          <CardBody className="pt-0">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12 text-default-500">
                <NotebookPen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无笔记记录</p>
                <p className="text-sm mt-1">请在笔记页面添加笔记</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotes.map((note) => {
                  const noteDate = parseLocalDate(note.date)
                  const dateStr = noteDate.toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })
                  const lines = note.content ? note.content.split('\n').length : 0
                  const preview =
                    note.content.length > 100
                      ? note.content.substring(0, 100) + '...'
                      : note.content

                  return (
                    <div
                      key={note.date}
                      onClick={() => toggleNote(note.date)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedNotes.includes(note.date)
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:bg-default-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{dateStr}</p>
                          <p className="text-xs text-default-500 mt-1 line-clamp-2">{preview}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-default-500">
                          <span>{lines} 行</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        )}
      </Card>
    </div>
  )
}
