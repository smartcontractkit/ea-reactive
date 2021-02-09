import { createReducer } from '@reduxjs/toolkit'
import { Epic } from 'redux-observable'
import { filter, map } from 'rxjs/operators'
import { init, reducerManager } from '../data-stores/redux'
import { httpPollingRequestFulfilled, startHttpPolling } from '../drivers/http'

const datasources = ['coingecko', 'coinmarketcap', 'coinapi']

/**
 * Base data points
 */
export const triggers = datasources.map((c) => {
  const reducer = createReducer({}, (builder) => {
    builder.addMatcher(
      (action) => httpPollingRequestFulfilled.match(action) && action.payload.key === c,
      (state, action) => action.payload.data?.data?.result ?? state,
    )
  })

  reducerManager.add(`${c}-eth-usd`, reducer)

  const trigger: Epic = (action$, _state$) =>
    action$.pipe(
      filter(init.match),
      map(() =>
        startHttpPolling({
          apiKey: '',
          body: { data: { quote: 'USD', base: 'ETH' } },
          rateLimit: 0.2,
          url: `https://adapters.staging.org.devnet.tools/${c}/call`,
          key: c,
        }),
      ),
    )

  return trigger
})
