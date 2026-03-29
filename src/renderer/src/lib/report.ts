import { getLunarInfo } from './lunar'

export interface ReportSplitCommit {
  hash: string
  message: string
  author: string
  date: string | Date
  additions: number
  deletions: number
}

export interface ReportSplitNote {
  date: string
  content: string
}

export interface WeeklyReportSplitSource {
  title: string
  weekStart: string
  content: string
  sourceCommits: ReportSplitCommit[]
  sourceNotes: ReportSplitNote[]
}

export interface SplitDailyNoteDraft {
  date: string
  content: string
}

export interface SplitWeeklyReportResult {
  generatedNotes: SplitDailyNoteDraft[]
  skippedExistingDates: string[]
  targetDates: string[]
  workdayDates: string[]
  overtimeDates: string[]
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getWeekStart(date: Date): Date {
  const result = new Date(date)
  const day = result.getDay()
  const diff = result.getDate() - day + (day === 0 ? -6 : 1)
  result.setDate(diff)
  result.setHours(0, 0, 0, 0)
  return result
}

export function getWeekEnd(weekStart: Date): Date {
  const result = new Date(weekStart)
  result.setDate(result.getDate() + 6)
  result.setHours(0, 0, 0, 0)
  return result
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart)
    day.setDate(day.getDate() + index)
    return day
  })
}

export function getWeekRangeText(weekStartStr: string, weekEndStr?: string): string {
  const weekStart = parseDateKey(weekStartStr)
  const weekEnd = weekEndStr ? parseDateKey(weekEndStr) : getWeekEnd(weekStart)
  const startMonth = weekStart.getMonth() + 1
  const startDay = weekStart.getDate()
  const endMonth = weekEnd.getMonth() + 1
  const endDay = weekEnd.getDate()

  if (startMonth === endMonth) {
    return `${startMonth}月${startDay}日 - ${endDay}日`
  }

  return `${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`
}

export function getWeeklyReportTitle(weekStartStr: string): string {
  const weekStart = parseDateKey(weekStartStr)
  const yearStart = new Date(weekStart.getFullYear(), 0, 1)
  const diffDays = Math.floor(
    (weekStart.getTime() - getWeekStart(yearStart).getTime()) / (24 * 60 * 60 * 1000)
  )
  const weekNumber = Math.floor(diffDays / 7) + 1
  return `${weekStart.getFullYear()}年第${weekNumber}周周报`
}

export function deriveWeekRangeFromDates(dateValues: Array<string | Date>): {
  weekStart: string
  weekEnd: string
} {
  const normalizedDates = dateValues
    .map((value) => (value instanceof Date ? value : new Date(value)))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  const baseDate = normalizedDates[0] || new Date()
  const weekStart = getWeekStart(baseDate)
  const weekEnd = getWeekEnd(weekStart)

  return {
    weekStart: formatDateKey(weekStart),
    weekEnd: formatDateKey(weekEnd)
  }
}

export function getActualWorkdayDates(weekStartStr: string): string[] {
  return getWeekDays(parseDateKey(weekStartStr))
    .filter((day) => {
      const lunarInfo = getLunarInfo(day)
      if (lunarInfo.isHoliday) return false
      if (lunarInfo.isWorkday) return true
      const weekday = day.getDay()
      return weekday >= 1 && weekday <= 5
    })
    .map(formatDateKey)
}

export function getSplitTargetDates(
  weekStartStr: string,
  sourceNotes: ReportSplitNote[],
  existingNotes: ReportSplitNote[]
): {
  targetDates: string[]
  workdayDates: string[]
  overtimeDates: string[]
} {
  const workdayDates = getActualWorkdayDates(weekStartStr)
  const weekDates = getWeekDays(parseDateKey(weekStartStr)).map(formatDateKey)
  const workdaySet = new Set(workdayDates)
  const noteDates = [...sourceNotes, ...existingNotes]
    .filter((note) => note.content && note.content.trim())
    .map((note) => note.date)
  const overtimeDates = Array.from(
    new Set(
      noteDates.filter((date) => weekDates.includes(date) && !workdaySet.has(date))
    )
  ).sort()
  const targetDates = Array.from(new Set([...workdayDates, ...overtimeDates])).sort()

  return {
    targetDates,
    workdayDates,
    overtimeDates
  }
}

function buildDailyNoteContent(
  date: string,
  commits: ReportSplitCommit[],
  sourceNoteContent?: string,
  weeklyTitle?: string
): string {
  const commitLines =
    commits.length > 0
      ? commits.map((commit) => `- ${commit.message} (${commit.hash.slice(0, 7)})`).join('\n')
      : '- 待补充'
  const totalAdditions = commits.reduce((sum, commit) => sum + commit.additions, 0)
  const totalDeletions = commits.reduce((sum, commit) => sum + commit.deletions, 0)
  const noteSection =
    sourceNoteContent && sourceNoteContent.trim()
      ? sourceNoteContent.trim()
      : '- 待补充'

  return `# 今日完成工作
${commitLines}

# 今日工作总结
- 共处理 ${commits.length} 条提交，新增代码 ${totalAdditions} 行，删除代码 ${totalDeletions} 行。
- 内容拆分自${weeklyTitle || '周报'}（${date}）。

# 补充记录
${noteSection}

# 明日工作计划
- 待补充`
}

export function splitWeeklyReportToDailyNotes(
  report: WeeklyReportSplitSource,
  existingNotes: ReportSplitNote[]
): SplitWeeklyReportResult {
  const { targetDates, workdayDates, overtimeDates } = getSplitTargetDates(
    report.weekStart,
    report.sourceNotes,
    existingNotes
  )
  const existingNoteMap = new Map(
    existingNotes.map((note) => [note.date, note.content.trim()])
  )
  const sourceNoteMap = new Map(
    report.sourceNotes.map((note) => [note.date, note.content.trim()])
  )
  const commitsByDate = new Map<string, ReportSplitCommit[]>()

  report.sourceCommits.forEach((commit) => {
    const dateKey = formatDateKey(new Date(commit.date))
    const current = commitsByDate.get(dateKey) || []
    current.push(commit)
    commitsByDate.set(dateKey, current)
  })

  const generatedNotes: SplitDailyNoteDraft[] = []
  const skippedExistingDates: string[] = []

  targetDates.forEach((date) => {
    if (existingNoteMap.get(date)) {
      skippedExistingDates.push(date)
      return
    }

    const dayCommits = commitsByDate.get(date) || []
    const daySourceNote = sourceNoteMap.get(date)

    generatedNotes.push({
      date,
      content: buildDailyNoteContent(date, dayCommits, daySourceNote, report.title)
    })
  })

  return {
    generatedNotes,
    skippedExistingDates,
    targetDates,
    workdayDates,
    overtimeDates
  }
}
