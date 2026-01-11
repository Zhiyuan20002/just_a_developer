import { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Minus,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo
} from 'lucide-react'
import { Button } from '@heroui/react'
import { useCallback } from 'react'

interface EditorToolbarProps {
  editor: Editor | null
}

interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  icon: React.ElementType
  title: string
  disabled?: boolean
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const ToolbarButton = useCallback(
    ({ onClick, isActive, icon: Icon, title, disabled }: ToolbarButtonProps) => (
      <Button
        isIconOnly
        size="sm"
        variant={isActive ? 'flat' : 'light'}
        color={isActive ? 'primary' : 'default'}
        onPress={onClick}
        title={title}
        isDisabled={disabled}
      >
        <Icon className="w-4 h-4" />
      </Button>
    ),
    []
  )

  if (!editor) {
    return (
      <div className="flex items-center gap-1 p-2 border-b border-divider bg-default-50 flex-wrap h-[52px]">
        <div className="text-default-400 text-sm">加载中...</div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 p-2 border-b border-divider bg-default-50 flex-wrap">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        icon={Heading1}
        title="标题 1"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        icon={Heading2}
        title="标题 2"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        icon={Heading3}
        title="标题 3"
      />

      <div className="w-px h-6 bg-divider mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        icon={Bold}
        title="粗体"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        icon={Italic}
        title="斜体"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        icon={Strikethrough}
        title="删除线"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        icon={Code}
        title="行内代码"
      />

      <div className="w-px h-6 bg-divider mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        icon={List}
        title="无序列表"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        icon={ListOrdered}
        title="有序列表"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        icon={Quote}
        title="引用"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        icon={Minus}
        title="分割线"
      />

      <div className="w-px h-6 bg-divider mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        icon={Undo}
        title="撤销"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        icon={Redo}
        title="重做"
      />
    </div>
  )
}
