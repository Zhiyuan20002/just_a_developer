import Database from 'better-sqlite3'

export function runMigrations(db: Database.Database): void {
  // 创建迁移版本表
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_versions (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `)

  const currentVersion = db.prepare('SELECT MAX(version) as version FROM schema_versions').get() as { version: number | null }
  const version = currentVersion?.version || 0

  const migrations = [
    // v1: 初始表结构
    () => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS repositories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          path TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'local',
          selected INTEGER NOT NULL DEFAULT 1,
          alias TEXT,
          description TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          content TEXT NOT NULL,
          is_builtin INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          date TEXT UNIQUE NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_notes_date ON notes(date);

        CREATE TABLE IF NOT EXISTS writing_examples (
          id TEXT PRIMARY KEY,
          template_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `)
    }
  ]

  const insertVersion = db.prepare('INSERT INTO schema_versions (version, applied_at) VALUES (?, ?)')

  for (let i = version; i < migrations.length; i++) {
    console.log(`Running migration v${i + 1}...`)
    db.transaction(() => {
      migrations[i]()
      insertVersion.run(i + 1, new Date().toISOString())
    })()
  }
}
