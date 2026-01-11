import { getDatabase } from '../index'

export interface Note {
  id: string
  date: string
  content: string
  createdAt: string
  updatedAt: string
}

export function getAllNotes(): Note[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM notes ORDER BY date DESC').all() as Array<{
    id: string
    date: string
    content: string
    created_at: string
    updated_at: string
  }>

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

export function saveNotes(notes: Note[]): void {
  const db = getDatabase()

  db.transaction(() => {
    db.prepare('DELETE FROM notes').run()

    const insert = db.prepare(`
      INSERT INTO notes (id, date, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    for (const note of notes) {
      insert.run(
        note.id,
        note.date,
        note.content,
        note.createdAt || new Date().toISOString(),
        note.updatedAt || new Date().toISOString()
      )
    }
  })()
}

export function getNotesByDateRange(startDate: string, endDate: string): Note[] {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT * FROM notes 
    WHERE date BETWEEN ? AND ?
    ORDER BY date DESC
  `).all(startDate, endDate) as Array<{
    id: string
    date: string
    content: string
    created_at: string
    updated_at: string
  }>

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}
