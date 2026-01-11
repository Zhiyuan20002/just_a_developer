import { getDatabase } from '../index'

export interface Template {
  id: string
  name: string
  content: string
  isBuiltin: boolean
  created_at: string
  updated_at: string
}

export function getAllTemplates(): Template[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM templates').all() as Array<{
    id: string
    name: string
    content: string
    is_builtin: number
    created_at: string
    updated_at: string
  }>

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    content: row.content,
    isBuiltin: row.is_builtin === 1,
    created_at: row.created_at,
    updated_at: row.updated_at
  }))
}

export function saveTemplates(templates: Template[]): void {
  const db = getDatabase()

  db.transaction(() => {
    // 只删除非内置模版
    db.prepare('DELETE FROM templates WHERE is_builtin = 0').run()

    const insert = db.prepare(`
      INSERT OR REPLACE INTO templates (id, name, content, is_builtin, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    for (const template of templates) {
      insert.run(
        template.id,
        template.name,
        template.content,
        template.isBuiltin ? 1 : 0,
        template.created_at || new Date().toISOString(),
        new Date().toISOString()
      )
    }
  })()
}
