import { Sparkles, Copy, Download, Check, ChevronDown, Square } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore, Commit } from '@/stores/app-store'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

// 默认系统提示词（与 Settings 中保持一致，包含所有变量）
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
    apiStatus
  } = useAppStore()

  const [copied, setCopied] = useState(false)
  const generatedContentRef = useRef('')

  // 监听流式生成事件
  useEffect(() => {
    const handleChunk = (_event: unknown, chunk: string) => {
      console.log('渲染进程收到 chunk:', chunk.substring(0, 30) + '...')
      generatedContentRef.current += chunk
      setGeneratedContent(generatedContentRef.current)
    }

    const handleDone = () => {
      console.log('渲染进程收到 done 事件')
      setIsGenerating(false)
    }

    const handleError = (_event: unknown, error: string) => {
      console.error('AI 流式生成错误:', error)
      setIsGenerating(false)
    }

    const handleStopped = () => {
      console.log('渲染进程收到 stopped 事件')
      setIsGenerating(false)
    }

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

  const selectedCommitData = commits.filter((c) => selectedCommits.includes(c.hash))
  const currentTemplate = templates.find((t) => t.id === selectedTemplate)

  // 按项目分组提交
  const groupCommitsByRepo = (commits: Commit[]) => {
    const groups: Record<string, { name: string; description?: string; commits: Commit[] }> = {}

    commits.forEach((commit) => {
      const repoKey = commit.repoId || 'unknown'
      if (!groups[repoKey]) {
        // 从 repositories 中获取完整信息
        const repo = repositories.find((r) => r.id === commit.repoId)
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

  // 生成按项目分组的提交列表
  const generateCommitListByRepo = (commits: Commit[]) => {
    const groups = groupCommitsByRepo(commits)
    let result = ''

    Object.entries(groups).forEach(([, group]) => {
      result += `### ${group.name}\n`
      if (group.description) {
        result += `> ${group.description}\n\n`
      }
      group.commits.forEach((c) => {
        result += `- ${c.message} (${c.hash.slice(0, 7)})\n`
      })
      result += '\n'
    })

    return result.trim()
  }

  // 生成项目上下文信息（用于 AI 提示词）
  const generateProjectContext = (commits: Commit[]) => {
    const groups = groupCommitsByRepo(commits)
    let context = '涉及的项目：\n'

    Object.entries(groups).forEach(([, group]) => {
      context += `- ${group.name}`
      if (group.description) {
        context += `：${group.description}`
      }
      context += '\n'
    })

    return context
  }

  const handleGenerate = async () => {
    if (selectedCommitData.length === 0) return

    setIsGenerating(true)

    // 生成按项目分组的提交列表
    const commitList = generateCommitListByRepo(selectedCommitData)

    // 生成项目上下文
    const projectContext = generateProjectContext(selectedCommitData)

    const totalAdditions = selectedCommitData.reduce((sum, c) => sum + c.additions, 0)
    const totalDeletions = selectedCommitData.reduce((sum, c) => sum + c.deletions, 0)

    // 获取当前模版的写作示例
    const relevantExamples = writingExamples.filter(
      (e) => e.templateId === currentTemplate?.id
    )

    // 构建写作示例文本
    let examplesText = '暂无写作示例'
    if (relevantExamples.length > 0) {
      examplesText = relevantExamples
        .map((e) => `### ${e.title}\n${e.content}`)
        .join('\n\n')
    }

    // 获取模版内容
    const templateContent = currentTemplate?.content || ''

    // 如果 API 已连接，调用 AI 流式生成
    if (apiStatus === 'connected') {
      try {
        // 获取保存的系统提示词
        let systemPrompt = await window.electron.ipcRenderer.invoke('get-system-prompt')
        if (!systemPrompt) {
          systemPrompt = DEFAULT_SYSTEM_PROMPT
        }

        // 替换系统提示词中的变量（使用全局替换）
        const finalPrompt = systemPrompt
          .replace(/\{\{template\}\}/g, templateContent)
          .replace(/\{\{commit_list\}\}/g, commitList)
          .replace(/\{\{project_context\}\}/g, projectContext)
          .replace(/\{\{writing_examples\}\}/g, examplesText)
          .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('zh-CN'))
          .replace(/\{\{additions\}\}/g, String(totalAdditions))
          .replace(/\{\{deletions\}\}/g, String(totalDeletions))

        // 获取当前供应商和模型
        const provider = await window.electron.ipcRenderer.invoke('get-current-provider')
        const model = await window.electron.ipcRenderer.invoke('get-selected-model')

        // 打印完整提示词和模型信息
        console.log('=== 生成报告请求 ===')
        console.log('供应商:', provider)
        console.log('模型:', model)
        console.log('完整提示词:')
        console.log(finalPrompt)
        console.log('==================')

        if (provider && model) {
          // 清空之前的内容，准备流式接收
          generatedContentRef.current = ''
          setGeneratedContent('')

          // 使用 send 发送流式请求
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
        // 失败时回退到本地生成
      }
    }

    // 本地生成（无 AI 或 AI 失败时的回退方案）
    const isWeekly = currentTemplate?.id === 'weekly' || currentTemplate?.name?.includes('周报')

    let content = ''
    if (isWeekly) {
      content = `# 本周完成工作
${commitList}

# 本周工作总结
本周共完成 ${selectedCommitData.length} 次提交，新增代码 ${totalAdditions} 行，删除代码 ${totalDeletions} 行。
${projectContext}

# 下周工作计划
- 待补充`
    } else {
      content = `# 今日完成工作
${commitList}

# 今日工作总结
今日共完成 ${selectedCommitData.length} 次提交，新增代码 ${totalAdditions} 行，删除代码 ${totalDeletions} 行。
${projectContext}

# 明日工作计划
- 待补充`
    }

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

  // 统计涉及的项目数
  const involvedRepos = new Set(selectedCommitData.map((c) => c.repoId).filter(Boolean))

  return (
    <div className="w-96 border-l border-border/50 flex flex-col bg-card/30">
      <div className="p-4 border-b border-border/50">
        <h3 className="font-medium">生成编辑器</h3>
        <p className="text-xs text-muted-foreground mt-1">
          已选择 {selectedCommits.length} 条提交
          {involvedRepos.size > 0 && `，涉及 ${involvedRepos.size} 个项目`}
        </p>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div className="flex items-center justify-between mb-4 gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">当前模版</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 justify-between">
                <span>{currentTemplate?.name || '选择模版'}</span>
                <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[180px]">
              {templates.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template.id)
                    // 自动关联到当前日期筛选
                    if (currentDateFilter) {
                      setFilterTemplate(currentDateFilter, template.id)
                    }
                  }}
                  className={cn(
                    'cursor-pointer',
                    selectedTemplate === template.id && 'bg-primary/10'
                  )}
                >
                  {template.name}
                  {template.isBuiltin && (
                    <span className="ml-2 text-xs text-muted-foreground">(内置)</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            onClick={handleGenerate}
            disabled={selectedCommits.length === 0 || isGenerating}
            className={cn(
              'flex-1 relative overflow-hidden',
              isGenerating && 'animate-shimmer'
            )}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating ? '生成中...' : '生成报告'}
          </Button>
          {isGenerating && (
            <Button
              variant="destructive"
              size="icon"
              onClick={handleStopGenerate}
              title="停止生成"
            >
              <Square className="w-4 h-4" />
            </Button>
          )}
        </div>

        {generatedContent && (
          <Card className="bg-card/50">
            <CardHeader className="py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">生成结果</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExport}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                readOnly={isGenerating}
                className={cn(
                  'min-h-[300px] font-mono text-xs',
                  isGenerating && 'opacity-80 cursor-not-allowed'
                )}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
