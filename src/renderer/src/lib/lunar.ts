import { Solar, HolidayUtil } from 'lunar-typescript'

export interface LunarInfo {
  lunarDay: string
  lunarMonth: string
  festival: string | null
  solarTerm: string | null
  isHoliday: boolean
  isWorkday: boolean
  holidayName: string | null
}

export function getLunarInfo(date: Date): LunarInfo {
  const solar = Solar.fromDate(date)
  const lunar = solar.getLunar()

  const solarFestival = solar.getFestivals()[0] || null
  const lunarFestival = lunar.getFestivals()[0] || null
  const solarTerm = lunar.getJieQi()

  const holiday = HolidayUtil.getHoliday(date.getFullYear(), date.getMonth() + 1, date.getDate())

  const isHoliday = holiday !== null && !holiday.isWork()
  const isWorkday = holiday !== null && holiday.isWork()
  const holidayName = holiday?.getName() || null

  const festival = lunarFestival || solarFestival

  return {
    lunarDay: lunar.getDayInChinese(),
    lunarMonth: lunar.getMonthInChinese() + '月',
    festival,
    solarTerm,
    isHoliday,
    isWorkday,
    holidayName
  }
}

export function getLunarDisplayText(date: Date): string {
  const info = getLunarInfo(date)

  if (info.festival) {
    return info.festival
  }
  if (info.solarTerm) {
    return info.solarTerm
  }
  if (info.lunarDay === '初一') {
    return info.lunarMonth
  }
  return info.lunarDay
}

export function getMonthDays(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  let startDay = firstDay.getDay()
  startDay = startDay === 0 ? 6 : startDay - 1

  const weeks: Date[][] = []
  let currentWeek: Date[] = []

  for (let i = 0; i < startDay; i++) {
    const prevDate = new Date(year, month, 1 - (startDay - i))
    currentWeek.push(prevDate)
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    currentWeek.push(new Date(year, month, day))

    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }

  if (currentWeek.length > 0) {
    const remaining = 7 - currentWeek.length
    for (let i = 1; i <= remaining; i++) {
      currentWeek.push(new Date(year, month + 1, i))
    }
    weeks.push(currentWeek)
  }

  return weeks
}
