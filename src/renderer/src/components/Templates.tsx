import { FileText, Plus, Trash2, BookOpen, Edit2, X, Save } from 'lucide-react'
import { Card, CardHeader, CardBody, Button, Input, Textarea } from '@heroui/react'
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
            <Button
              size="sm"
              variant="light"
              startContent={<Plus className="w-4 h-4" />}
              onPress={() => setShowAddTemplate(true)}
            >
              添加
            </Button>
          </div>

          {showAddTemplate && (
            <Card className="bg-content1/50 backdrop-blur mb-4">
              <CardBody className="space-y-3">
                <Input
                  size="sm"
                  placeholder="模版名称"
                  value={newTemplate.name}
                  onValueChange={(v) => setNewTemplate({ ...newTemplate, name: v })}
                />
                <Textarea
                  minRows={5}
                  placeholder="模版内容（描述报告的结构和格式）"
                  value={newTemplate.content}
                  onValueChange={(v) => setNewTemplate({ ...newTemplate, content: v })}
                  classNames={{ input: 'font-mono text-xs' }}
                />
                <div className="flex gap-2">
                  <Button size="sm" color="primary" onPress={handleAddTemplate}>
                    保存
                  </Button>
                  <Button size="sm" variant="light" onPress={() => setShowAddTemplate(false)}>
                    取消
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          <div className="space-y-3">
            {templates.map((template) => (
              <Card key={template.id} className="bg-content1/50 backdrop-blur">
                <CardHeader className="flex justify-between items-center py-3">
                  <div className="flex items-center gap-2 flex-1">
                    <FileText className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{template.name}</p>
                      {template.isBuiltin && (
                        <span className="text-xs text-default-500">内置</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => startEditingTemplate(template)}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    {!template.isBuiltin && (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => removeTemplate(template.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {editingTemplateId === template.id ? (
                  <CardBody className="pt-0 pb-3 space-y-3">
                    <Input
                      size="sm"
                      placeholder="模版名称"
                      value={editTemplateForm.name}
                      onValueChange={(v) => setEditTemplateForm({ ...editTemplateForm, name: v })}
                    />
                    <Textarea
                      minRows={6}
                      value={editTemplateForm.content}
                      onValueChange={(v) => setEditTemplateForm({ ...editTemplateForm, content: v })}
                      placeholder="模版内容（描述报告的结构和格式）"
                      classNames={{ input: 'font-mono text-xs' }}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        color="primary"
                        startContent={<Save className="w-3 h-3" />}
                        onPress={saveEditingTemplate}
                      >
                        保存
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        startContent={<X className="w-3 h-3" />}
                        onPress={cancelEditingTemplate}
                      >
                        取消
                      </Button>
                    </div>
                  </CardBody>
                ) : (
                  <CardBody className="pt-0 pb-3">
                    <pre className="text-xs text-default-500 bg-default-100 p-2 rounded overflow-auto max-h-24">
                      {template.content}
                    </pre>
                  </CardBody>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* 右侧：写作示例 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="font-medium">写作示例</h3>
          </div>

          <p className="text-xs text-default-500 mb-4">
            为每个模版添加历史写过的报告作为示例，AI 会学习你的写作风格。每个模版最多2个示例。
          </p>

          <div className="space-y-4">
            {templates.map((template) => {
              const examples = getExamplesForTemplate(template.id)
              const count = examples.length

              return (
                <Card key={template.id} className="bg-content1/50 backdrop-blur">
                  <CardHeader className="flex justify-between items-center py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-default-500" />
                      <p className="text-sm font-medium">{template.name} 示例</p>
                      <span className="text-xs text-default-500">({count}/2)</span>
                    </div>
                    {count < 2 && (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => setAddingExampleForTemplate(template.id)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardBody className="pt-0 pb-3">
                    {addingExampleForTemplate === template.id && (
                      <div className="space-y-3 mb-3 p-3 border border-divider rounded-lg bg-default-50">
                        <Input
                          size="sm"
                          placeholder="示例标题（如：12月14日日报）"
                          value={newExample.title}
                          onValueChange={(v) => setNewExample({ ...newExample, title: v })}
                        />
                        <Textarea
                          minRows={4}
                          placeholder="粘贴你之前写过的报告内容..."
                          value={newExample.content}
                          onValueChange={(v) => setNewExample({ ...newExample, content: v })}
                          classNames={{ input: 'text-xs' }}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" color="primary" onPress={handleAddExample}>
                            保存
                          </Button>
                          <Button
                            size="sm"
                            variant="light"
                            onPress={() => {
                              setAddingExampleForTemplate(null)
                              setNewExample({ title: '', content: '' })
                            }}
                          >
                            取消
                          </Button>
                        </div>
                      </div>
                    )}

                    {examples.length === 0 ? (
                      <p className="text-xs text-default-400 text-center py-4">
                        暂无示例，点击 + 添加
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {examples.map((example) => (
                          <div
                            key={example.id}
                            className="p-2 rounded bg-default-100 flex items-start justify-between"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{example.title}</p>
                              <p className="text-xs text-default-500 mt-1 line-clamp-2">
                                {example.content.slice(0, 100)}
                                {example.content.length > 100 && '...'}
                              </p>
                            </div>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="danger"
                              onPress={() => removeWritingExample(example.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
