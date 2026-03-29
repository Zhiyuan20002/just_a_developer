import { randomUUID } from 'crypto'
import { getDatabase } from '../index'

export interface WeeklyReportCommit {
  hash: string
  message: string
  author: string
  date: string
  files: string[]
  additions: number
  deletions: number
  repoId?: string
  repoName?: string
  repoDescription?: string
}

export interface WeeklyReportNote {
  id?: string
  date: string
  content: string
  createdAt?: string
  updatedAt?: string
}

export interface WeeklyReport {
  id?: string
  title: string
  weekStart: string
  weekEnd: string
  content: string
  templateId?: string | null
  author?: string | null
  sourceCommits: WeeklyReportCommit[]
  sourceNotes: WeeklyReportNote[]
  splitTargetDates: string[]
  splitStatus: 'not_split' | 'partial' | 'completed'
  createdAt?: string
  updatedAt?: string
}

interface WeeklyReportRow {
  id: string
  title: string
  week_start: string
  week_end: string
  content: string
  template_id: string | null
  author: string | null
  source_commits: string
  source_notes: string
  split_target_dates: string
  split_status: 'not_split' | 'partial' | 'completed'
  created_at: string
  updated_at: string
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function mapRow(row: WeeklyReportRow): WeeklyReport {
  return {
    id: row.id,
    title: row.title,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    content: row.content,
    templateId: row.template_id,
    author: row.author,
    sourceCommits: parseJson<WeeklyReportCommit[]>(row.source_commits, []),
    sourceNotes: parseJson<WeeklyReportNote[]>(row.source_notes, []),
    splitTargetDates: parseJson<string[]>(row.split_target_dates, []),
    splitStatus: row.split_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function getAllWeeklyReports(): WeeklyReport[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM weekly_reports ORDER BY week_start DESC').all() as WeeklyReportRow[]
  return rows.map(mapRow)
}

export function getWeeklyReportByWeek(weekStart: string): WeeklyReport | null {
  const db = getDatabase()
  const row = db
    .prepare('SELECT * FROM weekly_reports WHERE week_start = ? LIMIT 1')
    .get(weekStart) as WeeklyReportRow | undefined

  return row ? mapRow(row) : null
}

export function saveWeeklyReport(report: WeeklyReport): WeeklyReport {
  const db = getDatabase()
  const existing = getWeeklyReportByWeek(report.weekStart)
  const id = report.id || existing?.id || randomUUID()
  const createdAt = report.createdAt || existing?.createdAt || new Date().toISOString()
  const updatedAt = new Date().toISOString()

  db.prepare(`
    INSERT OR REPLACE INTO weekly_reports (
      id,
      title,
      week_start,
      week_end,
      content,
      template_id,
      author,
      source_commits,
      source_notes,
      split_target_dates,
      split_status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    report.title,
    report.weekStart,
    report.weekEnd,
    report.content,
    report.templateId || null,
    report.author || null,
    JSON.stringify(report.sourceCommits || []),
    JSON.stringify(report.sourceNotes || []),
    JSON.stringify(report.splitTargetDates || []),
    report.splitStatus || 'not_split',
    createdAt,
    updatedAt
  )

  return {
    ...report,
    id,
    createdAt,
    updatedAt
  }
}

export function deleteWeeklyReport(id: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM weekly_reports WHERE id = ?').run(id)
}
