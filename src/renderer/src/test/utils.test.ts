import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cn, formatDate, getGreeting } from '@/lib/utils'

describe('工具函数', () => {
  describe('cn', () => {
    it('应该正确合并类名', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('应该处理条件类名', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })

    it('应该合并 Tailwind 类名冲突', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2')
    })
  })

  describe('formatDate', () => {
    it('应该正确格式化日期为中文', () => {
      const date = new Date('2024-12-14')
      const formatted = formatDate(date)
      expect(formatted).toContain('2024')
      expect(formatted).toContain('12')
      expect(formatted).toContain('14')
    })
  })

  describe('getGreeting', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('凌晨应该返回"夜深了"', () => {
      vi.setSystemTime(new Date('2024-12-14T03:00:00'))
      expect(getGreeting()).toBe('夜深了')
    })

    it('早上应该返回"早上好"', () => {
      vi.setSystemTime(new Date('2024-12-14T09:00:00'))
      expect(getGreeting()).toBe('早上好')
    })

    it('中午应该返回"中午好"', () => {
      vi.setSystemTime(new Date('2024-12-14T12:30:00'))
      expect(getGreeting()).toBe('中午好')
    })

    it('下午应该返回"下午好"', () => {
      vi.setSystemTime(new Date('2024-12-14T15:00:00'))
      expect(getGreeting()).toBe('下午好')
    })

    it('晚上应该返回"晚上好"', () => {
      vi.setSystemTime(new Date('2024-12-14T20:00:00'))
      expect(getGreeting()).toBe('晚上好')
    })
  })
})
