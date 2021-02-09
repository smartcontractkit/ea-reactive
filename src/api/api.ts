import express from 'express'
import { Action, AnyAction, CombinedState, Reducer, Store } from 'redux'

export function serveApi(
  store: Store<CombinedState<Record<string, Reducer<any, AnyAction>>>, Action<any>>,
) {
  const app = express()
  app.use(express.json())
  app.post('/', (req, res) => {
    const { path } = req.body
    console.log(path)
    res.send(store.getState())
  })

  app.listen(3000)
  return app
}
