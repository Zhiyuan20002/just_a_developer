import { getDatabase } from '../index'

export interface Repository {
  id: string
  name: string
  path: string
  type: string
  selected: boolean
  alias?: string
  description?: string
  created_at: string
}

export function getAllRepositories(): Repository[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM repositories').all() as Array<{
    id: string
    name: string
    path: string
    type: string
    selected: number
    alias: string | null
    description: string | null
    created_at: string
  }>

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    path: row.path,
    type: row.type,
    selected: row.selected === 1,
    alias: row.alias || undefined,
    description: row.description || undefined,
    created_at: row.created_at
  }))
}

export function saveRepositories(repositories: Repository[]): void {
  const db = getDatabase()

  db.transaction(() => {
    db.prepare('DELETE FROM repositories').run()

    const insert = db.prepare(`
      INSERT INTO repositories (id, name, path, type, selected, alias, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const repo of repositories) {
      insert.run(
        repo.id,
        repo.name,
        repo.path,
        repo.type,
        repo.selected ? 1 : 0,
        repo.alias || null,
        repo.description || null,
        repo.created_at || new Date().toISOString()
      )
    }
  })()
}
