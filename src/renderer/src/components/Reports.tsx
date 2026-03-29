import { useEffect, useMemo, useState } from 'react'
import { Button, Card, CardBody, CardHeader } from '@heroui/react'
import { Copy, Save, SplitSquareVertical, FileText } from 'lucide-react'
import { useAppStore, Commit, Note } from '@/stores/app-store'
import {
  getSplitTargetDates,
  formatDateKey,
  getWeekRangeText,
  SplitDailyNoteDraft,
  splitWeeklyReportToDailyNotes
} from '@/lib/report'
import { MarkdownEditor } from './MarkdownEditor'

function groupReportsByMonth<T extends { weekStart: string }>(reports: T[]) {
  return reports.reduce<Record<string, T[]>>((groups, report) => {
    const date = new Date(report.weekStart)
    const monthKey = `${date.getFullYear()}年${date.getMonth() + 1}月`
    if (!groups[monthKey]) {
      groups[monthKey] = []
    }
    groups[monthKey].push(report)
    return groups
  }, {})
}

function groupCommitsByDate(commits: Commit[]) {
  const groups = new Map<string, Commit[]>()
  commits.forEach((commit) => {
    const dateKey = formatDateKey(new Date(commit.date))
    const current = groups.get(dateKey) || []
    current.push(commit)
    groups.set(dateKey, current)
  })
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))
}

