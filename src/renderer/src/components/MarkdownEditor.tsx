import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Markdown } from 'tiptap-markdown'
import { useEffect, useRef } from 'react'
import { EditorToolbar } from './EditorToolbar'

interface MarkdownEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  showToolbar?: boolean
  onEditorReady?: (editor: Editor) => void
  onFocus?: () => void
  minHeight?: string
  className?: string
}

const getMarkdown = (editor: Editor): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (editor.storage as any).markdown?.getMarkdown?.() || ''
}

export function MarkdownEditor({
  content,
  onChange,
  placeholder,
  showToolbar = true,
  onEditorReady,
  onFocus,
  minHeight = '100%',
  className = ''
}: MarkdownEditorProps) {
  const isUpdatingRef = useRef(false)
  const onEditorReadyRef = useRef(onEditorReady)

  useEffect(() => {
    onEditorReadyRef.current = onEditorReady
  }, [onEditorReady])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder: placeholder || '开始编写...'
      }),
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true
      })
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return
      const markdown = getMarkdown(editor)
      onChange(markdown)
    },
    onFocus: () => {
      onFocus?.()
    },
    editorProps: {
      attributes: {
        class: `tiptap prose prose-sm dark:prose-invert max-w-none focus:outline-none px-4 py-3 overflow-auto h-full`,
        style: `min-height: ${minHeight}`
      }
    }
  })

  useEffect(() => {
    if (editor) {
      onEditorReadyRef.current?.(editor)
    }
  }, [editor])

  useEffect(() => {
    if (editor && content !== getMarkdown(editor)) {
      isUpdatingRef.current = true
      editor.commands.setContent(content)
      isUpdatingRef.current = false
    }
  }, [content, editor])

  if (!editor) {
    return null
  }

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      {showToolbar && (
        <div className="flex-shrink-0 border-b border-divider">
          <EditorToolbar editor={editor} />
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  )
}

// 导出 getMarkdown 函数供外部使用
export { getMarkdown }
export type { Editor }
