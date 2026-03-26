// Web Worker: process release calendar items
// Receives { releases, today } and posts back { selectedItems }

self.onmessage = (e: MessageEvent) => {
  try {
    const { releases, today } = e.data as {
      releases: Array<{ id: string; title: string; releaseDate: string; type: string; cover?: string; episodes?: number }>
      today: string
    }

    if (!Array.isArray(releases)) {
      self.postMessage({ selectedItems: [], error: 'invalid input' })
      return
    }

    const todayDate = new Date(today)
    const thirtyDaysAhead = new Date(todayDate)
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30)
    const thirtyDaysBefore = new Date(todayDate)
    thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30)

    const filtered = releases.filter((item) => {
      if (!item.releaseDate) return false
      const date = new Date(item.releaseDate)
      return date >= thirtyDaysBefore && date <= thirtyDaysAhead
    })

    filtered.sort((a, b) => {
      const aDate = new Date(a.releaseDate).getTime()
      const bDate = new Date(b.releaseDate).getTime()
      return aDate - bDate
    })

    self.postMessage({ selectedItems: filtered })
  } catch (err) {
    self.postMessage({ selectedItems: [], error: String(err) })
  }
}
