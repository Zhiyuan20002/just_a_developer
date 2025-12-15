import { LayoutDashboard, FolderGit2, FileText, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  { id: 'templates', icon: FileText, label: '模版中心' },
  { id: 'settings', icon: Settings, label: '设置' }
]

export function Sidebar() {
  const { currentView, setCurrentView, apiStatus } = useAppStore()

  return (
    <aside className="glass w-16 flex flex-col items-center py-4 border-r border-border/50">
      {/* 用户头像区域 */}
      <div className="mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-medium text-sm">
          U
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 text-center whitespace-nowrap">
          {getGreeting()}
        </p>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.id
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 no-drag',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              title={item.label}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
            </button>
          )
        })}
      </nav>

      {/* API 状态指示灯 */}
      <div className="mt-auto pt-4">
        <div
          className={cn(
            'w-3 h-3 rounded-full',
            apiStatus === 'connected' && 'bg-green-500 animate-breathe',
            apiStatus === 'disconnected' && 'bg-red-500',
            apiStatus === 'checking' && 'bg-yellow-500 animate-pulse'
          )}
          title={
            apiStatus === 'connected'
              ? 'API 已连接'
              : apiStatus === 'disconnected'
                ? 'API 未连接'
                : '检查中...'
          }
        />
      </div>
    </aside>
  )
}
