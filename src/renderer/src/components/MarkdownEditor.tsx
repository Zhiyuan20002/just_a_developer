import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
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
  minHeight = '400px',
  className = ''
}: MarkdownEditorProps) {
  const isUpdatingRef = useRef(false)
  const onEditorReadyRef = useRef(onEditorReady)

  // 更新 ref 以避免重新创建 editor
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
        class: `tiptap prose prose-sm dark:prose-invert max-w-none focus:outline-none p-4 overflow-auto`,
        style: `min-height: ${minHeight}`
      }
    }
  })

  // 当 editor 准备好时，通知父组件
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
    <div className={`border border-divider rounded-lg overflow-hidden bg-content1 ${className}`}>
      {showToolbar && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}

// 导出 getMarkdown 函数供外部使用
export { getMarkdown }
export type { Editor }
