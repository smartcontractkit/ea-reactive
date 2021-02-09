import { combineEpics } from 'redux-observable'
import { serveApi } from './api/api'
import { epicMiddleware, init, store } from './data-stores/redux'
import { pollApiEpic } from './drivers/http'
import { triggers } from './modules/eth-usd'
import { trigger } from './modules/eth-usd-ccc'

const rootEpic = combineEpics(...triggers, trigger, pollApiEpic)
epicMiddleware.run(rootEpic)
store.dispatch(init())
serveApi(store)
