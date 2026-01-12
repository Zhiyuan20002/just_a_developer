import './index.css'
import { useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Dashboard } from '@/components/Dashboard'
import { Projects } from '@/components/Projects'
import { Templates } from '@/components/Templates'
import { Settings } from '@/components/Settings'
import { Notes } from '@/components/Notes'
import { Composer } from '@/components/Composer'
import { useAppStore } from '@/stores/app-store'

function App(): React.JSX.Element {
  const { currentView, initialized, initializeStore } = useAppStore()

  // 应用启动时初始化 store
  useEffect(() => {
    if (!initialized) {
      initializeStore()
    }
  }, [initialized, initializeStore])

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />
      case 'projects':
        return <Projects />
      case 'notes':
        return <Notes />
      case 'templates':
        return <Templates />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  // 显示加载状态
  if (!initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-background">
      {/* 侧边栏容器 - 带内边距实现悬浮效果 */}
      <div className="p-2 pr-0 flex flex-col drag-region">
        <Sidebar />
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 标题栏 */}
        <div className="h-11 flex-shrink-0 drag-region flex items-center px-4">
          <span className="text-sm text-muted-foreground">Just a Developer</span>
        </div>

        <main className="flex-1 flex overflow-hidden">
          {renderView()}
          {currentView === 'dashboard' && <Composer />}
        </main>
      </div>
    </div>
  )
}

export default App
