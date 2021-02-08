import { BehaviorSubject, Observable } from 'rxjs'
import { map, mergeMap, scan, shareReplay, startWith, take, tap } from 'rxjs/operators'
import {
  combineReducers,
  combineTriggers,
  Reducer,
  State,
  StateReducers,
  StateTriggers,
  Trigger,
} from './state'

export const EVENT_START = 'start'
export const EVENT_RESTART = 'restart'

export const DEFAULT_INIT_STATE = { runtime: { status: 'stopped' } }

const initialEvent = { type: EVENT_START }
export const eventsSubject = new BehaviorSubject<any>(initialEvent)

// Event loop
export const state$ = (reducer: Reducer, initialState: State) =>
  eventsSubject
    .asObservable()
    .pipe(scan(reducer, initialState), startWith(initialState), shareReplay(1))

const runtimeReducer: Reducer = (s, e) => {
  if (e.type === EVENT_START) return { ...s, status: 'started' }
  if (e.type === EVENT_RESTART) return { ...s, restarted: (s.restarted || 0) + 1 }
  return s
}

export const reducer = (moduleReducers: StateReducers) =>
  combineReducers({
    runtime: runtimeReducer,
    modules: combineReducers(moduleReducers),
  })

export interface Module {
  reducer: Reducer
  trigger: Trigger
}

export interface Modules {
  [key: string]: Module
}

export const loadReducers = (modules: Modules): StateReducers => {
  const reducers = Object.entries(modules).map(([k, v]) => [k, v.reducer])
  return Object.fromEntries(reducers)
}

export const loadTriggers = (modules: Modules): StateTriggers => {
  const triggers = Object.entries(modules).map(([k, v]) => [k, v.trigger])
  return Object.fromEntries(triggers)
}

export const triggers$ = (_state$: Observable<State>, modules: Modules) => {
  const _triggerAll$ = combineTriggers(loadTriggers(modules))
  return eventsSubject.asObservable().pipe(
    mergeMap((e) =>
      _state$.pipe(
        take(1),
        map((s) => ({ e, s })),
      ),
    ),
    mergeMap(({ e, s }) => _triggerAll$(s['modules'], e)),
    tap((e) => eventsSubject.next(e)),
  )
}
