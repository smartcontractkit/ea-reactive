import { createAction } from '@reduxjs/toolkit'
import { AxiosResponse } from 'axios'
import axios from 'axios-observable'
import { Epic } from 'redux-observable'
import { timer } from 'rxjs'
import {
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators'

interface HTTPPayload {
  /**
   * The rate limit of this api in req/sec
   */
  rateLimit: number
  /**
   * The URL to poll and return data from
   */
  url: string
  /**
   * HTTP request body
   */
  body: any
  /**
   * The API key to use within the request
   */
  apiKey: string
  /**
   * Metadata key for dynamic reducers to filter on
   */
  key: string
}

export const startHttpPolling = createAction<HTTPPayload>('HTTP_POLLING_STARTED')
export const stopHttpPolling = createAction('HTTP_POLLING_STOPPED')
export const httpPollingRequestFulfilled = createAction<AxiosResponse<any> & { key: string }>(
  'HTTP_POLLING_REQUEST_FULFILLED',
)

export const pollApiEpic: Epic = (action$) =>
  action$.pipe(
    filter(startHttpPolling.match),
    tap((action) => {
      console.log('matched on', action)
    }),
    mergeMap((action) =>
      timer(0, 1000 / action.payload.rateLimit).pipe(
        takeUntil(action$.pipe(filter(stopHttpPolling.match))),
        switchMap(() => axios.post(action.payload.url, action.payload.body)), // no timeout for now
        map((response) => httpPollingRequestFulfilled({ ...response, key: action.payload.key })),
        distinctUntilChanged(
          (a, b) => JSON.stringify(a.payload.data) === JSON.stringify(b.payload.data),
        ),
      ),
    ),
  )
