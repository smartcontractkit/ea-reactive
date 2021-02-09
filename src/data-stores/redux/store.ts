import {
  Action,
  applyMiddleware,
  CombinedState,
  combineReducers,
  createStore,
  PreloadedState,
  Reducer,
} from 'redux'
import { createEpicMiddleware } from 'redux-observable'
import { composeWithDevTools } from 'remote-redux-devtools'
export class ReducerManager {
  // Create an object which maps keys to reducers
  private reducers: Record<string, Reducer>
  // Create the initial combinedReducer
  private combinedReducer: Reducer<CombinedState<Record<string, Reducer>>>
  // An array which is used to delete state keys when reducers are removed
  private keysToRemove: string[] = []

  constructor(initialReducers: Record<string, Reducer>) {
    this.reducers = { ...initialReducers }
    this.combinedReducer = (state: any) => state
  }

  public getReducerMap() {
    return this.reducers
  }

  // The root reducer function exposed by this object
  // This will be passed to the store
  public reduce(state: any, action: Action) {
    // If any reducers have been removed, clean up their state first
    if (this.keysToRemove.length > 0) {
      state = { ...state }
      for (let key of this.keysToRemove) {
        delete state[key]
      }
      this.keysToRemove = []
    }

    // Delegate to the combined reducer
    return this.combinedReducer(state, action)
  }

  // Adds a new reducer with the specified key
  public add(key: string, reducer: Reducer) {
    if (!key || this.reducers[key]) {
      return
    }

    // Add the reducer to the reducer mapping
    this.reducers[key] = reducer

    // Generate a new combined reducer
    this.combinedReducer = combineReducers(this.reducers)
  }

  // Removes a reducer with the specified key
  public remove(key: string) {
    if (!key || !this.reducers[key]) {
      return
    }

    // Remove it from the reducer mapping
    delete this.reducers[key]

    // Add the key to the list of keys to clean up
    this.keysToRemove.push(key)

    // Generate a new combined reducer
    this.combinedReducer = combineReducers(this.reducers)
  }
}

export function configureStore(preloadedState: PreloadedState<any> = {}) {
  const epicMiddleware = createEpicMiddleware()
  const reducerManager = new ReducerManager({})

  const middlewares = [epicMiddleware]
  const middlewareEnhancer = applyMiddleware(...middlewares)

  const enhancers = [middlewareEnhancer]
  const composedEnhancers: any = composeWithDevTools({ realtime: true, port: 8000 })(...enhancers)

  // Create a store with the root reducer function being the one exposed by the manager.
  const store = createStore(
    reducerManager.reduce.bind(reducerManager),
    preloadedState,
    composedEnhancers,
  )
  return { store, epicMiddleware, reducerManager }
}
