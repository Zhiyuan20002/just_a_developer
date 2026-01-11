import { ChevronLeft, ChevronRight, Save, FileText } from 'lucide-react'
import { Card, CardHeader, CardBody, Button, Tabs, Tab } from '@heroui/react'
import { useAppStore } from '@/stores/app-store'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { MarkdownEditor, Editor } from './MarkdownEditor'
import { EditorToolbar } from './EditorToolbar'
import { getLunarInfo, getLunarDisplayText, getMonthDays } from '@/lib/lunar'

type CalendarViewMode = 'week' | 'month'
type NoteViewMode = 'day' | 'week'

const getWeekStart = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
  const { selectedNoteDate, setSelectedNoteDate, addOrUpdateNote, getNoteByDate } = useAppStore()

  // 日历视图模式（周/月）
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('week')
  // 笔记视图模式（日/周）
  const [noteViewMode, setNoteViewMode] = useState<NoteViewMode>('day')
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()))
  const [currentMonth, setCurrentMonth] = useState(() => new Date())

  // 日视图编辑状态
  const [editContent, setEditContent] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 周视图编辑状态
  const [weekContents, setWeekContents] = useState<Record<string, string>>({})
  const [weekUnsavedChanges, setWeekUnsavedChanges] = useState<Record<string, boolean>>({})
  const [activeEditorIndex, setActiveEditorIndex] = useState(0)
  const weekEditorsRef = useRef<(Editor | null)[]>([])
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null)

  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart])
  const monthWeeks = useMemo(
    () => getMonthDays(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  )
  const todayStr = formatDate(new Date())

  // 获取当前选中日期所在周的起始日
  const selectedWeekStart = useMemo(() => {
    if (!selectedNoteDate) return getWeekStart(new Date())
    return getWeekStart(new Date(selectedNoteDate))
  }, [selectedNoteDate])

  // 周视图显示的日期
  const noteWeekDays = useMemo(() => getWeekDays(selectedWeekStart), [selectedWeekStart])

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

  // 切换笔记视图模式时保存
  useEffect(() => {
    return () => {
      // 组件卸载或视图切换时自动保存
    }
  }, [noteViewMode])

  const goToPrev = () => {
    if (calendarViewMode === 'week') {
      const newStart = new Date(currentWeekStart)
      newStart.setDate(newStart.getDate() - 7)
      setCurrentWeekStart(newStart)
    } else {
      const newMonth = new Date(currentMonth)
      newMonth.setMonth(newMonth.getMonth() - 1)
      setCurrentMonth(newMonth)
    }
  }

  const goToNext = () => {
    if (calendarViewMode === 'week') {
      const newStart = new Date(currentWeekStart)
      newStart.setDate(newStart.getDate() + 7)
      setCurrentWeekStart(newStart)
    } else {
      const newMonth = new Date(currentMonth)
      newMonth.setMonth(newMonth.getMonth() + 1)
      setCurrentMonth(newMonth)
    }
  }

  const goToCurrent = () => {
    if (calendarViewMode === 'week') {
      setCurrentWeekStart(getWeekStart(new Date()))
    } else {
      setCurrentMonth(new Date())
    }
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
    if (hasUnsavedChanges && selectedNoteDate) {
      addOrUpdateNote(selectedNoteDate, editContent)
    }
    setSelectedNoteDate(dateStr)
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

  const weekRangeText = useMemo(() => {
    const weekEnd = new Date(currentWeekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const startMonth = currentWeekStart.getMonth() + 1
    const startDay = currentWeekStart.getDate()
    const endMonth = weekEnd.getMonth() + 1
    const endDay = weekEnd.getDate()
    const year = currentWeekStart.getFullYear()

    if (startMonth === endMonth) {
      return `${year}年${startMonth}月${startDay}日 - ${endDay}日`
    }
    return `${year}年${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`
  }, [currentWeekStart])

  const monthText = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth() + 1
    return `${year}年${month}月`
  }, [currentMonth])

  const isCurrentPeriod = useMemo(() => {
    if (calendarViewMode === 'week') {
      const thisWeekStart = getWeekStart(new Date())
      return currentWeekStart.getTime() === thisWeekStart.getTime()
    } else {
      const now = new Date()
      return (
        currentMonth.getFullYear() === now.getFullYear() &&
        currentMonth.getMonth() === now.getMonth()
      )
    }
  }, [calendarViewMode, currentWeekStart, currentMonth])

  const selectedDateDisplay = useMemo(() => {
    if (!selectedNoteDate) return ''
    const date = new Date(selectedNoteDate)
    const lunar = getLunarInfo(date)
    const weekday = date.toLocaleDateString('zh-CN', { weekday: 'long' })
    const lunarText = lunar.festival || lunar.solarTerm || `${lunar.lunarMonth}${lunar.lunarDay}`
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekday} · ${lunarText}`
  }, [selectedNoteDate])

  // 周视图的周范围显示
  const noteWeekRangeText = useMemo(() => {
    const weekEnd = new Date(selectedWeekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const startMonth = selectedWeekStart.getMonth() + 1
    const startDay = selectedWeekStart.getDate()
    const endMonth = weekEnd.getMonth() + 1
    const endDay = weekEnd.getDate()
    const year = selectedWeekStart.getFullYear()

    if (startMonth === endMonth) {
      return `${year}年${startMonth}月${startDay}日 - ${endDay}日`
    }
    return `${year}年${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`
  }, [selectedWeekStart])

  const handleCalendarViewModeChange = (key: React.Key) => {
    setCalendarViewMode(key as CalendarViewMode)
  }

  const handleNoteViewModeChange = (key: React.Key) => {
    // 切换前保存当前视图的更改
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

  // 计算周视图是否有未保存的更改
  const hasWeekUnsavedChanges = useMemo(() => {
    return Object.values(weekUnsavedChanges).some(Boolean)
  }, [weekUnsavedChanges])

  const renderDayCell = (
    day: Date,
    isSelected: boolean,
    isToday: boolean,
    dayHasNote: boolean,
    isCurrentMonth: boolean = true,
    compact: boolean = false
  ) => {
    const lunarInfo = getLunarInfo(day)
    const lunarText = getLunarDisplayText(day)
    const isFestival = !!lunarInfo.festival || !!lunarInfo.solarTerm

    return (
      <button
        key={formatDate(day)}
        type="button"
        onClick={() => handleSelectDay(day)}
        className={`relative rounded-lg transition-all duration-200 text-center ${
          compact ? 'p-1.5' : 'p-3'
        } ${
          isSelected
            ? 'bg-primary text-primary-foreground shadow-lg'
            : isToday
              ? 'bg-primary/10 hover:bg-primary/20'
              : !isCurrentMonth
                ? 'opacity-40 hover:opacity-60 hover:bg-default-100'
                : 'hover:bg-default-100'
        }`}
      >
        <p
          className={`font-semibold ${compact ? 'text-sm' : 'text-lg'} ${
            isSelected ? 'text-primary-foreground' : ''
          }`}
        >
          {day.getDate()}
        </p>
        <p
          className={`${compact ? 'text-[10px]' : 'text-xs'} mt-0.5 truncate ${
            isSelected
              ? 'text-primary-foreground/80'
              : isFestival
                ? 'text-primary'
                : 'text-default-500'
          }`}
        >
          {lunarText}
        </p>
        {lunarInfo.isHoliday && (
          <span
            className={`absolute top-0.5 right-0.5 text-[10px] px-1 rounded ${
              isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-success/20 text-success'
            }`}
          >
            休
          </span>
        )}
        {lunarInfo.isWorkday && (
          <span
            className={`absolute top-0.5 right-0.5 text-[10px] px-1 rounded ${
              isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-warning/20 text-warning'
            }`}
          >
            班
          </span>
        )}
        {dayHasNote && (
          <div
            className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
              isSelected ? 'bg-primary-foreground' : 'bg-primary'
            }`}
          />
        )}
      </button>
    )
  }

  // 渲染周视图中的单日编辑器
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
        className={`week-day-editor rounded-lg border transition-all ${
          isActive ? 'border-primary shadow-sm' : 'border-divider'
        }`}
      >
        <div
          className={`flex items-center justify-between px-3 py-2 border-b ${
            isActive ? 'border-primary/30 bg-primary/5' : 'border-divider bg-default-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isToday ? 'text-primary' : ''}`}>
              {weekDayFullLabels[index]}
            </span>
            <span className="text-default-500 text-sm">
              {day.getMonth() + 1}/{day.getDate()}
            </span>
            <span className="text-default-400 text-xs">{lunarText}</span>
            {hasChanges && <span className="text-warning text-xs">*</span>}
          </div>
          {isToday && (
            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">今天</span>
          )}
        </div>
        <MarkdownEditor
          content={content}
          onChange={(value) => handleWeekContentChange(dateStr, value)}
          showToolbar={false}
          onEditorReady={(editor) => handleEditorReady(index, editor)}
          onFocus={() => handleEditorFocus(index)}
          minHeight="150px"
          placeholder={`${weekDayFullLabels[index]}的笔记...`}
          className="border-0 rounded-none rounded-b-lg"
        />
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-medium">笔记</h2>
        </div>
      </div>

      <Card className="bg-content1/50 backdrop-blur mb-6">
        <CardHeader className="flex justify-between items-center pb-2">
          <div className="flex items-center gap-2">
            <Button isIconOnly size="sm" variant="light" onPress={goToPrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button isIconOnly size="sm" variant="light" onPress={goToNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <p className="text-base font-medium ml-2">
              {calendarViewMode === 'week' ? weekRangeText : monthText}
            </p>
            {!isCurrentPeriod && (
              <Button size="sm" variant="flat" onPress={goToCurrent}>
                今日
              </Button>
            )}
          </div>
          <Tabs
            size="sm"
            selectedKey={calendarViewMode}
            onSelectionChange={handleCalendarViewModeChange}
            aria-label="日历视图切换"
          >
            <Tab key="week" title="周" />
            <Tab key="month" title="月" />
          </Tabs>
        </CardHeader>
        <CardBody className="pt-0">
          {calendarViewMode === 'week' ? (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, index) => {
                const dateStr = formatDate(day)
                const isSelected = selectedNoteDate === dateStr
                const isToday = dateStr === todayStr
                const dayHasNote = hasNote(day)

                return (
                  <div key={dateStr} className="flex flex-col items-center">
                    <p className="text-xs text-default-500 mb-1">{weekDayLabels[index]}</p>
                    {renderDayCell(day, isSelected, isToday, dayHasNote, true, false)}
                  </div>
                )
              })}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDayLabels.map((label) => (
                  <p key={label} className="text-xs text-default-500 text-center py-1">
                    {label}
                  </p>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthWeeks.flat().map((day) => {
                  const dateStr = formatDate(day)
                  const isSelected = selectedNoteDate === dateStr
                  const isToday = dateStr === todayStr
                  const dayHasNote = hasNote(day)
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth()

                  return renderDayCell(day, isSelected, isToday, dayHasNote, isCurrentMonth, true)
                })}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="bg-content1/50 backdrop-blur">
        <CardHeader className="flex justify-between items-center py-3">
          <div>
            {noteViewMode === 'day' ? (
              <>
                <p className="text-base font-medium">{selectedDateDisplay}</p>
                <p className="text-xs text-default-500 mt-1">
                  {stats.chars} 字 · {stats.lines} 行
                  {hasUnsavedChanges && <span className="text-warning ml-2">· 未保存</span>}
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-medium">{noteWeekRangeText}</p>
                <p className="text-xs text-default-500 mt-1">
                  {hasWeekUnsavedChanges && <span className="text-warning">有未保存的更改</span>}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Tabs
              size="sm"
              selectedKey={noteViewMode}
              onSelectionChange={handleNoteViewModeChange}
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
        <CardBody className="pt-0">
          {noteViewMode === 'day' ? (
            <MarkdownEditor
              content={editContent}
              onChange={handleContentChange}
              placeholder="在这里记录你的笔记..."
            />
          ) : (
            <div className="space-y-4">
              {/* 统一工具栏 */}
              <div className="border border-divider rounded-lg overflow-hidden bg-content1">
                <EditorToolbar editor={activeEditor} />
              </div>
              {/* 七天编辑器 */}
              <div className="grid grid-cols-1 gap-4">
                {noteWeekDays.map((day, index) => renderWeekDayEditor(day, index))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
