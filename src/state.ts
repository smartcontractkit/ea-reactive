import { Observable, of } from 'rxjs'
import { mergeMap } from 'rxjs/operators'

export interface State {
  [prop: string]: any
}

export interface Event {
  type: string
  [prop: string]: any
}

export type Reducer = (s: State, e: Event) => State
export type Trigger = (s: State, e: Event) => Event[]

export interface StateReducers {
  [prop: string]: Reducer
}

export interface StateTriggers {
  [prop: string]: Trigger
}

// In memory db
const _load = (state: State, key: string): State => state[key] || {}
const _store = (state: State, key: string, val: any): State => ({
  ...state,
  [key]: val,
})

export const combineReducers = (reducers: StateReducers): Reducer => (s, e) => {
  const _reducer = (_acc: State, [key, r]: [string, Reducer]) =>
    _store(_acc, key, r(_load(_acc, key), e))
  return Object.entries(reducers).reduce(_reducer, s)
}

export const combineTriggers = (triggers: StateTriggers) => (s: State, e: Event) => {
  return of(...Object.entries(triggers)).pipe(mergeMap(([key, t]) => of(...t(_load(s, key), e))))
}
