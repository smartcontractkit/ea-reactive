import { createAction, createReducer } from '@reduxjs/toolkit'
import { Epic } from 'redux-observable'
import { filter, map, withLatestFrom } from 'rxjs/operators'
import { reducerManager } from '../data-stores/redux'
import { httpPollingRequestFulfilled } from '../drivers/http'

const ccc = ['coingecko', 'coinmarketcap', 'coinapi']
const update = createAction<number[]>('UPDATE_CCC')

// Trigger on the httpPollingRequestFulfilled event + the adapters we're interested in
export const trigger: Epic = (action$, state$) =>
  action$.pipe(
    filter(httpPollingRequestFulfilled.match),
    filter((action) => ccc.includes(action.payload.key)),
    withLatestFrom(state$),
    map(([, state]) => update(ccc.map((c) => state[`${c}-eth-usd`]))),
  )

const reducer = createReducer(0, (builder) => {
  builder.addCase(update, (_, { payload }) => payload.reduce((a, b) => a + b, 0) / payload.length)
})

reducerManager.add(`ccc-eth-usd`, reducer)
