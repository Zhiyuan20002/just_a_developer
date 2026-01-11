import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, renameSync } from 'fs'
import { runMigrations } from './migrations'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'sookool.db')
  const configPath = join(app.getPath('userData'), 'config.json')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  runMigrations(db)

  // 迁移旧数据
  if (existsSync(configPath)) {
    migrateFromJson(configPath)
  }
}

function migrateFromJson(configPath: string): void {
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'))
    const database = getDatabase()

    // 检查是否已迁移
    const migrated = database.prepare('SELECT value FROM settings WHERE key = ?').get('migrated_from_json')
    if (migrated) return

    database.transaction(() => {
      // 迁移仓库
      if (config.repositories && Array.isArray(config.repositories)) {
        const insertRepo = database.prepare(`
          INSERT OR IGNORE INTO repositories (id, name, path, type, selected, alias, description, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        for (const repo of config.repositories) {
          insertRepo.run(
            repo.id,
            repo.name,
            repo.path,
            repo.type || 'local',
            repo.selected ? 1 : 0,
            repo.alias || null,
            repo.description || null,
            new Date().toISOString()
          )
        }
      }

      // 先插入内置模版（确保外键约束不会失败）
      const insertTemplate = database.prepare(`
        INSERT OR IGNORE INTO templates (id, name, content, is_builtin, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      
      // 内置模版
      const builtinTemplates = [
        { id: 'daily', name: '标准日报', content: '# 今日完成工作\nXXX\n\n# 今日工作总结\nXXX\n\n# 明日工作计划\nXXX' },
        { id: 'weekly', name: '标准周报', content: '# 本周完成工作\nXXX\n\n# 本周工作总结\nXXX\n\n# 下周工作计划\nXXX' }
      ]
      
      for (const template of builtinTemplates) {
        insertTemplate.run(
          template.id,
          template.name,
          template.content,
          1,
          new Date().toISOString(),
          new Date().toISOString()
        )
      }

      // 迁移自定义模版
      if (config.templates && Array.isArray(config.templates)) {
        for (const template of config.templates) {
          if (!template.isBuiltin) {
            insertTemplate.run(
              template.id,
              template.name,
              template.content,
              0,
              new Date().toISOString(),
              new Date().toISOString()
            )
          }
        }
      }

      // 迁移笔记
      if (config.notes && Array.isArray(config.notes)) {
        const insertNote = database.prepare(`
          INSERT OR IGNORE INTO notes (id, date, content, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `)
        for (const note of config.notes) {
          insertNote.run(
            note.id,
            note.date,
            note.content,
            note.createdAt || new Date().toISOString(),
            note.updatedAt || new Date().toISOString()
          )
        }
      }

      // 迁移写作示例
      if (config.writingExamples && Array.isArray(config.writingExamples)) {
        const insertExample = database.prepare(`
          INSERT OR IGNORE INTO writing_examples (id, template_id, title, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `)
        for (const example of config.writingExamples) {
          insertExample.run(
            example.id,
            example.templateId,
            example.title,
            example.content,
            example.createdAt || new Date().toISOString()
          )
        }
      }

      // 迁移设置项
      const insertSetting = database.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `)

      const settingsKeys = [
        'selectedTemplate',
        'filterTemplateMap',
        'selectedAuthor',
        'systemPrompt',
        'themeMode',
        'currentProvider',
        'selectedModel',
        'customProviders'
      ]

      for (const key of settingsKeys) {
        if (config[key] !== undefined) {
          const value = typeof config[key] === 'object' ? JSON.stringify(config[key]) : String(config[key])
          insertSetting.run(key, value, new Date().toISOString())
        }
      }

      // 迁移 API Keys
      for (const key of Object.keys(config)) {
        if (key.startsWith('apiKeys_')) {
          insertSetting.run(key, String(config[key]), new Date().toISOString())
        }
      }

      // 标记已迁移
      insertSetting.run('migrated_from_json', 'true', new Date().toISOString())
    })()

    // 备份旧配置文件
    renameSync(configPath, configPath + '.bak')
    console.log('数据迁移完成，旧配置已备份为 config.json.bak')
  } catch (error) {
    console.error('数据迁移失败:', error)
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
