import {
  ChevronLeft,
  ChevronRight,
  Save,
  GitCommit,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  User
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Tabs,
  Tab,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@heroui/react'
import { useAppStore, Commit } from '@/stores/app-store'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { MarkdownEditor, Editor } from './MarkdownEditor'
import { EditorToolbar } from './EditorToolbar'
import { getLunarInfo, getLunarDisplayText, getMonthDays } from '@/lib/lunar'

type NoteViewMode = 'day' | 'week'

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getWeekStart = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const getWeekDays = (weekStart: Date): Date[] => {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart)
    day.setDate(day.getDate() + i)
    days.push(day)
  }
  return days
}

const weekDayLabels = ['一', '二', '三', '四', '五', '六', '日']
const weekDayFullLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function Notes() {
  const {
    selectedNoteDate,
    setSelectedNoteDate,
    addOrUpdateNote,
    getNoteByDate,
    commits,
    setCommits,
    selectedCommits,
    toggleCommit,
    repositories,
    selectedAuthor,
    setSelectedAuthor
  } = useAppStore()

  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [noteViewMode, setNoteViewMode] = useState<NoteViewMode>('day')
  const [commitsExpanded, setCommitsExpanded] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 日视图状态
  const [editContent, setEditContent] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 周视图状态
  const [weekContents, setWeekContents] = useState<Record<string, string>>({})
  const [weekUnsavedChanges, setWeekUnsavedChanges] = useState<Record<string, boolean>>({})
  const [activeEditorIndex, setActiveEditorIndex] = useState(0)
  const weekEditorsRef = useRef<(Editor | null)[]>([])
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null)

  const monthWeeks = useMemo(
    () => getMonthDays(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  )
  const todayStr = formatDate(new Date())

  // 获取选中日期所在周
  const selectedWeekStart = useMemo(() => {
    if (!selectedNoteDate) return getWeekStart(new Date())
    return getWeekStart(new Date(selectedNoteDate))
  }, [selectedNoteDate])

  const noteWeekDays = useMemo(() => getWeekDays(selectedWeekStart), [selectedWeekStart])

  const authors = useMemo(() => {
    const authorSet = new Set(commits.map((c) => c.author))
    return Array.from(authorSet).sort()
  }, [commits])

  const refreshCommits = useCallback(async () => {
    const selectedRepos = repositories.filter((repo) => repo.selected)
    if (selectedRepos.length === 0) return

    setIsRefreshing(true)
    try {
      const allCommits: Commit[] = []
      for (const repo of selectedRepos) {
        const result = await window.electron.ipcRenderer.invoke('get-commits', repo.path)
        if (result.commits) {
          const commitsWithRepo = result.commits.map((commit: Commit) => ({
            ...commit,
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

  const selectedDateCommits = useMemo(() => {
    if (!selectedNoteDate) return []
    const [year, month, day] = selectedNoteDate.split('-').map(Number)
    const start = new Date(year, month - 1, day)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    return commits
      .filter((commit) => {
        if (selectedAuthor && commit.author !== selectedAuthor) return false
        const commitDate = new Date(commit.date)
        return commitDate >= start && commitDate < end
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [commits, selectedAuthor, selectedNoteDate])

  useEffect(() => {
    if (!selectedNoteDate) {
      setSelectedNoteDate(todayStr)
    }
  }, [selectedNoteDate, setSelectedNoteDate, todayStr])

  // 日视图：加载选中日期的笔记
  useEffect(() => {
    if (selectedNoteDate && noteViewMode === 'day') {
      const note = getNoteByDate(selectedNoteDate)
      setEditContent(note?.content || '')
      setHasUnsavedChanges(false)
    }
  }, [selectedNoteDate, getNoteByDate, noteViewMode])

  // 周视图：加载一周的笔记
  useEffect(() => {
    if (noteViewMode === 'week') {
      const contents: Record<string, string> = {}
      noteWeekDays.forEach((day) => {
        const dateStr = formatDate(day)
        const note = getNoteByDate(dateStr)
        contents[dateStr] = note?.content || ''
      })
      setWeekContents(contents)
      setWeekUnsavedChanges({})
    }
  }, [noteViewMode, noteWeekDays, getNoteByDate])

  const goToPrev = () => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() - 1)
    setCurrentMonth(newMonth)
  }

  const goToNext = () => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + 1)
    setCurrentMonth(newMonth)
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
    setSelectedNoteDate(todayStr)
  }

  // 日视图保存
  const handleSave = useCallback(() => {
    if (selectedNoteDate) {
      addOrUpdateNote(selectedNoteDate, editContent)
      setHasUnsavedChanges(false)
    }
  }, [selectedNoteDate, editContent, addOrUpdateNote])

  // 周视图保存所有
  const handleSaveAll = useCallback(() => {
    Object.entries(weekContents).forEach(([dateStr, content]) => {
      if (weekUnsavedChanges[dateStr]) {
        addOrUpdateNote(dateStr, content)
      }
    })
    setWeekUnsavedChanges({})
  }, [weekContents, weekUnsavedChanges, addOrUpdateNote])

  const handleContentChange = (value: string) => {
    setEditContent(value)
    setHasUnsavedChanges(true)
  }

  const handleWeekContentChange = (dateStr: string, value: string) => {
    setWeekContents((prev) => ({ ...prev, [dateStr]: value }))
    setWeekUnsavedChanges((prev) => ({ ...prev, [dateStr]: true }))
  }

  const handleSelectDay = (date: Date) => {
    const dateStr = formatDate(date)
    // 切换日期前自动保存
    if (noteViewMode === 'day' && hasUnsavedChanges && selectedNoteDate) {
      addOrUpdateNote(selectedNoteDate, editContent)
    }
    setSelectedNoteDate(dateStr)
    // 如果点击的日期不在当前月，自动翻月
    if (
      date.getMonth() !== currentMonth.getMonth() ||
      date.getFullYear() !== currentMonth.getFullYear()
    ) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }

  const handleViewModeChange = (key: React.Key) => {
    // 切换前保存
    if (noteViewMode === 'day' && hasUnsavedChanges && selectedNoteDate) {
      addOrUpdateNote(selectedNoteDate, editContent)
      setHasUnsavedChanges(false)
    } else if (noteViewMode === 'week') {
      Object.entries(weekContents).forEach(([dateStr, content]) => {
        if (weekUnsavedChanges[dateStr]) {
          addOrUpdateNote(dateStr, content)
        }
      })
      setWeekUnsavedChanges({})
    }
    setNoteViewMode(key as NoteViewMode)
  }

  const handleEditorReady = (index: number, editor: Editor) => {
    weekEditorsRef.current[index] = editor
    if (index === activeEditorIndex) {
      setActiveEditor(editor)
    }
  }

  const handleEditorFocus = (index: number) => {
    setActiveEditorIndex(index)
    setActiveEditor(weekEditorsRef.current[index])
  }

  const hasNote = (date: Date): boolean => {
    const note = getNoteByDate(formatDate(date))
    return !!note && note.content.trim().length > 0
  }

  const stats = useMemo(() => {
    const lines = editContent.split('\n').length
    const chars = editContent.length
    return { lines, chars }
  }, [editContent])

  const monthText = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth() + 1
    return `${year}年${month}月`
  }, [currentMonth])

  const isCurrentMonth = useMemo(() => {
    const now = new Date()
    return (
      currentMonth.getFullYear() === now.getFullYear() && currentMonth.getMonth() === now.getMonth()
    )
  }, [currentMonth])

  const selectedDateDisplay = useMemo(() => {
    if (!selectedNoteDate) return ''
    const date = new Date(selectedNoteDate)
    const lunar = getLunarInfo(date)
    const weekday = date.toLocaleDateString('zh-CN', { weekday: 'long' })
    const lunarText = lunar.festival || lunar.solarTerm || `${lunar.lunarMonth}${lunar.lunarDay}`
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekday} · ${lunarText}`
  }, [selectedNoteDate])

  const weekRangeText = useMemo(() => {
    const weekEnd = new Date(selectedWeekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const startMonth = selectedWeekStart.getMonth() + 1
    const startDay = selectedWeekStart.getDate()
    const endMonth = weekEnd.getMonth() + 1
    const endDay = weekEnd.getDate()

    if (startMonth === endMonth) {
      return `${startMonth}月${startDay}日 - ${endDay}日`
    }
    return `${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`
  }, [selectedWeekStart])

  const hasWeekUnsavedChanges = useMemo(() => {
    return Object.values(weekUnsavedChanges).some(Boolean)
  }, [weekUnsavedChanges])

  const renderDayCell = (day: Date) => {
    const dateStr = formatDate(day)
    const isSelected = selectedNoteDate === dateStr
    const isToday = dateStr === todayStr
    const dayHasNote = hasNote(day)
    const isInCurrentMonth = day.getMonth() === currentMonth.getMonth()
    const lunarInfo = getLunarInfo(day)
    const lunarText = getLunarDisplayText(day)
    const isFestival = !!lunarInfo.festival || !!lunarInfo.solarTerm

    return (
      <button
        key={dateStr}
        type="button"
        onClick={() => handleSelectDay(day)}
        className={`relative rounded-lg transition-all duration-200 text-center p-2 ${
          isSelected
            ? 'bg-primary text-primary-foreground'
            : isToday
              ? 'bg-primary/10 hover:bg-primary/20'
              : !isInCurrentMonth
                ? 'opacity-40 hover:opacity-60 hover:bg-default-100'
                : 'hover:bg-default-100'
        }`}
      >
        <p className={`font-medium ${isSelected ? 'text-primary-foreground' : ''}`}>
          {day.getDate()}
        </p>
        <p
          className={`text-[10px] mt-0.5 truncate ${
            isSelected
              ? 'text-primary-foreground/80'
              : isFestival
                ? 'text-primary'
                : 'text-default-400'
          }`}
        >
          {lunarText}
        </p>
        {lunarInfo.isHoliday && (
          <span
            className={`absolute top-0.5 right-0.5 text-[10px] px-1 rounded ${
              isSelected
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-success/20 text-success'
            }`}
          >
            休
          </span>
        )}
        {lunarInfo.isWorkday && (
          <span
            className={`absolute top-0.5 right-0.5 text-[10px] px-1 rounded ${
              isSelected
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-warning/20 text-warning'
            }`}
          >
            班
          </span>
        )}
        {dayHasNote && (
          <div
            className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
              isSelected ? 'bg-primary-foreground' : 'bg-primary'
            }`}
          />
        )}
      </button>
    )
  }

  const renderWeekDayEditor = (day: Date, index: number) => {
    const dateStr = formatDate(day)
    const isToday = dateStr === todayStr
    const lunarText = getLunarDisplayText(day)
    const content = weekContents[dateStr] || ''
    const isActive = index === activeEditorIndex
    const hasChanges = weekUnsavedChanges[dateStr]

    return (
      <div
        key={dateStr}
        className={`rounded-lg border transition-all ${
          isActive ? 'border-primary' : 'border-divider'
        }`}
      >
        <div
          className={`flex items-center justify-between px-3 py-2 border-b ${
            isActive ? 'border-primary/30 bg-primary/5' : 'border-divider'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm ${isToday ? 'text-primary' : ''}`}>
              {weekDayFullLabels[index]}
            </span>
            <span className="text-default-400 text-xs">
              {day.getMonth() + 1}/{day.getDate()}
            </span>
            <span className="text-default-300 text-xs">{lunarText}</span>
            {hasChanges && <span className="text-warning text-xs">*</span>}
          </div>
          {isToday && (
            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
              今天
            </span>
          )}
        </div>
        <MarkdownEditor
          content={content}
          onChange={(value) => handleWeekContentChange(dateStr, value)}
          showToolbar={false}
          onEditorReady={(editor) => handleEditorReady(index, editor)}
          onFocus={() => handleEditorFocus(index)}
          minHeight="120px"
          placeholder={`${weekDayFullLabels[index]}...`}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 flex gap-6 overflow-hidden">
      <div className="flex-1 flex flex-col gap-6 min-w-0 overflow-hidden">
        {/* 左侧日历区域 */}
        <Card className="card-flat flex-none">
          <CardHeader className="flex justify-between items-center pb-2">
            <div className="flex items-center gap-1">
              <Button isIconOnly size="sm" variant="light" onPress={goToPrev}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <p className="text-base font-medium px-2 min-w-[100px] text-center">{monthText}</p>
              <Button isIconOnly size="sm" variant="light" onPress={goToNext}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {!isCurrentMonth && (
              <Button size="sm" variant="flat" onPress={goToToday}>
                今日
              </Button>
            )}
          </CardHeader>
          <CardBody className="pt-0">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDayLabels.map((label) => (
                <p key={label} className="text-xs text-default-400 text-center py-1">
                  {label}
                </p>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthWeeks.flat().map((day) => renderDayCell(day))}
            </div>
          </CardBody>
        </Card>

        {/* 提交记录区域 */}
        <Card
          className={`card-flat flex flex-col ${commitsExpanded ? 'flex-1 min-h-0' : 'flex-none'}`}
        >
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
                  ({selectedDateCommits.length} 条)
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Dropdown>
                <DropdownTrigger>
                  <Button variant="bordered" size="sm" startContent={<User className="w-4 h-4" />}>
                    {selectedAuthor || '全部用户'}
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="作者筛选"
                  selectionMode="single"
                  selectedKeys={selectedAuthor ? [selectedAuthor] : ['all']}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string
                    setSelectedAuthor(selected === 'all' ? null : selected)
                  }}
                  items={[
                    { key: 'all', label: '全部用户' },
                    ...authors.map((author) => ({
                      key: author,
                      label: author
                    }))
                  ]}
                >
                  {(item) => <DropdownItem key={item.key}>{item.label}</DropdownItem>}
                </DropdownMenu>
              </Dropdown>
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
          </CardHeader>
          {commitsExpanded && (
            <CardBody className="pt-0 flex-1 overflow-auto">
              {selectedDateCommits.length === 0 ? (
                <div className="text-center py-10 text-default-500">
                  <GitCommit className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>暂无提交记录</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateCommits.map((commit) => (
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
                            {commit.author} ·{' '}
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
              )}
            </CardBody>
          )}
        </Card>
      </div>

      {/* 右侧编辑器区域 */}
      <Card className="card-flat flex-1 flex flex-col overflow-hidden min-w-0">
        <CardHeader className="flex justify-between items-center py-3 flex-shrink-0">
          <div>
            <p className="text-base font-medium">
              {noteViewMode === 'day' ? selectedDateDisplay : weekRangeText}
            </p>
            <p className="text-xs text-default-400 mt-1">
              {noteViewMode === 'day' ? (
                <>
                  {stats.chars} 字 · {stats.lines} 行
                  {hasUnsavedChanges && <span className="text-warning ml-2">· 未保存</span>}
                </>
              ) : (
                hasWeekUnsavedChanges && <span className="text-warning">有未保存的更改</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs
              size="sm"
              selectedKey={noteViewMode}
              onSelectionChange={handleViewModeChange}
              aria-label="笔记视图切换"
            >
              <Tab key="day" title="日" />
              <Tab key="week" title="周" />
            </Tabs>
            <Button
              size="sm"
              color="primary"
              isDisabled={noteViewMode === 'day' ? !hasUnsavedChanges : !hasWeekUnsavedChanges}
              startContent={<Save className="w-4 h-4" />}
              onPress={noteViewMode === 'day' ? handleSave : handleSaveAll}
            >
              保存
            </Button>
          </div>
        </CardHeader>
        <CardBody className="pt-0 flex-1 overflow-hidden">
          {noteViewMode === 'day' ? (
            <MarkdownEditor
              content={editContent}
              onChange={handleContentChange}
              placeholder="记录今天的想法..."
            />
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              {/* 统一工具栏 */}
              <div className="flex-shrink-0 border-b border-divider mb-4">
                <EditorToolbar editor={activeEditor} />
              </div>
              {/* 七天编辑器 */}
              <div className="flex-1 overflow-auto space-y-3">
                {noteWeekDays.map((day, index) => renderWeekDayEditor(day, index))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
