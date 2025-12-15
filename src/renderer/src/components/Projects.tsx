import { FolderGit2, Trash2, Check, FolderOpen, RefreshCw, Edit2, X, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function Projects() {
  const { repositories, removeRepository, toggleRepository, addRepository, setCommits, updateRepository } =
    useAppStore()
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
      // 添加后自动刷新提交
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
      const result = await window.electron.ipcRenderer.invoke('get-commits', repo.path, '1 week ago')
      if (result.commits) {
        // 为每个 commit 添加仓库信息
        const commitsWithRepo = result.commits.map((c: any) => ({
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
          <Button onClick={handleRefreshCommits} size="sm" variant="outline" disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            刷新提交
          </Button>
          <Button onClick={handleAddLocalRepo} size="sm">
            <FolderOpen className="w-4 h-4 mr-2" />
            添加本地仓库
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        为项目设置别名和描述，帮助 AI 更好地理解每个项目的用途，生成更准确的报告。
      </p>

      {repositories.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FolderGit2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无项目</p>
              <p className="text-sm mt-1">点击上方按钮添加本地 Git 仓库</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {repositories.map((repo) => (
            <Card
              key={repo.id}
              className={cn(
                'bg-card/50 backdrop-blur transition-all duration-200',
                repo.selected && 'ring-2 ring-primary'
              )}
            >
              <CardHeader className="flex flex-row items-start justify-between py-4">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleRepository(repo.id)}
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mt-1',
                      repo.selected
                        ? 'bg-primary border-primary text-white'
                        : 'border-muted-foreground/50'
                    )}
                  >
                    {repo.selected && <Check className="w-3 h-3" />}
                  </button>
                  <div className="flex-1">
                    {editingId === repo.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">项目别名</label>
                          <Input
                            placeholder="如：用户中心服务"
                            value={editForm.alias}
                            onChange={(e) => setEditForm({ ...editForm, alias: e.target.value })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">项目描述</label>
                          <Textarea
                            placeholder="描述这个项目的主要功能，如：负责用户注册、登录、权限管理等功能"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="min-h-[60px] text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEditing}>
                            <Save className="w-3 h-3 mr-1" />
                            保存
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEditing}>
                            <X className="w-3 h-3 mr-1" />
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{repo.name}</CardTitle>
                          {repo.alias && (
                            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                              别名: {repo.alias}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{repo.path}</p>
                        {repo.description ? (
                          <p className="text-sm text-foreground/80 mt-2 bg-secondary/30 p-2 rounded">
                            📝 {repo.description}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground/60 mt-2 italic">
                            点击编辑按钮添加项目描述，帮助 AI 更好地理解项目
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                    {repo.type === 'local' ? '本地' : repo.type}
                  </span>
                  {editingId !== repo.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEditing(repo)}
                      className="text-muted-foreground hover:text-foreground"
                      title="编辑别名和描述"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRepository(repo.id)}
                    className="text-muted-foreground hover:text-destructive"
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
