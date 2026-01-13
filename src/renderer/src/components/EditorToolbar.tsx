import { Editor } from '@tiptap/react'
import { Bold, Italic, List, ListOrdered, CheckSquare } from 'lucide-react'

interface EditorToolbarProps {
  editor: Editor | null
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null

  const tools = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
      title: '粗体'
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
      title: '斜体'
    },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
      title: '列表'
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
      title: '编号'
    },
    {
      icon: CheckSquare,
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: editor.isActive('taskList'),
      title: '待办'
    }
  ]

  return (
    <div className="flex items-center gap-0.5 px-3 py-2">
      {tools.map(({ icon: Icon, action, isActive, title }) => (
        <button
          key={title}
          type="button"
          onClick={action}
          title={title}
          className={`p-1.5 rounded-md transition-colors ${
            isActive
              ? 'bg-default-200 text-foreground'
              : 'text-default-500 hover:bg-default-100 hover:text-foreground'
          }`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  )
}
