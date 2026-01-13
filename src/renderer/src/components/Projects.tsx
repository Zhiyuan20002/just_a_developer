import { FolderGit2, Trash2, FolderOpen, RefreshCw, Edit2, X, Save } from 'lucide-react'
import { Card, CardHeader, CardBody, Button, Input, Textarea, Checkbox } from '@heroui/react'
import { useAppStore } from '@/stores/app-store'
import { useState } from 'react'

export function Projects() {
  const {
    repositories,
    removeRepository,
    toggleRepository,
    addRepository,
    setCommits,
    updateRepository
  } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ alias: '', description: '' })

  const handleAddLocalRepo = async () => {
    const result = await window.electron.ipcRenderer.invoke('select-folder')
    if (result) {
      addRepository({
        name: result.name,
        path: result.path,
        type: 'local'
      })
      setTimeout(() => handleRefreshCommits(), 100)
    }
  }

  const handleRefreshCommits = async () => {
    const selectedRepos = repositories.filter((r) => r.selected)
    if (selectedRepos.length === 0) return

    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allCommits: any[] = []

    for (const repo of selectedRepos) {
      const result = await window.electron.ipcRenderer.invoke(
        'get-commits',
        repo.path,
        '1 week ago'
      )
      if (result.commits) {
        const commitsWithRepo = result.commits.map((c: any) => ({
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
    setLoading(false)
  }

  const startEditing = (repo: (typeof repositories)[0]) => {
    setEditingId(repo.id)
    setEditForm({
      alias: repo.alias || '',
      description: repo.description || ''
    })
  }

  const saveEditing = () => {
    if (editingId) {
      updateRepository(editingId, {
        alias: editForm.alias || undefined,
        description: editForm.description || undefined
      })
      setEditingId(null)
    }
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm({ alias: '', description: '' })
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium">项目库</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="bordered"
            isLoading={loading}
            startContent={!loading && <RefreshCw className="w-4 h-4" />}
            onPress={handleRefreshCommits}
          >
            刷新提交
          </Button>
          <Button
            size="sm"
            color="primary"
            startContent={<FolderOpen className="w-4 h-4" />}
            onPress={handleAddLocalRepo}
          >
            添加本地仓库
          </Button>
        </div>
      </div>

      <p className="text-sm text-default-500 mb-4">
        为项目设置别名和描述，帮助 AI 更好地理解每个项目的用途，生成更准确的报告。
      </p>

      {repositories.length === 0 ? (
        <Card className="card-flat">
          <CardBody className="py-12">
            <div className="text-center text-default-500">
              <FolderGit2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无项目</p>
              <p className="text-sm mt-1">点击上方按钮添加本地 Git 仓库</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {repositories.map((repo) => (
            <Card
              key={repo.id}
              className={`card-flat transition-all duration-200 ${
                repo.selected ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardHeader className="flex justify-between items-start py-4">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    isSelected={repo.selected}
                    onValueChange={() => toggleRepository(repo.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    {editingId === repo.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-default-500 mb-1 block">项目别名</label>
                          <Input
                            size="sm"
                            placeholder="如：用户中心服务"
                            value={editForm.alias}
                            onValueChange={(v) => setEditForm({ ...editForm, alias: v })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-default-500 mb-1 block">项目描述</label>
                          <Textarea
                            size="sm"
                            minRows={2}
                            placeholder="描述这个项目的主要功能，如：负责用户注册、登录、权限管理等功能"
                            value={editForm.description}
                            onValueChange={(v) => setEditForm({ ...editForm, description: v })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            color="primary"
                            startContent={<Save className="w-3 h-3" />}
                            onPress={saveEditing}
                          >
                            保存
                          </Button>
                          <Button
                            size="sm"
                            variant="light"
                            startContent={<X className="w-3 h-3" />}
                            onPress={cancelEditing}
                          >
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-base font-medium">{repo.name}</p>
                          {repo.alias && (
                            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                              别名: {repo.alias}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-default-500 mt-1">{repo.path}</p>
                        {repo.description ? (
                          <p className="text-sm mt-2 bg-default-100 p-2 rounded">
                            {repo.description}
                          </p>
                        ) : (
                          <p className="text-xs text-default-400 mt-2 italic">
                            点击编辑按钮添加项目描述，帮助 AI 更好地理解项目
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs px-2 py-1 rounded-full bg-default-100">
                    {repo.type === 'local' ? '本地' : repo.type}
                  </span>
                  {editingId !== repo.id && (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => startEditing(repo)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => removeRepository(repo.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
