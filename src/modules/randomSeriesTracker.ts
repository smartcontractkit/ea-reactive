import { Reducer, Trigger, combineReducers } from '../state'
import { random } from '../drivers'
import { CMD_RAND_START, CMD_RAND_STOP } from '../drivers/random'

const limitSeries = (max: number): Reducer => (s, e) => {
  if (e.type === random.EVENT_RAND_UPDATE) {
    const series = [...(s.series || []), e.data].slice(-1 * max)
    return {
      ...s,
      series,
      min: Math.min(...series),
      max: Math.max(...series),
      average: series.reduce((acc, v) => acc + v, 0) / series.length,
    }
  }
  return s
}

export const reducer = combineReducers({
  last5: limitSeries(5),
  last10: limitSeries(10),
})

export const trigger: Trigger = (s, e) => {
  if (e.type === random.EVENT_RAND_UPDATE && s.last5.min < 30) {
    return [{ type: CMD_RAND_START, interval: 500 }]
  }
  if (e.type === random.EVENT_RAND_UPDATE && s.last5.min > 60) {
    return [{ type: CMD_RAND_STOP, interval: 500 }]
  }
  return []
}
