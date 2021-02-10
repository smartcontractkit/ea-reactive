import { interval, Observable, of } from 'rxjs'
import { catchError, filter, map, mergeMap, switchMap, takeUntil } from 'rxjs/operators'
import { eventsSubject, EVENT_RESTART, EVENT_START } from '../runtime'

const DEFAULT_RAND_INTERVAL = 1000

export const CMD_RAND_START = 'rand_start'
export const CMD_RAND_STOP = 'rand_stop'
export const EVENT_RAND_UPDATE = 'rand_update'
export const EVENT_RAND_UPDATE_ERROR = 'rand_update_error'

const randomNumberGenerator$ = new Observable((subscriber) => {
  const randomNumber = Math.floor(Math.random() * 100)
  if (randomNumber <= 13) subscriber.error('Incorrect Random Number Generated')
  else if (randomNumber >= 97) subscriber.complete()
  else subscriber.next(randomNumber)
})

const driver = (num: number) =>
  interval(num).pipe(
    mergeMap(() => randomNumberGenerator$),
    map((number) => ({ type: EVENT_RAND_UPDATE, data: number })),
    catchError((error) => of({ type: EVENT_RAND_UPDATE_ERROR, error })),
  )

// TODO: declarations
// TODO: DAG composabilitty
// TODO: remove subscriptions

// Ships with the runtime, re/start turn the number generator on always
// On error restart
eventsSubject
  .pipe(
    filter(
      (e) =>
        e.type === EVENT_START ||
        e.type === EVENT_RESTART ||
        (e.type === EVENT_RAND_UPDATE_ERROR && e.interval !== DEFAULT_RAND_INTERVAL),
    ),
    switchMap(() => driver(DEFAULT_RAND_INTERVAL)),
  )
  .subscribe((e) => eventsSubject.next(e))

const destroy$ = (interval: number) =>
  eventsSubject.pipe(filter((e) => e.type === CMD_RAND_STOP && e.interval === interval))

// Modules can re/start turn the number generator on demand
eventsSubject
  .pipe(
    filter((e) => e.type === CMD_RAND_START && e.interval !== DEFAULT_RAND_INTERVAL),
    mergeMap((e) => driver(e.interval).pipe(takeUntil(destroy$(e.interval)))),
  )
  .subscribe((e) => eventsSubject.next(e))
