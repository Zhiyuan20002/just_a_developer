import { getDatabase } from '../index'

export interface WritingExample {
  id: string
  templateId: string
  title: string
  content: string
  createdAt: string
}

export function getAllWritingExamples(): WritingExample[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM writing_examples ORDER BY created_at DESC').all() as Array<{
    id: string
    template_id: string
    title: string
    content: string
    created_at: string
  }>

  return rows.map((row) => ({
    id: row.id,
    templateId: row.template_id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at
  }))
}

export function saveWritingExamples(examples: WritingExample[]): void {
  const db = getDatabase()

  db.transaction(() => {
    db.prepare('DELETE FROM writing_examples').run()

    const insert = db.prepare(`
      INSERT INTO writing_examples (id, template_id, title, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    for (const example of examples) {
      insert.run(
        example.id,
        example.templateId,
        example.title,
        example.content,
        example.createdAt || new Date().toISOString()
      )
    }
  })()
}
