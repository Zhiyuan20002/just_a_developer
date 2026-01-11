import { LayoutDashboard, FolderGit2, FileText, NotebookPen } from 'lucide-react'
import { Button, Tooltip } from '@heroui/react'
import { getGreeting } from '@/lib/utils'
import { useAppStore, ViewType } from '@/stores/app-store'

interface NavItem {
  id: ViewType
  icon: React.ElementType
  label: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: '仪表盘' },
  { id: 'projects', icon: FolderGit2, label: '项目库' },
  { id: 'notes', icon: NotebookPen, label: '笔记' },
  { id: 'templates', icon: FileText, label: '模版中心' }
]

// 获取用户名首字母（支持中英文）
function getInitial(name: string | null): string {
  if (!name || name.trim() === '') return 'U'
  const trimmed = name.trim()
  const firstChar = trimmed[0]
  // 如果是英文字母，返回大写
  if (/[a-zA-Z]/.test(firstChar)) {
    return firstChar.toUpperCase()
  }
  // 中文或其他字符直接返回
  return firstChar
}

export function Sidebar() {
  const { currentView, setCurrentView, apiStatus, gitUsername } = useAppStore()

  const userInitial = getInitial(gitUsername)

  return (
    <aside className="sidebar-float w-[74px] h-full flex flex-col items-center py-3 rounded-2xl">
      {/* 红绿灯按钮预留空间 */}
      <div className="h-7 mb-2 flex-shrink-0" />

      {/* 用户头像区域 - 点击进入设置 */}
      <Tooltip content="设置" placement="right">
        <button
          type="button"
          className="mb-4 flex flex-col items-center no-drag cursor-pointer group"
          onClick={() => setCurrentView('settings')}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-medium text-sm group-hover:scale-105 transition-transform">
            {userInitial}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-center whitespace-nowrap">
            {getGreeting()}
          </p>
        </button>
      </Tooltip>

      {/* 导航菜单 */}
      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.id
          return (
            <Tooltip key={item.id} content={item.label} placement="right">
              <Button
                isIconOnly
                size="lg"
                variant={isActive ? 'solid' : 'light'}
                color={isActive ? 'primary' : 'default'}
                className="no-drag w-11 h-11"
                onPress={() => setCurrentView(item.id)}
              >
                <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2 : 1.5} />
              </Button>
            </Tooltip>
          )
        })}
      </nav>

      {/* API 状态指示灯 */}
      <div className="mt-auto pb-3">
        <Tooltip
          content={
            apiStatus === 'connected'
              ? 'API 已连接'
              : apiStatus === 'disconnected'
                ? 'API 未连接'
                : '检查中...'
          }
        >
          <div
            className={`w-3 h-3 rounded-full ${
              apiStatus === 'connected'
                ? 'bg-success animate-breathe'
                : apiStatus === 'disconnected'
                  ? 'bg-danger'
                  : 'bg-warning animate-pulse'
            }`}
          />
        </Tooltip>
      </div>
    </aside>
  )
}
