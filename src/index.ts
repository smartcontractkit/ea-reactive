import * as modules from './modules'
import * as runtime from './runtime'

const reducer = runtime.reducer(runtime.loadReducers(modules))
const triggers = runtime.loadTriggers(modules)
const state$ = runtime.state$(reducer, runtime.DEFAULT_INIT_STATE)
const triggers$ = runtime.triggers$(state$, modules)

// Start the event loop and log state changes to console
state$.subscribe((s) => console.log(JSON.stringify(s, null, 2)))
// Start triggering
triggers$.subscribe()

// Log all events to console
const { eventsSubject } = runtime
eventsSubject.asObservable().subscribe(console.log)
