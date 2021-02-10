import { createAction } from '@reduxjs/toolkit'
import { configureStore } from './store'

export const { epicMiddleware, store, reducerManager } = configureStore()

export const init = createAction('INIT')
