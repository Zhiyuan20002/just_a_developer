import {
  Sparkles,
  Copy,
  Download,
  ChevronDown,
  Square,
  Save
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
import { useState, useEffect, useRef, useMemo } from 'react'
import { MarkdownEditor } from './MarkdownEditor'
import { deriveWeekRangeFromDates, getWeekRangeText, getWeeklyReportTitle } from '@/lib/report'

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

export function Composer() {
  const {
    commits,
    selectedCommits,
    templates,
    selectedTemplate,
    setSelectedTemplate,
    generatedContent,
    setGeneratedContent,
    isGenerating,
    setIsGenerating,
    writingExamples,
    repositories,
    currentDateFilter,
    setFilterTemplate,
    apiStatus,
    notes,
    selectedNotes,
    saveWeeklyReport,
    weeklyReports,
    selectedAuthor
  } = useAppStore()

  const [copied, setCopied] = useState(false)
  const [isSavingReport, setIsSavingReport] = useState(false)
  const generatedContentRef = useRef('')

  useEffect(() => {
    const handleChunk = (_event: unknown, chunk: string) => {
      generatedContentRef.current += chunk
      setGeneratedContent(generatedContentRef.current)
    }
    const handleDone = () => setIsGenerating(false)
    const handleError = (_event: unknown, error: string) => {
      console.error('AI 流式生成错误:', error)
      setIsGenerating(false)
    }
    const handleStopped = () => setIsGenerating(false)

    window.electron.ipcRenderer.on('generate-report-chunk', handleChunk)
    window.electron.ipcRenderer.on('generate-report-stopped', handleStopped)
    window.electron.ipcRenderer.on('generate-report-done', handleDone)
    window.electron.ipcRenderer.on('generate-report-error', handleError)

    return () => {
      window.electron.ipcRenderer.removeAllListeners('generate-report-chunk')
      window.electron.ipcRenderer.removeAllListeners('generate-report-done')
      window.electron.ipcRenderer.removeAllListeners('generate-report-error')
      window.electron.ipcRenderer.removeAllListeners('generate-report-stopped')
    }
  }, [setGeneratedContent, setIsGenerating])

  const selectedCommitData = useMemo(
    () => commits.filter((commit) => selectedCommits.includes(commit.hash)),
    [commits, selectedCommits]
  )
  const selectedNotesData = useMemo(
    () => notes.filter((note) => selectedNotes.includes(note.date)),
    [notes, selectedNotes]
  )
  const currentTemplate = templates.find((template) => template.id === selectedTemplate)
  const isWeeklyReport =
    currentTemplate?.id === 'weekly' || currentTemplate?.name?.includes('周报') || false

  const draftWeekRange = useMemo(() => {
    const dateValues = [
      ...selectedCommitData.map((commit) => commit.date),
      ...selectedNotesData.map((note) => note.date)
    ]
    return deriveWeekRangeFromDates(dateValues)
  }, [selectedCommitData, selectedNotesData])

  const existingWeeklyReport = useMemo(
    () => weeklyReports.find((report) => report.weekStart === draftWeekRange.weekStart),
    [weeklyReports, draftWeekRange.weekStart]
  )

  const groupCommitsByRepo = (commitList: Commit[]) => {
    const groups: Record<string, { name: string; description?: string; commits: Commit[] }> = {}
    commitList.forEach((commit) => {
      const repoKey = commit.repoId || 'unknown'
      if (!groups[repoKey]) {
        const repo = repositories.find((repository) => repository.id === commit.repoId)
        groups[repoKey] = {
          name: repo?.alias || repo?.name || commit.repoName || '未知项目',
          description: repo?.description || commit.repoDescription,
          commits: []
        }
      }
      groups[repoKey].commits.push(commit)
    })
    return groups
  }

  const generateCommitListByRepo = (commitList: Commit[]) => {
    const groups = groupCommitsByRepo(commitList)
    let result = ''
    Object.entries(groups).forEach(([, group]) => {
      result += `### ${group.name}\n`
      if (group.description) result += `> ${group.description}\n\n`
      group.commits.forEach((commit) => {
        result += `- ${commit.message} (${commit.hash.slice(0, 7)})\n`
      })
      result += '\n'
    })
    return result.trim()
  }

  const generateProjectContext = (commitList: Commit[]) => {
    const groups = groupCommitsByRepo(commitList)
    let context = '涉及的项目：\n'
    Object.entries(groups).forEach(([, group]) => {
      context += `- ${group.name}`
      if (group.description) context += `：${group.description}`
      context += '\n'
    })
    return context
  }

  const handleGenerate = async () => {
    if (selectedCommitData.length === 0 && selectedNotes.length === 0) return
    setIsGenerating(true)

    const commitList = generateCommitListByRepo(selectedCommitData)
    const projectContext = generateProjectContext(selectedCommitData)
    const totalAdditions = selectedCommitData.reduce((sum, commit) => sum + commit.additions, 0)
    const totalDeletions = selectedCommitData.reduce((sum, commit) => sum + commit.deletions, 0)

    let notesText = '暂无笔记'
    let notesCount = 0
    let notesLines = 0

    if (selectedNotesData.length > 0) {
      notesText = selectedNotesData
        .map((note) => {
          const date = new Date(note.date)
          const dateStr = date.toLocaleDateString('zh-CN', {
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })
          return `### ${dateStr}\n${note.content}`
        })
        .join('\n\n')
      notesCount = selectedNotesData.length
      notesLines = selectedNotesData.reduce(
        (sum, note) => sum + (note.content ? note.content.split('\n').length : 0),
        0
      )
    }

    const relevantExamples = writingExamples.filter((example) => example.templateId === currentTemplate?.id)
    let examplesText = '暂无写作示例'
    if (relevantExamples.length > 0) {
      examplesText = relevantExamples.map((example) => `### ${example.title}\n${example.content}`).join('\n\n')
    }

    const templateContent = currentTemplate?.content || ''

    if (apiStatus === 'connected') {
      try {
        let systemPrompt = await window.electron.ipcRenderer.invoke('get-system-prompt')
        if (!systemPrompt) systemPrompt = DEFAULT_SYSTEM_PROMPT

        const finalPrompt = systemPrompt
          .replace(/\{\{template\}\}/g, templateContent)
          .replace(/\{\{commit_list\}\}/g, commitList)
          .replace(/\{\{project_context\}\}/g, projectContext)
          .replace(/\{\{writing_examples\}\}/g, examplesText)
          .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('zh-CN'))
          .replace(/\{\{additions\}\}/g, String(totalAdditions))
          .replace(/\{\{deletions\}\}/g, String(totalDeletions))
          .replace(/\{\{notes\}\}/g, notesText)
          .replace(/\{\{notes_count\}\}/g, String(notesCount))
          .replace(/\{\{notes_lines\}\}/g, String(notesLines))

        const provider = await window.electron.ipcRenderer.invoke('get-current-provider')
        const model = await window.electron.ipcRenderer.invoke('get-selected-model')

        if (provider && model) {
          generatedContentRef.current = ''
          setGeneratedContent('')
          window.electron.ipcRenderer.send('generate-report-stream', {
            prompt: finalPrompt,
            provider,
            model
          })
          return
        }
      } catch (error) {
        console.error('调用 AI 失败:', error)
        setIsGenerating(false)
      }
    }

    let content = ''
    if (isWeeklyReport) {
      content = `# 本周完成工作\n${commitList}\n\n# 本周工作总结\n本周共完成 ${selectedCommitData.length} 次提交，新增代码 ${totalAdditions} 行，删除代码 ${totalDeletions} 行。\n${projectContext}\n\n# 下周工作计划\n- 待补充`
    } else {
      content = `# 今日完成工作\n${commitList}\n\n# 今日工作总结\n今日共完成 ${selectedCommitData.length} 次提交，新增代码 ${totalAdditions} 行，删除代码 ${totalDeletions} 行。\n${projectContext}\n\n# 明日工作计划\n- 待补充`
    }

    generatedContentRef.current = content
    setGeneratedContent(content)
    setIsGenerating(false)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExport = () => {
    const blob = new Blob([generatedContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleStopGenerate = () => {
    window.electron.ipcRenderer.send('stop-generate-report')
  }

  const handleSaveWeeklyReport = async () => {
    if (!generatedContent || !isWeeklyReport) return

    setIsSavingReport(true)
    try {
      await saveWeeklyReport({
        id: existingWeeklyReport?.id,
        title: existingWeeklyReport?.title || getWeeklyReportTitle(draftWeekRange.weekStart),
        weekStart: draftWeekRange.weekStart,
        weekEnd: draftWeekRange.weekEnd,
        content: generatedContent,
        templateId: currentTemplate?.id || null,
        author: selectedAuthor,
        sourceCommits: selectedCommitData,
        sourceNotes: selectedNotesData,
        splitTargetDates: existingWeeklyReport?.splitTargetDates || [],
        splitStatus: existingWeeklyReport?.splitStatus || 'not_split'
      })
    } finally {
      setIsSavingReport(false)
    }
  }

  const handleDraftChange = (content: string) => {
    generatedContentRef.current = content
    setGeneratedContent(content)
  }

  const involvedRepos = new Set(selectedCommitData.map((commit) => commit.repoId).filter(Boolean))
  const hasSelection = selectedCommits.length > 0 || selectedNotes.length > 0

  return (
    <div className="w-[420px] flex flex-col m-2 ml-0 sidebar-float rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-divider">
        <h3 className="font-medium">周报生成器</h3>
        <p className="text-xs text-default-500 mt-1">
          已选择 {selectedCommits.length} 条提交
          {selectedNotes.length > 0 && `、${selectedNotes.length} 篇笔记`}
          {involvedRepos.size > 0 && `，涉及 ${involvedRepos.size} 个项目`}
        </p>
        {isWeeklyReport && (
          <p className="text-xs text-default-400 mt-1">
            当前周次：{getWeekRangeText(draftWeekRange.weekStart, draftWeekRange.weekEnd)}
          </p>
        )}
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div className="flex items-center justify-between mb-4 gap-3">
          <span className="text-sm text-default-500 whitespace-nowrap">当前模版</span>
          <Dropdown>
            <DropdownTrigger>
              <Button variant="bordered" size="sm" className="flex-1 justify-between">
                {currentTemplate?.name || '选择模版'}
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="选择模版"
              selectionMode="single"
              selectedKeys={selectedTemplate ? [selectedTemplate] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string
                if (selected) {
                  setSelectedTemplate(selected)
                  if (currentDateFilter) {
                    setFilterTemplate(currentDateFilter, selected)
                  }
                }
              }}
            >
              {templates.map((template) => (
                <DropdownItem key={template.id}>
                  {template.name}
                  {template.isBuiltin && (
                    <span className="ml-2 text-xs text-default-400">(内置)</span>
                  )}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            color="primary"
            className="flex-1"
            isDisabled={!hasSelection || isGenerating}
            isLoading={isGenerating}
            startContent={!isGenerating && <Sparkles className="w-4 h-4" />}
            onPress={handleGenerate}
          >
            {isGenerating ? '生成中...' : '生成报告'}
          </Button>
          {isGenerating && (
            <Button isIconOnly color="danger" onPress={handleStopGenerate}>
              <Square className="w-4 h-4" />
            </Button>
          )}
        </div>

        {generatedContent && (
          <Card className="card-flat">
            <CardHeader className="py-3 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">生成结果</p>
                {isWeeklyReport && (
                  <p className="text-xs text-default-400 mt-1">
                    {existingWeeklyReport ? '保存后将更新历史周报' : '可保存为新的历史周报'}
                  </p>
                )}
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                <Button size="sm" variant="light" startContent={<Copy className="w-4 h-4" />} onPress={handleCopy}>
                  {copied ? '已复制' : '复制'}
                </Button>
                <Button
                  size="sm"
                  variant="light"
                  startContent={<Save className="w-4 h-4" />}
                  isDisabled={!isWeeklyReport || isSavingReport}
                  isLoading={isSavingReport}
                  onPress={handleSaveWeeklyReport}
                >
                  {existingWeeklyReport ? '更新历史' : '保存历史'}
                </Button>
                <Button
                  size="sm"
                  variant="light"
                  startContent={<Download className="w-4 h-4" />}
                  onPress={handleExport}
                >
                  导出
                </Button>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <MarkdownEditor
                content={generatedContent}
                onChange={handleDraftChange}
                placeholder="生成后的周报会显示在这里..."
                minHeight="420px"
              />
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}
