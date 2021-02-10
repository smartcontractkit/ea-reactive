import { createAction } from '@reduxjs/toolkit'
import axios from 'axios-observable'
import { Epic } from 'redux-observable'
import { of, race, throwError } from 'rxjs'
import { catchError, delay, filter, map, mapTo, mergeMap, withLatestFrom } from 'rxjs/operators'

/**
 * This driver handles cache warmups for a HTTP endpoint, in this case, specifically for v1 external adapters.
 *
 * This driver gets events that are sent in from v1 adapters, then tracks when each EA cache would get cold via configured TTL.
 * If the cache is ever determined to turn cold, a warmup response is sent to that particular EA to keep its cache warm, avoiding
 * performance penalties of a cache bust.
 */

interface WarmupRequestRecievedPayload {
  /**
   * The URL of the external adapter we should track cache warmup for
   */
  url: string
  /**
   * The body of data we should send when we send a warmup response to warm up a external adapter's cache
   */
  body: unknown
  /**
   * The time to live (TTL) in seconds of a warm up request. This number gets reset every single time
   * a warmup request comes in from the same adapter, if it ever is allowed to expire, it means we should send
   * a warm up response to the external adapter
   */
  ttl: number
  /**
   * Metadata related to the external adapter itself that we can index, ex. the current response data of the EA that it
   * has received while warming up its cache
   */
  meta: any
}

/**
 * These set of events are emitted when a v1 EA calls this service
 */
export const warmupRequestRecieved = createAction<WarmupRequestRecievedPayload>(
  'WARMUP_REQUEST_RECIEVED',
)
export const warmupRequestFulfilled = createAction('WARMUP_REQUEST_FULFILLED')
export const warmupRequestFailed = createAction('WARMUP_REQUEST_FAILED')

interface WarmupResponseRequestedPayload {
  /**
   * State lookup key so that the warmup response handler can find the slice of data it needs
   * to warmup the cold EA
   */
  key: string
}
interface WarmupResponseFulfilledPayload {
  /**
   * State lookup key
   */
  key: string
}
interface WarmupResponseFailedPayload {
  /**
   * State lookup key
   */
  key: string
}
/**
 * These set of events are emitted when our warmup driver calls a v1 EA to warm up its cache
 */
export const warmupResponseRequested = createAction<WarmupResponseRequestedPayload>(
  'WARMUP_RESPONSE_REQUESTED',
)
export const warmupResponseFulfilled = createAction<WarmupResponseFulfilledPayload>(
  'WARMUP_RESPONSE_FULFILLED',
)
export const warmupResponseFailed = createAction<WarmupResponseFailedPayload>(
  'WARMUP_RESPONSE_FAILED',
)

/**
 * Handle warmup request received events
 */
export const warmupRequestEpic: Epic = (action$, _state$) =>
  action$.pipe(
    filter(warmupRequestRecieved.match),
    mergeMap((action) => {
      const dropWarmupResponse$ = action$.pipe(
        filter(warmupRequestRecieved.match),
        filter((a) => isSameEA(a, action)),
      )
      // if this emits, we will emit an event to send a warmup response to an EA
      const requestWarmupResponse$ = of(warmupResponseRequested({ key: hashEA(action) })).pipe(
        delay(action.payload.ttl),
      )

      return race(requestWarmupResponse$, dropWarmupResponse$)
    }),
    catchError(() => of(warmupRequestFailed())),
  )

/**
 * Handle warmup response request events
 */
export const warmupResponseEpic: Epic = (action$, state$) =>
  action$.pipe(
    filter(warmupResponseRequested.match),
    withLatestFrom(state$),
    map(([action, state]) => ({
      ...(state[action.payload.key] as WarmupRequestRecievedPayload),
      key: action.payload.key,
    })),
    mergeMap(({ url, body, key }) =>
      axios.post(url, body).pipe(
        mapTo(key),
        catchError(() => throwError(key)),
      ),
    ), // no timeout for now but we should really add one
    map((key) => warmupResponseFulfilled({ key })),
    catchError((e) => of(warmupResponseFailed({ key: e }))),
  )

function hashEA(a: ReturnType<typeof warmupRequestRecieved>) {
  return `${a.payload.url}${JSON.stringify(a.payload.body)}`
}

function isSameEA(
  a: ReturnType<typeof warmupRequestRecieved>,
  b: ReturnType<typeof warmupRequestRecieved>,
): boolean {
  return hashEA(a) === hashEA(b)
}
