import { FileText, Plus, Trash2, BookOpen, Edit2, X, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/stores/app-store'
import { useState } from 'react'

export function Templates() {
  const {
    templates,
    addTemplate,
    updateTemplate,
    removeTemplate,
    writingExamples,
    addWritingExample,
    removeWritingExample
  } = useAppStore()

  const [showAddTemplate, setShowAddTemplate] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '' })
  const [editTemplateForm, setEditTemplateForm] = useState({ name: '', content: '' })

  const [addingExampleForTemplate, setAddingExampleForTemplate] = useState<string | null>(null)
  const [newExample, setNewExample] = useState({ title: '', content: '' })

  // 获取某个模版的示例
  const getExamplesForTemplate = (templateId: string) => {
    return writingExamples.filter((e) => e.templateId === templateId)
  }

  const handleAddTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) return
    addTemplate({ ...newTemplate, isBuiltin: false })
    setNewTemplate({ name: '', content: '' })
    setShowAddTemplate(false)
  }

  const startEditingTemplate = (template: (typeof templates)[0]) => {
    setEditingTemplateId(template.id)
    setEditTemplateForm({ name: template.name, content: template.content })
  }

  const saveEditingTemplate = () => {
    if (editingTemplateId && editTemplateForm.name && editTemplateForm.content) {
      updateTemplate(editingTemplateId, editTemplateForm)
      setEditingTemplateId(null)
    }
  }

  const cancelEditingTemplate = () => {
    setEditingTemplateId(null)
    setEditTemplateForm({ name: '', content: '' })
  }

  const handleAddExample = () => {
    if (!addingExampleForTemplate || !newExample.title || !newExample.content) return
    const success = addWritingExample({
      templateId: addingExampleForTemplate,
      ...newExample
    })
    if (success) {
      setNewExample({ title: '', content: '' })
      setAddingExampleForTemplate(null)
    } else {
      alert('每个模版最多只能添加2个示例')
    }
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <h2 className="text-lg font-medium mb-6">模版中心</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* 左侧：报告模版 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-medium">报告模版</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowAddTemplate(true)}>
              <Plus className="w-4 h-4 mr-1" />
              添加
            </Button>
          </div>

          {/* 添加新模版表单 */}
          {showAddTemplate && (
            <Card className="bg-card/50 backdrop-blur mb-4">
              <CardContent className="pt-4 space-y-3">
                <Input
                  placeholder="模版名称"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                />
                <Textarea
                  placeholder="模版内容（描述报告的结构和格式）"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  className="min-h-[120px] font-mono text-xs"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddTemplate}>
                    保存
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddTemplate(false)}>
                    取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {templates.map((template) => (
              <Card key={template.id} className="bg-card/50 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <div className="flex items-center gap-2 flex-1">
                    <FileText className="w-4 h-4 text-primary" />
                    <div>
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                      {template.isBuiltin && (
                        <span className="text-xs text-muted-foreground">内置</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => startEditingTemplate(template)}
                      title="编辑模版"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    {!template.isBuiltin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeTemplate(template.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {/* 编辑模版表单 */}
                {editingTemplateId === template.id ? (
                  <CardContent className="pt-0 pb-3 space-y-3">
                    <Input
                      placeholder="模版名称"
                      value={editTemplateForm.name}
                      onChange={(e) => setEditTemplateForm({ ...editTemplateForm, name: e.target.value })}
                      className="h-8"
                    />
                    <Textarea
                      value={editTemplateForm.content}
                      onChange={(e) => setEditTemplateForm({ ...editTemplateForm, content: e.target.value })}
                      className="min-h-[150px] font-mono text-xs"
                      placeholder="模版内容（描述报告的结构和格式）"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEditingTemplate}>
                        <Save className="w-3 h-3 mr-1" />
                        保存
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEditingTemplate}>
                        <X className="w-3 h-3 mr-1" />
                        取消
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="pt-0 pb-3">
                    <pre className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded overflow-auto max-h-24">
                      {template.content}
                    </pre>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* 右侧：写作示例（按模版分组） */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="font-medium">写作示例</h3>
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            为每个模版添加历史写过的报告作为示例，AI 会学习你的写作风格。每个模版最多2个示例。
          </p>

          <div className="space-y-4">
            {templates.map((template) => {
              const examples = getExamplesForTemplate(template.id)
              const count = examples.length

              return (
                <Card key={template.id} className="bg-card/50 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-sm">{template.name} 示例</CardTitle>
                      <span className="text-xs text-muted-foreground">({count}/2)</span>
                    </div>
                    {count < 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAddingExampleForTemplate(template.id)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    {/* 添加示例表单 */}
                    {addingExampleForTemplate === template.id && (
                      <div className="space-y-3 mb-3 p-3 border rounded-lg bg-secondary/20">
                        <Input
                          placeholder="示例标题（如：12月14日日报）"
                          value={newExample.title}
                          onChange={(e) => setNewExample({ ...newExample, title: e.target.value })}
                          className="h-8"
                        />
                        <Textarea
                          placeholder="粘贴你之前写过的报告内容..."
                          value={newExample.content}
                          onChange={(e) => setNewExample({ ...newExample, content: e.target.value })}
                          className="min-h-[100px] text-xs"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleAddExample}>
                            保存
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAddingExampleForTemplate(null)
                              setNewExample({ title: '', content: '' })
                            }}
                          >
                            取消
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* 示例列表 */}
                    {examples.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 text-center py-4">
                        暂无示例，点击 + 添加
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {examples.map((example) => (
                          <div
                            key={example.id}
                            className="p-2 rounded bg-secondary/30 flex items-start justify-between"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{example.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {example.content.slice(0, 100)}
                                {example.content.length > 100 && '...'}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={() => removeWritingExample(example.id)}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
