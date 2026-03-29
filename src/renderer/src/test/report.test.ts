import { describe, expect, it } from 'vitest'
import {
  deriveWeekRangeFromDates,
  getActualWorkdayDates,
  getSplitTargetDates,
  splitWeeklyReportToDailyNotes
} from '@/lib/report'

describe('周报工具', () => {
  it('应该根据输入日期推导所在周范围', () => {
    const range = deriveWeekRangeFromDates(['2026-03-25', '2026-03-27'])
    expect(range.weekStart).toBe('2026-03-23')
    expect(range.weekEnd).toBe('2026-03-29')
  })

  it('应该识别节假日周中的实际工作日', () => {
    const workdays = getActualWorkdayDates('2024-10-07')
    expect(workdays).toContain('2024-10-12')
    expect(workdays).not.toContain('2024-10-07')
  })

  it('拆分日报时应该跳过已有内容的笔记日期', () => {
    const result = splitWeeklyReportToDailyNotes(
      {
        title: '2026年第13周周报',
        weekStart: '2026-03-23',
        content: '# 本周完成工作',
        sourceCommits: [
          {
            hash: 'abc1234',
            message: '完成首页筛选修复',
            author: 'Test',
            date: '2026-03-23T10:00:00.000Z',
            additions: 10,
            deletions: 2
          },
          {
            hash: 'def5678',
            message: '补充周报模块',
            author: 'Test',
            date: '2026-03-24T09:00:00.000Z',
            additions: 20,
            deletions: 5
          }
        ],
        sourceNotes: []
      },
      [{ date: '2026-03-24', content: '# 已有日报' }]
    )

    expect(result.generatedNotes.some((note) => note.date === '2026-03-23')).toBe(true)
    expect(result.generatedNotes.some((note) => note.date === '2026-03-24')).toBe(false)
    expect(result.skippedExistingDates).toContain('2026-03-24')
  })

  it('应该把非工作日但有内容的笔记识别为加班日拆分目标', () => {
    const result = getSplitTargetDates(
      '2026-03-23',
      [{ date: '2026-03-29', content: '# 周日加班记录' }],
      []
    )

    expect(result.overtimeDates).toContain('2026-03-29')
    expect(result.targetDates).toContain('2026-03-29')
  })
})