export function Reports() {
  const {
    weeklyReports,
    selectedWeeklyReportId,
    setSelectedWeeklyReportId,
    saveWeeklyReport,
    notes,
    addOrUpdateNote,
    apiStatus
  } = useAppStore()

  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSplitting, setIsSplitting] = useState(false)

  const selectedReport = useMemo(
    () => weeklyReports.find((report) => report.id === selectedWeeklyReportId) || weeklyReports[0] || null,
    [weeklyReports, selectedWeeklyReportId]
  )

  useEffect(() => {
    if (!selectedWeeklyReportId && weeklyReports.length > 0) {
      setSelectedWeeklyReportId(weeklyReports[0].id)
    }
  }, [selectedWeeklyReportId, setSelectedWeeklyReportId, weeklyReports])

  useEffect(() => {
    if (selectedReport) {
      setDraftTitle(selectedReport.title)
      setDraftContent(selectedReport.content)
      setIsDirty(false)
    } else {
      setDraftTitle('')
      setDraftContent('')
      setIsDirty(false)
    }
  }, [selectedReport])

  const groupedReports = useMemo(() => groupReportsByMonth(weeklyReports), [weeklyReports])
  const commitGroups = useMemo(
    () => (selectedReport ? groupCommitsByDate(selectedReport.sourceCommits) : []),
    [selectedReport]
  )
  const sourceNotes = useMemo(
    () =>
      selectedReport
        ? selectedReport.sourceNotes.filter((note) => note.content && note.content.trim())
        : [],
    [selectedReport]
  )
  const splitPreview = useMemo(() => {
    if (!selectedReport) return null
    return splitWeeklyReportToDailyNotes(selectedReport, notes)
  }, [notes, selectedReport])

  const splitTargetDates = useMemo(() => {
    if (!selectedReport) return []
    return getSplitTargetDates(selectedReport.weekStart, selectedReport.sourceNotes, notes).targetDates
  }, [notes, selectedReport])

  const handleCopy = async () => {
    if (!draftContent) return
    await navigator.clipboard.writeText(draftContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    if (!selectedReport) return

    setIsSaving(true)
    try {
      await saveWeeklyReport({
        id: selectedReport.id,
        title: draftTitle.trim() || selectedReport.title,
        weekStart: selectedReport.weekStart,
        weekEnd: selectedReport.weekEnd,
        content: draftContent,
        templateId: selectedReport.templateId,
        author: selectedReport.author,
        sourceCommits: selectedReport.sourceCommits,
        sourceNotes: selectedReport.sourceNotes,
        splitTargetDates: selectedReport.splitTargetDates,
        splitStatus: selectedReport.splitStatus
      })
      setIsDirty(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSplit = async () => {
    if (!selectedReport || !splitPreview) return

    setIsSplitting(true)
    try {
      let notesToSave = splitPreview.generatedNotes

      if (apiStatus === 'connected' && splitPreview.generatedNotes.length > 0) {
        const provider = await window.electron.ipcRenderer.invoke('get-current-provider')
        const model = await window.electron.ipcRenderer.invoke('get-selected-model')

        if (provider && model) {
          const aiGeneratedNotes: SplitDailyNoteDraft[] = []
          for (const note of splitPreview.generatedNotes) {
              const dayCommits = selectedReport.sourceCommits.filter(
                (commit) => formatDateKey(new Date(commit.date)) === note.date
              )
              const dayNote = selectedReport.sourceNotes.find((sourceNote) => sourceNote.date === note.date)
              const prompt = `你是一个专业的工作日报拆分助手。请根据给定的周报和某一天的上下文，生成该日期对应的一篇日报 Markdown。

要求：
- 必须使用中文
- 只输出该日期的日报正文，不要解释
- 不要重复整周总结，只写当天内容
- 保持清晰、简洁、专业
- 如果当天是加班日，也按照日报形式输出
- 沿用这份结构：
# 今日完成工作
# 今日工作总结
# 补充记录
# 明日工作计划

周报标题：${draftTitle.trim() || selectedReport.title}
周报全文：
${draftContent}

目标日期：${note.date}
当天提交：
${dayCommits.length > 0 ? dayCommits.map((commit) => `- ${commit.message} (${commit.hash.slice(0, 7)})`).join('\n') : '- 无提交记录'}

当天笔记：
${dayNote?.content?.trim() || '无'}
`

              const result = await window.electron.ipcRenderer.invoke('generate-text', {
                prompt,
                provider,
                model
              })

              const content =
                result?.content && typeof result.content === 'string'
                  ? result.content.trim()
                  : note.content

              aiGeneratedNotes.push({
                ...note,
                content
              })
          }
          notesToSave = aiGeneratedNotes
        }
      }

      notesToSave.forEach((note) => {
        addOrUpdateNote(note.date, note.content)
      })

      const completedCount =
        notesToSave.length + splitPreview.skippedExistingDates.length
      const splitStatus =
        completedCount === splitTargetDates.length ? 'completed' : 'partial'

      await saveWeeklyReport({
        id: selectedReport.id,
        title: draftTitle.trim() || selectedReport.title,
        weekStart: selectedReport.weekStart,
        weekEnd: selectedReport.weekEnd,
        content: draftContent,
        templateId: selectedReport.templateId,
        author: selectedReport.author,
        sourceCommits: selectedReport.sourceCommits,
        sourceNotes: selectedReport.sourceNotes,
        splitTargetDates: splitTargetDates,
        splitStatus
      })
    } finally {
      setIsSplitting(false)
    }
  }

  return (
    <div className="flex-1 p-6 flex gap-6 overflow-hidden">
      <Card className="card-flat w-72 flex flex-col">
        <CardHeader className="pb-2">
          <div>
            <p className="text-base font-medium">历史周报</p>
            <p className="text-xs text-default-400 mt-1">按月份查看和管理每周周报</p>
          </div>
        </CardHeader>
        <CardBody className="pt-0 overflow-auto">
          {weeklyReports.length === 0 ? (
            <div className="text-center py-12 text-default-500">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>暂无历史周报</p>
              <p className="text-sm mt-1">先在首页生成并保存一份周报</p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(groupedReports).map(([monthKey, reports]) => (
                <div key={monthKey}>
                  <p className="text-xs text-default-400 mb-2">{monthKey}</p>
                  <div className="space-y-2">
                    {reports.map((report) => {
                      const isActive = report.id === selectedReport?.id
                      return (
                        <button
                          key={report.id}
                          type="button"
                          onClick={() => setSelectedWeeklyReportId(report.id)}
                          className={`w-full text-left rounded-lg border px-3 py-3 transition-all ${
                            isActive
                              ? 'border-primary bg-primary/5'
                              : 'border-transparent hover:bg-default-100'
                          }`}
                        >
                          <p className="text-sm font-medium">{report.title}</p>
                          <p className="text-xs text-default-500 mt-1">
                            {getWeekRangeText(report.weekStart, report.weekEnd)}
                          </p>
                          <p className="text-[11px] text-default-400 mt-1">
                            {report.splitStatus === 'completed'
                              ? '已拆分日报'
                              : report.splitStatus === 'partial'
                                ? '部分拆分'
                                : '未拆分'}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="card-flat w-80 flex flex-col">
        <CardHeader className="pb-2">
          <div>
            <p className="text-base font-medium">周上下文</p>
            <p className="text-xs text-default-400 mt-1">
              {selectedReport ? getWeekRangeText(selectedReport.weekStart, selectedReport.weekEnd) : '选择一份周报查看'}
            </p>
          </div>
        </CardHeader>
        <CardBody className="pt-0 overflow-auto">
          {!selectedReport ? (
            <div className="text-sm text-default-400">暂无可查看的周报内容</div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium mb-2">Git 提交记录</p>
                {commitGroups.length === 0 ? (
                  <p className="text-sm text-default-400">保存该周报时没有附带提交快照</p>
                ) : (
                  <div className="space-y-3">
                    {commitGroups.map(([date, commits]) => (
                      <div key={date}>
                        <p className="text-xs text-default-400 mb-1">{date}</p>
                        <div className="space-y-2">
                          {commits.map((commit) => (
                            <div key={commit.hash} className="rounded-lg bg-default-50 px-3 py-2">
                              <p className="text-sm">{commit.message}</p>
                              <p className="text-xs text-default-500 mt-1">
                                {commit.repoName || '未知项目'} · {commit.author}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">关联笔记</p>
                {sourceNotes.length === 0 ? (
                  <p className="text-sm text-default-400">该周报未保存额外笔记快照</p>
                ) : (
                  <div className="space-y-2">
                    {sourceNotes.map((note: Note) => (
                      <div key={note.date} className="rounded-lg bg-default-50 px-3 py-2">
                        <p className="text-xs text-default-400">{note.date}</p>
                        <p className="text-sm mt-1 line-clamp-3">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {splitPreview && (
                <div>
                  <p className="text-sm font-medium mb-2">拆分预览</p>
                  <div className="rounded-lg bg-default-50 px-3 py-3 text-sm space-y-1">
                    <p>工作日 {splitPreview.workdayDates.length} 天</p>
                    <p>加班日 {splitPreview.overtimeDates.length} 天</p>
                    <p>可生成日报 {splitPreview.generatedNotes.length} 篇</p>
                    <p>已有笔记跳过 {splitPreview.skippedExistingDates.length} 天</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="card-flat flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-3 flex justify-between items-center gap-4">
          {!selectedReport ? (
            <div>
              <p className="text-base font-medium">周报内容</p>
              <p className="text-xs text-default-400 mt-1">选择左侧历史周报开始查看</p>
            </div>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <input
                  value={draftTitle}
                  onChange={(event) => {
                    setDraftTitle(event.target.value)
                    setIsDirty(true)
                  }}
                  className="w-full bg-transparent text-base font-medium outline-none"
                  placeholder="输入周报标题"
                />
                <p className="text-xs text-default-400 mt-1">
                  更新于 {new Date(selectedReport.updatedAt).toLocaleString('zh-CN')}
                  {isDirty && <span className="text-warning ml-2">未保存</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="light" startContent={<Copy className="w-4 h-4" />} onPress={handleCopy}>
                  {copied ? '已复制' : '复制'}
                </Button>
                <Button
                  size="sm"
                  variant="light"
                  startContent={<SplitSquareVertical className="w-4 h-4" />}
                  isDisabled={!splitPreview || splitPreview.targetDates.length === 0 || isSplitting}
                  isLoading={isSplitting}
                  onPress={handleSplit}
                >
                  拆分日报
                </Button>
                <Button
                  size="sm"
                  color="primary"
                  startContent={<Save className="w-4 h-4" />}
                  isDisabled={!selectedReport || !isDirty || isSaving}
                  isLoading={isSaving}
                  onPress={handleSave}
                >
                  保存
                </Button>
              </div>
            </>
          )}
        </CardHeader>
        <CardBody className="pt-0 flex-1 overflow-hidden">
          {selectedReport ? (
            <MarkdownEditor
              content={draftContent}
              onChange={(content) => {
                setDraftContent(content)
                setIsDirty(true)
              }}
              placeholder="编辑周报内容..."
            />
          ) : (
            <div className="h-full flex items-center justify-center text-default-400">
              暂无选中的周报
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
