 [webpack-dev-server] Server started: Hot Module Replacement enabled, Live Reloading enabled, Progress disabled, Overlay enabled.
 [HMR] Waiting for update signal from WDS...
 Initializing TokenService
 📦 Token Storage Status
 Access Token: ✅ Present
 Refresh Token: ✅ Present
 Token Expiry: ✅ Present
 Token Expiry: Tue Aug 26 2025 21:09:16 GMT-0600 (hora estándar central)
 Current Time: Tue Aug 26 2025 10:33:59 GMT-0600 (hora estándar central)
 Is Valid: ✅ Yes
 ✅ Tokens loaded from storage
 ✅ Valid tokens already exist, no preload needed
 ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. 
overrideMethod @ installHook.js:1
 ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. 
overrideMethod @ installHook.js:1
 pmpos:app 🚀 Initializing application... +0ms
 🔄 Starting token preload for instant login...
consoleProxy.js:28 ✅ Valid tokens already exist, no preload needed
common.js:113 pmpos:auth Starting auth initialization +0ms
common.js:113 pmpos:auth No token found +0ms
common.js:113 pmpos:app ✅ Authentication initialized +1ms
consoleProxy.js:28 🔧 Debug commands available:
consoleProxy.js:28   - window.debugTerminal() - Show terminal status
consoleProxy.js:28   - window.registerTerminalManual(user) - Manual registration
:8081/#/pinpad:1 [DOM] Password field is not contained in a form: (More info: https://goo.gl/9p2vKq) <input aria-invalid=​"false" placeholder=​"••••" type=​"password" maxlength=​"32" pattern=​"[0-9]​*" inputmode=​"numeric" class=​"MuiInputBase-input MuiOutlinedInput-input Mui-disabled css-p51h6s-MuiInputBase-input-MuiOutlinedInput-input" value=​"1133" id=​"mui-2" style=​"font-size:​ 2rem;​ font-weight:​ bold;​ letter-spacing:​ 0.5em;​ text-align:​ center;​ padding:​ 16px;​" disabled>​
auth.js:71 🔑 Login Attempt
consoleProxy.js:28 📡 Sending PIN validation with preloaded token...
consoleProxy.js:28 👤 User validation response: Object
consoleProxy.js:28 User name from response: graphiql
consoleProxy.js:28 ✅ Login successful: graphiql
common.js:113 pmpos:terminal 👤 Current user set to: +0ms graphiql
common.js:113 pmpos:terminal 🖥️ Starting terminal registration for user: +0ms graphiql
common.js:113 pmpos:queries 🖥️ Starting complete terminal registration... +0ms
common.js:113 pmpos:queries 🔐 Ensuring authentication... +0ms
auth.js:97 Login Duration: 43.806884765625 ms
consoleProxy.js:28 🔄 Auth state changed - navigating to tables
consoleProxy.js:28 ✅ Using valid cached access token (preloaded)
common.js:113 pmpos:queries 📋 Complete terminal registration: +3ms Object
common.js:113 pmpos:queries 📝 Sending terminal registration query: +0ms Object
common.js:113 pmpos:queries 🔁 Register terminal attempt 1/3 +0ms
consoleProxy.js:28 🚀 Navigation request: /main
consoleProxy.js:28 📍 Navigating to: /tables
common.js:113 pmpos:tables 📋 Loading entity screen items (tables)... +0ms
consoleProxy.js:28 📦 Cache HIT: pmpos_cached_tables
common.js:113 pmpos:tables 📦 Using cached tables (30 tables) +1ms
common.js:113 pmpos:mesa-status 🔄 Starting mesa status polling every 2000ms +0ms
common.js:113 pmpos:mesa-status 🔄 Starting mesa status polling every 2000ms +15ms
common.js:113 pmpos:mesa-status 🚫 Throttling rapid refresh calls +0ms
common.js:113 pmpos:mesa-status 🔄 Refreshing mesa status... +0ms
common.js:113 pmpos:queries 🌍 Getting all open tickets for mesa occupancy... +152ms
common.js:113 pmpos:queries 🔐 Ensuring authentication... +0ms
consoleProxy.js:28 ✅ Using valid cached access token (preloaded)
common.js:113 pmpos:queries ✅ Found 44 open tickets from all users +60ms
common.js:113 pmpos:tables 🔄 Re-processing tables with updated tickets... +192ms
common.js:113 pmpos:tables 📋 Loading entity screen items (tables)... +0ms
consoleProxy.js:28 📦 Cache HIT: pmpos_cached_tables
common.js:113 pmpos:tables 📦 Using cached tables (30 tables) +1ms
common.js:113 pmpos:mesa-status ✅ Refreshed: 44 open tickets +93ms
:8081/api/graphql:1  Failed to load resource: the server responded with a status of 500 (Internal Server Error)
common.js:113 pmpos:queries 📡 Terminal registration response: 500 Internal Server Error +92ms
hook.js:608 ❌ Terminal registration HTTP error: Object
overrideMethod @ hook.js:608
common.js:113 pmpos:queries ⏳ Waiting 500ms before retrying registerTerminal +1ms
common.js:113 pmpos:queries 🔁 Register terminal attempt 2/3 +502ms
:8081/api/graphql:1  Failed to load resource: the server responded with a status of 500 (Internal Server Error)
common.js:113 pmpos:queries 📡 Terminal registration response: 500 Internal Server Error +252ms
hook.js:608 ❌ Terminal registration HTTP error: Object
overrideMethod @ hook.js:608
common.js:113 pmpos:queries ⏳ Waiting 1000ms before retrying registerTerminal +1ms
common.js:113 pmpos:queries 🔁 Register terminal attempt 3/3 +1s
common.js:113 pmpos:mesa-status 🔄 Refreshing mesa status... +2s
common.js:113 pmpos:queries 🌍 Getting all open tickets for mesa occupancy... +104ms
common.js:113 pmpos:queries 🔐 Ensuring authentication... +0ms
consoleProxy.js:28 ✅ Using valid cached access token (preloaded)
common.js:113 pmpos:mesa-status 🚫 Throttling rapid refresh calls +1ms
common.js:113 pmpos:queries ✅ Found 44 open tickets from all users +26ms
common.js:113 pmpos:tables 🔄 Re-processing tables with updated tickets... +2s
common.js:113 pmpos:tables 📋 Loading entity screen items (tables)... +0ms
consoleProxy.js:28 📦 Cache HIT: pmpos_cached_tables
common.js:113 pmpos:tables 📦 Using cached tables (30 tables) +0ms
common.js:113 pmpos:queries 🔍 Mesa 1 ticket analysis: +18ms Object
common.js:113 pmpos:queries 🎯 Mesa 1 final status: CUENTA +0ms
common.js:113 pmpos:mesa-status ✅ Refreshed: 44 open tickets +60ms
consoleProxy.js:28 🔄 Mesa polling active: 44 tickets, next update in 2s
graphql:1  Failed to load resource: the server responded with a status of 500 (Internal Server Error)
queries.js:164 pmpos:queries 📡 Terminal registration response: 500 Internal Server Error +399ms
consoleProxy.js:28 ❌ Terminal registration HTTP error: {status: 500, statusText: 'Internal Server Error', body: '{\r\n  "message": "An error has occurred.",\r\n  "exce…ntrollerDispatcher.<SendAsync>d__1.MoveNext()"\r\n}', variables: {…}, attempt: 3}
overrideMethod @ hook.js:608
(anonymous) @ consoleProxy.js:28
registerTerminalAsync @ queries.js:168
consoleProxy.js:28 ❌ Exception during registerTerminal attempt {err: 'Terminal registration failed: HTTP 500 - {\r\n  "mes…ntrollerDispatcher.<SendAsync>d__1.MoveNext()"\r\n}', attempt: 3}
overrideMethod @ hook.js:608
(anonymous) @ consoleProxy.js:28
registerTerminalAsync @ queries.js:190
consoleProxy.js:28 ⚠️ Non-blocking: continuing without terminalId: Terminal registration failed: HTTP 500 - {
  "message": "An error has occurred.",
  "exceptionMessage": "Object reference not set to an instance of an object.",
  "exceptionType": "System.NullReferenceException",
  "stackTrace": "   at Samba.Services.Implementations.LogService.LogError(Exception e, String userMessage) in C:\\Users\\Vehbi\\Documents\\Source\\Repos\\sambapos-v5-pro\\Samba.Services\\Implementations\\LogService.cs:line 24\r\n   at Samba.MessagingServer.WindowsService.Controllers.GraphqlController.<Post>d__6.MoveNext()\r\n--- End of stack trace from previous location where exception was thrown ---\r\n   at System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()\r\n   at System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task task)\r\n   at System.Threading.Tasks.TaskHelpersExtensions.<CastToObject>d__3`1.MoveNext()\r\n--- End of stack trace from previous location where exception was thrown ---\r\n   at System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()\r\n   at System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task task)\r\n   at System.Web.Http.Controllers.ApiControllerActionInvoker.<InvokeActionAsyncCore>d__0.MoveNext()\r\n--- End of stack trace from previous location where exception was thrown ---\r\n   at System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()\r\n   at System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task task)\r\n   at System.Web.Http.Controllers.ActionFilterResult.<ExecuteAsync>d__2.MoveNext()\r\n--- End of stack trace from previous location where exception was thrown ---\r\n   at System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()\r\n   at System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task task)\r\n   at System.Web.Http.Filters.AuthorizationFilterAttribute.<ExecuteAuthorizationFilterAsyncCore>d__2.MoveNext()\r\n--- End of stack trace from previous location where exception was thrown ---\r\n   at System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()\r\n   at System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task task)\r\n   at System.Web.Http.Dispatcher.HttpControllerDispatcher.<SendAsync>d__1.MoveNext()"
}
overrideMethod @ hook.js:608
(anonymous) @ consoleProxy.js:28
_performRegistration @ terminalService.js:204
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
Fetch failed loading: GET "<URL>".
consoleProxy.js:20 Fetch failed loading: GET "http://localhost:8081/__log?level=error&msg=%E2%9D%8C%20Exception%20during%20registerTerminal%20attempt%20%7B%22err%22%3A%22Terminal%20registration%20failed%3A%20HTTP%20500%20-%20%7B%5Cr%5Cn%20%20%5C%22message%5C%22%3A%20%5C%22An%20error%20has%20occurred.%5C%22%2C%5Cr%5Cn%20%20%5C%22exceptionMessage%5C%22%3A%20%5C%22Object%20reference%20not%20set%20to%20an%20instance%20of%20an%20object.%5C%22%2C%5Cr%5Cn%20%20%5C%22exceptionType%5C%22%3A%20%5C%22System.NullReferenceException%5C%22%2C%5Cr%5Cn%20%20%5C%22stackTrace%5C%22%3A%20%5C%22%20%20%20at%20Samba.Services.Implementations.LogService.LogError(Exception%20e%2C%20String%20userMessage)%20in%20C%3A%5C%5C%5C%5CUsers%5C%5C%5C%5CVehbi%5C%5C%5C%5CDocuments%5C%5C%5C%5CSource%5C%5C%5C%5CRepos%5C%5C%5C%5Csambapos-v5-pro%5C%5C%5C%5CSamba.Services%5C%5C%5C%5CImplementations%5C%5C%5C%5CLogService.cs%3Aline%2024%5C%5Cr%5C%5Cn%20%20%20at%20Samba.MessagingServer.WindowsService.Controllers.GraphqlController.%3CPost%3Ed__6.MoveNext()%5C%5Cr%5C%5Cn---%20End%20of%20stack%20trace%20from%20previous%20location%20where%20exception%20was%20thrown%20---%5C%5Cr%5C%5Cn%20%20%20at%20System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()%5C%5Cr%5C%5Cn%20%20%20at%20System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task%20task)%5C%5Cr%5C%5Cn%20%20%20at%20System.Threading.Tasks.TaskHelpersExtensions.%3CCastToObject%3Ed__3%601.MoveNext()%5C%5Cr%5C%5Cn---%20End%20of%20stack%20trace%20from%20previous%20location%20where%20exception%20was%20thrown%20---%5C%5Cr%5C%5Cn%20%20%20at%20System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()%5C%5Cr%5C%5Cn%20%20%20at%20System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task%20task)%5C%5Cr%5C%5Cn%20%20%20at%20System.Web.Http.Controllers.ApiControllerActionInvoker.%3CInvokeActionAsyncCore%3Ed__0.MoveNext()%5C%5Cr%5C%5Cn---%20End%20of%20stack%20trace%20from%20previous%20location%20where%20exception%20was%20thrown%20---%5C%5Cr%5C%5Cn%20%20%20at%20System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()%5C%5Cr%5C%5Cn%20%20%20at%20System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task%20task)%5C%5Cr%5C%5Cn%20%20%20at%20System.Web.Http.Controllers.ActionFilterResult.%3CExecuteAsync%3Ed__2.MoveNext()%5C%5Cr%5C%5Cn---%20End%20of%20stack%20trace%20from%20previous%20location%20where%20exception%20was%20thrown%20---%5C%5Cr%5C%5Cn%20%20%20at%20System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()%5C%5Cr%5C%5Cn%20%20%20at%20System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task%20task)%5C%5Cr%5C%5Cn%20%20%20at%20System.Web.Http.Filters.".
send @ consoleProxy.js:20
(anonymous) @ consoleProxy.js:27
registerTerminalAsync @ queries.js:190
useMesasStatus.js:53 pmpos:mesa-status 🔄 Refreshing mesa status... +2s
queries.js:1030 pmpos:queries 🌍 Getting all open tickets for mesa occupancy... +2s
queries.js:48 pmpos:queries 🔐 Ensuring authentication... +0ms
consoleProxy.js:28 ✅ Using valid cached access token (preloaded)
useMesasStatus.js:45 pmpos:mesa-status 🚫 Throttling rapid refresh calls +1ms
Fetch failed loading: GET "<URL>)".
Fetch failed loading: GET "<URL>)".
Fetch failed loading: GET "<URL>)".
Fetch failed loading: GET "<URL>)".
Fetch failed loading: GET "<URL>)".
Fetch failed loading: GET "<URL>)".
Fetch failed loading: GET "<URL>)".
Fetch failed loading: GET "<URL>)".
Fetch failed loading: GET "<URL>)".
Fetch failed loading: GET "<URL>)".
Fetch failed loading: GET "<URL>)".
queries.js:1071 pmpos:queries ✅ Found 44 open tickets from all users +64ms
Fetch finished loading: POST "<URL>".
Fetch finished loading: POST "<URL>".
Fetch finished loading: POST "<URL>".
Fetch finished loading: POST "<URL>".
Fetch finished loading: POST "<URL>".
Fetch finished loading: POST "<URL>".
Fetch finished loading: POST "<URL>".
Fetch finished loading: POST "<URL>".
TableView.jsx:403 pmpos:tables 🔄 Re-processing tables with updated tickets... +2s
TableView.jsx:331 pmpos:tables 📋 Loading entity screen items (tables)... +1ms
consoleProxy.js:28 📦 Cache HIT: pmpos_cached_tables
TableView.jsx:337 pmpos:tables 📦 Using cached tables (30 tables) +1ms
useMesasStatus.js:60 pmpos:mesa-status ✅ Refreshed: 44 open tickets +99ms
TableView.jsx:194 pmpos:tables 🔍 Clicked table 1 with status: CUENTA +117ms
TableView.jsx:156 pmpos:tables 🔍 Accessing OCCUPIED table: 1 +0ms
TableView.jsx:168 pmpos:tables ✅ Found ticket for occupied table: +0ms {id: 27187, totalAmount: 65, remainingAmount: 65, entities: Array(1), orders: Array(1)}
useMesasStatus.js:99 pmpos:mesa-status ⏹️ Stopping mesa status polling +106ms
POSViewMobile.jsx:151 pmpos:pos-mobile 📱 Menu loading effect triggered +0ms
POSViewMobile.jsx:114 pmpos:pos-mobile 📱 Starting menu load... +2ms
POSViewMobile.jsx:115 pmpos:pos-mobile 📱 Current menu state: +0ms undefined
POSViewMobile.jsx:120 pmpos:pos-mobile 📱 Loading menu using MenuService... +0ms
menuService.js:23 pmpos:menu 📋 Getting menu... +0ms {forceRefresh: true}
consoleProxy.js:28 ✅ Using valid cached access token (preloaded)
POSViewMobile.jsx:205 pmpos:pos-mobile 📋 Loading existing orders from ticket prop +2ms
menuService.js:63 pmpos:menu 📋 Trying menu query format 1/4... +18ms
menuService.js:99 pmpos:menu 🔗 Executing GraphQL query to: /api/graphql +1ms
menuService.js:100 pmpos:menu 🔑 Token status: Present (AQAAANCMnd...) +0ms
menuService.js:101 pmpos:menu 📝 Query being sent: +0ms query GetMenu {
                getMenu(name: "MENU") {
                    categories {
                        name
                        menuItems {
                            name
             ...
menuService.js:113 pmpos:menu 📡 HTTP Response: 200 OK +21ms
menuService.js:114 pmpos:menu 📡 Response headers: +0ms {access-control-allow-credentials: 'true', access-control-allow-origin: 'http://localhost:8081', connection: 'close', content-encoding: 'br', content-type: 'application/json; charset=utf-8', …}
menuService.js:133 pmpos:menu 📦 Full GraphQL response: +0ms {data: {…}, errors: null}
menuService.js:143 pmpos:menu 🍽️ Menu data structure: +0ms Found 2 categories
menuService.js:146 pmpos:menu 📋 Categories found: POLLOS, EXTRAS +1ms
menuService.js:329 pmpos:menu ✅ Menu data validation passed +0ms
menuService.js:68 pmpos:menu ✅ Menu loaded successfully with format +0ms 1
consoleProxy.js:28 📦 Cache SET: pmpos_cached_menu
POSViewMobile.jsx:129 pmpos:pos-mobile 📱 ✅ Valid menu data from MenuService: +40ms {categories: Array(2)}
consoleProxy.js:28 🔧 Reducer SET_MENU action: {type: 'SET_MENU', menu: {…}}
consoleProxy.js:28 🔧 Setting menu data: {categories: Array(2)}
consoleProxy.js:28 🔧 New state after SET_MENU: {items: Array(0), ticketsNeedsRefresh: false, isAuthenticated: false, message: {…}, error: null, …}
POSViewMobile.jsx:133 pmpos:pos-mobile 📱 Menu dispatched successfully to Redux +11ms
consoleProxy.js:28 Warning: Each child in a list should have a unique "key" prop.

Check the render method of `MobileMenu`. See https://reactjs.org/link/warning-keys for more information.
    at MenuItemCard (http://localhost:8081/app_components_POS_POSViewUnified_jsx.1f366ebeb656060a27ec.js:225:5)
    at MobileMenu (http://localhost:8081/app_components_POS_POSViewUnified_jsx.1f366ebeb656060a27ec.js:128:3)
    at div
    at http://localhost:8081/vendor.emotion.efbc891d71f8a134a5e2.js:832:66
    at Box (http://localhost:8081/vendor.mui.a6d809c24878199c4fed.js:26703:72)
    at MobileMenuContainer
    at div
    at http://localhost:8081/vendor.emotion.efbc891d71f8a134a5e2.js:832:66
    at Box (http://localhost:8081/vendor.mui.a6d809c24878199c4fed.js:26703:72)
    at div
    at http://localhost:8081/vendor.emotion.efbc891d71f8a134a5e2.js:832:66
    at Box (http://localhost:8081/vendor.mui.a6d809c24878199c4fed.js:26703:72)
    at POSViewMobile (http://localhost:8081/app_components_POS_POSViewUnified_jsx.1f366ebeb656060a27ec.js:622:82)
    at POSViewUnified (http://localhost:8081/app_components_POS_POSViewUnified_jsx.1f366ebeb656060a27ec.js:1335:81)
    at PrivateRoute (http://localhost:8081/app_components_App_jsx.c874031e3d069f4d4d59.js:547:3)
    at RenderedRoute (http://localhost:8081/vendor.react-router-dom.9a6bb5588f31b140c084.js:2142:5)
    at Routes (http://localhost:8081/vendor.react-router-dom.9a6bb5588f31b140c084.js:2876:5)
    at Suspense
    at div
    at AppContent (http://localhost:8081/app_components_App_jsx.c874031e3d069f4d4d59.js:557:76)
    at DefaultPropsProvider (http://localhost:8081/vendor.mui.a6d809c24878199c4fed.js:25508:3)
    at RtlProvider (http://localhost:8081/vendor.mui.a6d809c24878199c4fed.js:25649:7)
    at ThemeProvider (http://localhost:8081/vendor.mui.a6d809c24878199c4fed.js:30421:5)
    at ThemeProvider (http://localhost:8081/vendor.mui.a6d809c24878199c4fed.js:25936:5)
    at ThemeProvider (http://localhost:8081/vendor.mui.a6d809c24878199c4fed.js:28918:14)
    at ThemeProvider (http://localhost:8081/app_components_App_jsx.c874031e3d069f4d4d59.js:716:3)
    at App
    at Suspense
    at Router (http://localhost:8081/vendor.react-router-dom.9a6bb5588f31b140c084.js:2810:15)
    at HashRouter (http://localhost:8081/vendor.react-router-dom.9a6bb5588f31b140c084.js:753:5)
    at Provider (http://localhost:8081/vendor.react-redux.7a27fb7b752521a27a9b.js:50:20)
overrideMethod @ hook.js:608
(anonymous) @ consoleProxy.js:28
printWarning @ react.development.js:220
error @ react.development.js:196
validateExplicitKey @ react.development.js:2052
validateChildKeys @ react.development.js:2078
createElementWithValidation @ react.development.js:2233
(anonymous) @ MobileMenu.jsx:391
MobileMenu @ MobileMenu.jsx:360
renderWithHooks @ react-dom.development.js:14986
mountIndeterminateComponent @ react-dom.development.js:17812
beginWork @ react-dom.development.js:19050
beginWork$1 @ react-dom.development.js:23941
performUnitOfWork @ react-dom.development.js:22777
workLoopSync @ react-dom.development.js:22708
renderRootSync @ react-dom.development.js:22671
performSyncWorkOnRoot @ react-dom.development.js:22294
(anonymous) @ react-dom.development.js:11328
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
flushSyncCallbackQueueImpl @ react-dom.development.js:11323
flushSyncCallbackQueue @ react-dom.development.js:11310
scheduleUpdateOnFiber @ react-dom.development.js:21894
dispatchAction @ react-dom.development.js:16140
loadMenu @ POSViewMobile.jsx:146
await in loadMenu
(anonymous) @ POSViewMobile.jsx:155
invokePassiveEffectCreate @ react-dom.development.js:23488
callCallback @ react-dom.development.js:3946
invokeGuardedCallbackDev @ react-dom.development.js:3995
invokeGuardedCallback @ react-dom.development.js:4057
flushPassiveEffectsImpl @ react-dom.development.js:23575
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
flushPassiveEffects @ react-dom.development.js:23448
performSyncWorkOnRoot @ react-dom.development.js:22270
(anonymous) @ react-dom.development.js:11328
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
flushSyncCallbackQueueImpl @ react-dom.development.js:11323
workLoop @ scheduler.development.js:417
flushWork @ scheduler.development.js:390
performWorkUntilDeadline @ scheduler.development.js:157
TableView.jsx:331 pmpos:tables 📋 Loading entity screen items (tables)... +6s
consoleProxy.js:28 📦 Cache HIT: pmpos_cached_tables
TableView.jsx:337 pmpos:tables 📦 Using cached tables (30 tables) +0ms
useMesasStatus.js:82 pmpos:mesa-status 🔄 Starting mesa status polling every 2000ms +7s
useMesasStatus.js:82 pmpos:mesa-status 🔄 Starting mesa status polling every 2000ms +12ms
useMesasStatus.js:45 pmpos:mesa-status 🚫 Throttling rapid refresh calls +0ms
useMesasStatus.js:53 pmpos:mesa-status 🔄 Refreshing mesa status... +1ms
queries.js:1030 pmpos:queries 🌍 Getting all open tickets for mesa occupancy... +7s
queries.js:48 pmpos:queries 🔐 Ensuring authentication... +0ms
consoleProxy.js:28 ✅ Using valid cached access token (preloaded)
queries.js:1071 pmpos:queries ✅ Found 44 open tickets from all users +53ms
TableView.jsx:403 pmpos:tables 🔄 Re-processing tables with updated tickets... +190ms
TableView.jsx:331 pmpos:tables 📋 Loading entity screen items (tables)... +0ms
consoleProxy.js:28 📦 Cache HIT: pmpos_cached_tables
TableView.jsx:337 pmpos:tables 📦 Using cached tables (30 tables) +1ms
useMesasStatus.js:60 pmpos:mesa-status ✅ Refreshed: 44 open tickets +86ms
queries.js:1098 pmpos:queries 🔍 Mesa 1 ticket analysis: +823ms {ticketId: 27187, totalAmount: 65, remainingAmount: 65, ordersCount: 1}
queries.js:1127 pmpos:queries 🎯 Mesa 1 final status: CUENTA +0ms
TableView.jsx:194 pmpos:tables 🔍 Clicked table 1 with status: CUENTA +807ms
TableView.jsx:156 pmpos:tables 🔍 Accessing OCCUPIED table: 1 +0ms
TableView.jsx:168 pmpos:tables ✅ Found ticket for occupied table: +0ms {id: 27187, totalAmount: 65, remainingAmount: 65, entities: Array(1), orders: Array(1)}
useMesasStatus.js:99 pmpos:mesa-status ⏹️ Stopping mesa status polling +798ms
POSViewMobile.jsx:151 pmpos:pos-mobile 📱 Menu loading effect triggered +7s
POSViewMobile.jsx:157 pmpos:pos-mobile 📱 Menu already exists and is valid: +0ms {categories: Array(2)}
POSViewMobile.jsx:205 pmpos:pos-mobile 📋 Loading existing orders from ticket prop +0ms
TableView.jsx:331 pmpos:tables 📋 Loading entity screen items (tables)... +2s
consoleProxy.js:28 📦 Cache HIT: pmpos_cached_tables
TableView.jsx:337 pmpos:tables 📦 Using cached tables (30 tables) +1ms
useMesasStatus.js:82 pmpos:mesa-status 🔄 Starting mesa status polling every 2000ms +2s
useMesasStatus.js:82 pmpos:mesa-status 🔄 Starting mesa status polling every 2000ms +13ms
useMesasStatus.js:45 pmpos:mesa-status 🚫 Throttling rapid refresh calls +1ms
useMesasStatus.js:53 pmpos:mesa-status 🔄 Refreshing mesa status... +0ms
queries.js:1030 pmpos:queries 🌍 Getting all open tickets for mesa occupancy... +2s
queries.js:48 pmpos:queries 🔐 Ensuring authentication... +0ms
consoleProxy.js:28 ✅ Using valid cached access token (preloaded)
queries.js:1071 pmpos:queries ✅ Found 44 open tickets from all users +27ms
TableView.jsx:403 pmpos:tables 🔄 Re-processing tables with updated tickets... +153ms
TableView.jsx:331 pmpos:tables 📋 Loading entity screen items (tables)... +1ms
consoleProxy.js:28 📦 Cache HIT: pmpos_cached_tables
TableView.jsx:337 pmpos:tables 📦 Using cached tables (30 tables) +0ms
useMesasStatus.js:60 pmpos:mesa-status ✅ Refreshed: 44 open tickets +59ms
useMesasStatus.js:53 pmpos:mesa-status 🔄 Refreshing mesa status... +2s
queries.js:1030 pmpos:queries 🌍 Getting all open tickets for mesa occupancy... +2s
queries.js:48 pmpos:queries 🔐 Ensuring authentication... +0ms
consoleProxy.js:28 ✅ Using valid cached access token (preloaded)
useMesasStatus.js:45 pmpos:mesa-status 🚫 Throttling rapid refresh calls +2ms
queries.js:1071 pmpos:queries ✅ Found 44 open tickets from all users +34ms
TableView.jsx:403 pmpos:tables 🔄 Re-processing tables with updated tickets... +2s
TableView.jsx:331 pmpos:tables 📋 Loading entity screen items (tables)... +0ms
consoleProxy.js:28 📦 Cache HIT: pmpos_cached_tables
TableView.jsx:337 pmpos:tables 📦 Using cached tables (30 tables) +1ms
useMesasStatus.js:60 pmpos:mesa-status ✅ Refreshed: 44 open tickets +63ms
TableView.jsx:194 pmpos:tables 🔍 Clicked table 17 with status: CUENTA +447ms
TableView.jsx:156 pmpos:tables 🔍 Accessing OCCUPIED table: 17 +0ms
TableView.jsx:168 pmpos:tables ✅ Found ticket for occupied table: +0ms {id: 27188, totalAmount: 65, remainingAmount: 65, entities: Array(1), orders: Array(1)}
useMesasStatus.js:99 pmpos:mesa-status ⏹️ Stopping mesa status polling +439ms
POSViewMobile.jsx:151 pmpos:pos-mobile 📱 Menu loading effect triggered +5s
POSViewMobile.jsx:157 pmpos:pos-mobile 📱 Menu already exists and is valid: +0ms {categories: Array(2)}
POSViewMobile.jsx:205 pmpos:pos-mobile 📋 Loading existing orders from ticket prop +0ms
POSViewMobile.jsx:292 pmpos:pos-mobile 🍳 Sending orders to kitchen using real GraphQL... +4s
POSViewMobile.jsx:299 pmpos:pos-mobile ℹ️ No pending orders to send to kitchen +0ms
paymentService.js:64 pmpos:payment 💳 Fetching payment types for user role: +0ms null
consoleProxy.js:28 ✅ Using valid cached access token (preloaded)
paymentService.js:66  POST http://localhost:9000/api/graphql 500 (Internal Server Error)
(anonymous) @ createHttpLink.js:127
Subscription @ module.js:190
subscribe @ module.js:264
(anonymous) @ index.js:17
Promise.then
(anonymous) @ index.js:13
Subscription @ module.js:190
subscribe @ module.js:264
complete @ Concast.js:111
push../node_modules/@apollo/client/utilities/observables/Concast.js.Concast.start @ Concast.js:152
Concast @ Concast.js:137
push../node_modules/@apollo/client/core/QueryManager.js.QueryManager.getObservableFromLink @ QueryManager.js:742
push../node_modules/@apollo/client/core/QueryManager.js.QueryManager.getResultsFromLink @ QueryManager.js:784
resultsFromLink @ QueryManager.js:1113
push../node_modules/@apollo/client/core/QueryManager.js.QueryManager.fetchQueryByPolicy @ QueryManager.js:1141
fromVariables @ QueryManager.js:855
push../node_modules/@apollo/client/core/QueryManager.js.QueryManager.fetchConcastWithInfo @ QueryManager.js:897
push../node_modules/@apollo/client/core/QueryManager.js.QueryManager.fetchQuery @ QueryManager.js:382
push../node_modules/@apollo/client/core/QueryManager.js.QueryManager.query @ QueryManager.js:479
push../node_modules/@apollo/client/core/ApolloClient.js.ApolloClient.query @ ApolloClient.js:235
getPaymentTypes @ paymentService.js:66
loadPaymentTypes @ PaymentDialog.jsx:92
(anonymous) @ PaymentDialog.jsx:69
invokePassiveEffectCreate @ react-dom.development.js:23488
callCallback @ react-dom.development.js:3946
invokeGuardedCallbackDev @ react-dom.development.js:3995
invokeGuardedCallback @ react-dom.development.js:4057
flushPassiveEffectsImpl @ react-dom.development.js:23575
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
flushPassiveEffects @ react-dom.development.js:23448
performSyncWorkOnRoot @ react-dom.development.js:22270
(anonymous) @ react-dom.development.js:11328
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
flushSyncCallbackQueueImpl @ react-dom.development.js:11323
flushSyncCallbackQueue @ react-dom.development.js:11310
discreteUpdates$1 @ react-dom.development.js:22421
discreteUpdates @ react-dom.development.js:3757
dispatchDiscreteEvent @ react-dom.development.js:5890
paymentService.js:74 pmpos:payment ⚠️ Payment types query failed (using fallback): +359ms Response not successful: Received status code 500
consoleProxy.js:28 💳 Using default payment types (SambaPOS configuration may not support custom payment types)
paymentService.js:66 Fetch failed loading: POST "http://localhost:9000/api/graphql".
(anonymous) @ createHttpLink.js:127
Subscription @ module.js:190
subscribe @ module.js:264
(anonymous) @ index.js:17
Promise.then
(anonymous) @ index.js:13
Subscription @ module.js:190
subscribe @ module.js:264
complete @ Concast.js:111
push../node_modules/@apollo/client/utilities/observables/Concast.js.Concast.start @ Concast.js:152
Concast @ Concast.js:137
push../node_modules/@apollo/client/core/QueryManager.js.QueryManager.getObservableFromLink @ QueryManager.js:742
push../node_modules/@apollo/client/core/QueryManager.js.QueryManager.getResultsFromLink @ QueryManager.js:784
resultsFromLink @ QueryManager.js:1113
push../node_modules/@apollo/client/core/QueryManager.js.QueryManager.fetchQueryByPolicy @ QueryManager.js:1141
fromVariables @ QueryManager.js:855
push../node_modules/@apollo/client/core/QueryManager.js.QueryManager.fetchConcastWithInfo @ QueryManager.js:897
push../node_modules/@apollo/client/core/QueryManager.js.QueryManager.fetchQuery @ QueryManager.js:382
push../node_modules/@apollo/client/core/QueryManager.js.QueryManager.query @ QueryManager.js:479
push../node_modules/@apollo/client/core/ApolloClient.js.ApolloClient.query @ ApolloClient.js:235
getPaymentTypes @ paymentService.js:66
loadPaymentTypes @ PaymentDialog.jsx:92
(anonymous) @ PaymentDialog.jsx:69
invokePassiveEffectCreate @ react-dom.development.js:23488
callCallback @ react-dom.development.js:3946
invokeGuardedCallbackDev @ react-dom.development.js:3995
invokeGuardedCallback @ react-dom.development.js:4057
flushPassiveEffectsImpl @ react-dom.development.js:23575
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
flushPassiveEffects @ react-dom.development.js:23448
performSyncWorkOnRoot @ react-dom.development.js:22270
(anonymous) @ react-dom.development.js:11328
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
flushSyncCallbackQueueImpl @ react-dom.development.js:11323
flushSyncCallbackQueue @ react-dom.development.js:11310
discreteUpdates$1 @ react-dom.development.js:22421
discreteUpdates @ react-dom.development.js:3757
dispatchDiscreteEvent @ react-dom.development.js:5890
TableView.jsx:331 pmpos:tables 📋 Loading entity screen items (tables)... +11s
consoleProxy.js:28 📦 Cache HIT: pmpos_cached_tables
TableView.jsx:337 pmpos:tables 📦 Using cached tables (30 tables) +1ms
useMesasStatus.js:82 pmpos:mesa-status 🔄 Starting mesa status polling every 2000ms +11s
useMesasStatus.js:82 pmpos:mesa-status 🔄 Starting mesa status polling every 2000ms +14ms
useMesasStatus.js:45 pmpos:mesa-status 🚫 Throttling rapid refresh calls +0ms
useMesasStatus.js:53 pmpos:mesa-status 🔄 Refreshing mesa status... +0ms
queries.js:1030 pmpos:queries 🌍 Getting all open tickets for mesa occupancy... +11s
queries.js:48 pmpos:queries 🔐 Ensuring authentication... +0ms
consoleProxy.js:28 ✅ Using valid cached access token (preloaded)
queries.js:1071 pmpos:queries ✅ Found 44 open tickets from all users +56ms
TableView.jsx:403 pmpos:tables 🔄 Re-processing tables with updated tickets... +184ms
TableView.jsx:331 pmpos:tables 📋 Loading entity screen items (tables)... +0ms
consoleProxy.js:28 📦 Cache HIT: pmpos_cached_tables
TableView.jsx:337 pmpos:tables 📦 Using cached tables (30 tables) +1ms
queries.js:1098 pmpos:queries 🔍 Mesa 1 ticket analysis: +14ms {ticketId: 27187, totalAmount: 65, remainingAmount: 65, ordersCount: 1}
queries.js:1127 pmpos:queries 🎯 Mesa 1 final status: CUENTA +0ms
useMesasStatus.js:60 pmpos:mesa-status ✅ Refreshed: 44 open tickets +86ms
TableView.jsx:194 pmpos:tables 🔍 Clicked table 2 with status: LIBRE +943ms
terminalService.js:176 pmpos:terminal 🖥️ Starting terminal registration for user: +28s graphiql
queries.js:117 pmpos:queries 🖥️ Starting complete terminal registration... +944ms
queries.js:48 pmpos:queries 🔐 Ensuring authentication... +0ms
consoleProxy.js:28 ✅ Using valid cached access token (preloaded)
queries.js:129 pmpos:queries 📋 Complete terminal registration: +4ms {ticketType: 'COMEDOR', terminal: 'SERVIDOR', department: 'MESAS', user: 'graphiql', endpoint: '/api/graphql'}
queries.js:143 pmpos:queries 📝 Sending terminal registration query: +0ms {query: 'mutation RegisterTerminal($ticketType: String!, $t…nal: String!, $department: String!, $user: Str...', variables: {…}}
queries.js:153 pmpos:queries 🔁 Register terminal attempt 1/3 +0ms
queries.js:155  POST http://localhost:8081/api/graphql 500 (Internal Server Error)
registerTerminalAsync @ queries.js:155
await in registerTerminalAsync
_performRegistration @ terminalService.js:202
ensureTerminalRegistered @ terminalService.js:179
handleLibreTable @ TableView.jsx:99
handleTableClick @ TableView.jsx:197
onClick @ TableView.jsx:658
callCallback @ react-dom.development.js:3946
invokeGuardedCallbackDev @ react-dom.development.js:3995
invokeGuardedCallback @ react-dom.development.js:4057
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4071
executeDispatch @ react-dom.development.js:8244
processDispatchQueueItemsInOrder @ react-dom.development.js:8276
processDispatchQueue @ react-dom.development.js:8289
dispatchEventsForPlugins @ react-dom.development.js:8300
(anonymous) @ react-dom.development.js:8509
batchedEventUpdates$1 @ react-dom.development.js:22397
batchedEventUpdates @ react-dom.development.js:3746
dispatchEventForPluginEventSystem @ react-dom.development.js:8508
attemptToDispatchEvent @ react-dom.development.js:6006
dispatchEvent @ react-dom.development.js:5925
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
discreteUpdates$1 @ react-dom.development.js:22414
discreteUpdates @ react-dom.development.js:3757
dispatchDiscreteEvent @ react-dom.development.js:5890
queries.js:164 pmpos:queries 📡 Terminal registration response: 500 Internal Server Error +251ms
consoleProxy.js:28 ❌ Terminal registration HTTP error: {status: 500, statusText: 'Internal Server Error', body: '{\r\n  "message": "An error has occurred.",\r\n  "exce…ntrollerDispatcher.<SendAsync>d__1.MoveNext()"\r\n}', variables: {…}, attempt: 1}
overrideMethod @ hook.js:608
(anonymous) @ consoleProxy.js:28
registerTerminalAsync @ queries.js:168
await in registerTerminalAsync
_performRegistration @ terminalService.js:202
ensureTerminalRegistered @ terminalService.js:179
handleLibreTable @ TableView.jsx:99
handleTableClick @ TableView.jsx:197
onClick @ TableView.jsx:658
callCallback @ react-dom.development.js:3946
invokeGuardedCallbackDev @ react-dom.development.js:3995
invokeGuardedCallback @ react-dom.development.js:4057
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4071
executeDispatch @ react-dom.development.js:8244
processDispatchQueueItemsInOrder @ react-dom.development.js:8276
processDispatchQueue @ react-dom.development.js:8289
dispatchEventsForPlugins @ react-dom.development.js:8300
(anonymous) @ react-dom.development.js:8509
batchedEventUpdates$1 @ react-dom.development.js:22397
batchedEventUpdates @ react-dom.development.js:3746
dispatchEventForPluginEventSystem @ react-dom.development.js:8508
attemptToDispatchEvent @ react-dom.development.js:6006
dispatchEvent @ react-dom.development.js:5925
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
discreteUpdates$1 @ react-dom.development.js:22414
discreteUpdates @ react-dom.development.js:3757
dispatchDiscreteEvent @ react-dom.development.js:5890
queries.js:179 pmpos:queries ⏳ Waiting 500ms before retrying registerTerminal +1ms
queries.js:155 Fetch failed loading: POST "http://localhost:8081/api/graphql".
registerTerminalAsync @ queries.js:155
await in registerTerminalAsync
_performRegistration @ terminalService.js:202
ensureTerminalRegistered @ terminalService.js:179
handleLibreTable @ TableView.jsx:99
handleTableClick @ TableView.jsx:197
onClick @ TableView.jsx:658
callCallback @ react-dom.development.js:3946
invokeGuardedCallbackDev @ react-dom.development.js:3995
invokeGuardedCallback @ react-dom.development.js:4057
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4071
executeDispatch @ react-dom.development.js:8244
processDispatchQueueItemsInOrder @ react-dom.development.js:8276
processDispatchQueue @ react-dom.development.js:8289
dispatchEventsForPlugins @ react-dom.development.js:8300
(anonymous) @ react-dom.development.js:8509
batchedEventUpdates$1 @ react-dom.development.js:22397
batchedEventUpdates @ react-dom.development.js:3746
dispatchEventForPluginEventSystem @ react-dom.development.js:8508
attemptToDispatchEvent @ react-dom.development.js:6006
dispatchEvent @ react-dom.development.js:5925
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
discreteUpdates$1 @ react-dom.development.js:22414
discreteUpdates @ react-dom.development.js:3757
dispatchDiscreteEvent @ react-dom.development.js:5890
queries.js:153 pmpos:queries 🔁 Register terminal attempt 2/3 +504ms
useMesasStatus.js:53 pmpos:mesa-status 🔄 Refreshing mesa status... +2s
queries.js:1030 pmpos:queries 🌍 Getting all open tickets for mesa occupancy... +233ms
queries.js:48 pmpos:queries 🔐 Ensuring authentication... +0ms
consoleProxy.js:28 ✅ Using valid cached access token (preloaded)
useMesasStatus.js:45 pmpos:mesa-status 🚫 Throttling rapid refresh calls +1ms
queries.js:155  POST http://localhost:8081/api/graphql 500 (Internal Server Error)
registerTerminalAsync @ queries.js:155
await in registerTerminalAsync
_performRegistration @ terminalService.js:202
ensureTerminalRegistered @ terminalService.js:179
handleLibreTable @ TableView.jsx:99
handleTableClick @ TableView.jsx:197
onClick @ TableView.jsx:658
callCallback @ react-dom.development.js:3946
invokeGuardedCallbackDev @ react-dom.development.js:3995
invokeGuardedCallback @ react-dom.development.js:4057
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4071
executeDispatch @ react-dom.development.js:8244
processDispatchQueueItemsInOrder @ react-dom.development.js:8276
processDispatchQueue @ react-dom.development.js:8289
dispatchEventsForPlugins @ react-dom.development.js:8300
(anonymous) @ react-dom.development.js:8509
batchedEventUpdates$1 @ react-dom.development.js:22397
batchedEventUpdates @ react-dom.development.js:3746
dispatchEventForPluginEventSystem @ react-dom.development.js:8508
attemptToDispatchEvent @ react-dom.development.js:6006
dispatchEvent @ react-dom.development.js:5925
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
discreteUpdates$1 @ react-dom.development.js:22414
discreteUpdates @ react-dom.development.js:3757
dispatchDiscreteEvent @ react-dom.development.js:5890
queries.js:164 pmpos:queries 📡 Terminal registration response: 500 Internal Server Error +6ms
consoleProxy.js:28 ❌ Terminal registration HTTP error: {status: 500, statusText: 'Internal Server Error', body: '{\r\n  "message": "An error has occurred.",\r\n  "exce…ntrollerDispatcher.<SendAsync>d__1.MoveNext()"\r\n}', variables: {…}, attempt: 2}
overrideMethod @ hook.js:608
(anonymous) @ consoleProxy.js:28
registerTerminalAsync @ queries.js:168
await in registerTerminalAsync
_performRegistration @ terminalService.js:202
ensureTerminalRegistered @ terminalService.js:179
handleLibreTable @ TableView.jsx:99
handleTableClick @ TableView.jsx:197
onClick @ TableView.jsx:658
callCallback @ react-dom.development.js:3946
invokeGuardedCallbackDev @ react-dom.development.js:3995
invokeGuardedCallback @ react-dom.development.js:4057
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4071
executeDispatch @ react-dom.development.js:8244
processDispatchQueueItemsInOrder @ react-dom.development.js:8276
processDispatchQueue @ react-dom.development.js:8289
dispatchEventsForPlugins @ react-dom.development.js:8300
(anonymous) @ react-dom.development.js:8509
batchedEventUpdates$1 @ react-dom.development.js:22397
batchedEventUpdates @ react-dom.development.js:3746
dispatchEventForPluginEventSystem @ react-dom.development.js:8508
attemptToDispatchEvent @ react-dom.development.js:6006
dispatchEvent @ react-dom.development.js:5925
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
discreteUpdates$1 @ react-dom.development.js:22414
discreteUpdates @ react-dom.development.js:3757
dispatchDiscreteEvent @ react-dom.development.js:5890
queries.js:179 pmpos:queries ⏳ Waiting 1000ms before retrying registerTerminal +1ms
queries.js:155 Fetch failed loading: POST "http://localhost:8081/api/graphql".
registerTerminalAsync @ queries.js:155
await in registerTerminalAsync
_performRegistration @ terminalService.js:202
ensureTerminalRegistered @ terminalService.js:179
handleLibreTable @ TableView.jsx:99
handleTableClick @ TableView.jsx:197
onClick @ TableView.jsx:658
callCallback @ react-dom.development.js:3946
invokeGuardedCallbackDev @ react-dom.development.js:3995
invokeGuardedCallback @ react-dom.development.js:4057
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4071
executeDispatch @ react-dom.development.js:8244
processDispatchQueueItemsInOrder @ react-dom.development.js:8276
processDispatchQueue @ react-dom.development.js:8289
dispatchEventsForPlugins @ react-dom.development.js:8300
(anonymous) @ react-dom.development.js:8509
batchedEventUpdates$1 @ react-dom.development.js:22397
batchedEventUpdates @ react-dom.development.js:3746
dispatchEventForPluginEventSystem @ react-dom.development.js:8508
attemptToDispatchEvent @ react-dom.development.js:6006
dispatchEvent @ react-dom.development.js:5925
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
discreteUpdates$1 @ react-dom.development.js:22414
discreteUpdates @ react-dom.development.js:3757
dispatchDiscreteEvent @ react-dom.development.js:5890
queries.js:1071 pmpos:queries ✅ Found 44 open tickets from all users +42ms
TableView.jsx:403 pmpos:tables 🔄 Re-processing tables with updated tickets... +1s
TableView.jsx:331 pmpos:tables 📋 Loading entity screen items (tables)... +0ms
consoleProxy.js:28 📦 Cache HIT: pmpos_cached_tables
TableView.jsx:337 pmpos:tables 📦 Using cached tables (30 tables) +1ms
useMesasStatus.js:60 pmpos:mesa-status ✅ Refreshed: 44 open tickets +72ms
queries.js:153 pmpos:queries 🔁 Register terminal attempt 3/3 +962ms
queries.js:155  POST http://localhost:8081/api/graphql 500 (Internal Server Error)
registerTerminalAsync @ queries.js:155
await in registerTerminalAsync
_performRegistration @ terminalService.js:202
ensureTerminalRegistered @ terminalService.js:179
handleLibreTable @ TableView.jsx:99
handleTableClick @ TableView.jsx:197
onClick @ TableView.jsx:658
callCallback @ react-dom.development.js:3946
invokeGuardedCallbackDev @ react-dom.development.js:3995
invokeGuardedCallback @ react-dom.development.js:4057
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4071
executeDispatch @ react-dom.development.js:8244
processDispatchQueueItemsInOrder @ react-dom.development.js:8276
processDispatchQueue @ react-dom.development.js:8289
dispatchEventsForPlugins @ react-dom.development.js:8300
(anonymous) @ react-dom.development.js:8509
batchedEventUpdates$1 @ react-dom.development.js:22397
batchedEventUpdates @ react-dom.development.js:3746
dispatchEventForPluginEventSystem @ react-dom.development.js:8508
attemptToDispatchEvent @ react-dom.development.js:6006
dispatchEvent @ react-dom.development.js:5925
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
discreteUpdates$1 @ react-dom.development.js:22414
discreteUpdates @ react-dom.development.js:3757
dispatchDiscreteEvent @ react-dom.development.js:5890
queries.js:164 pmpos:queries 📡 Terminal registration response: 500 Internal Server Error +262ms
consoleProxy.js:28 ❌ Terminal registration HTTP error: {status: 500, statusText: 'Internal Server Error', body: '{\r\n  "message": "An error has occurred.",\r\n  "exce…ntrollerDispatcher.<SendAsync>d__1.MoveNext()"\r\n}', variables: {…}, attempt: 3}
overrideMethod @ hook.js:608
(anonymous) @ consoleProxy.js:28
registerTerminalAsync @ queries.js:168
await in registerTerminalAsync
_performRegistration @ terminalService.js:202
ensureTerminalRegistered @ terminalService.js:179
handleLibreTable @ TableView.jsx:99
handleTableClick @ TableView.jsx:197
onClick @ TableView.jsx:658
callCallback @ react-dom.development.js:3946
invokeGuardedCallbackDev @ react-dom.development.js:3995
invokeGuardedCallback @ react-dom.development.js:4057
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4071
executeDispatch @ react-dom.development.js:8244
processDispatchQueueItemsInOrder @ react-dom.development.js:8276
processDispatchQueue @ react-dom.development.js:8289
dispatchEventsForPlugins @ react-dom.development.js:8300
(anonymous) @ react-dom.development.js:8509
batchedEventUpdates$1 @ react-dom.development.js:22397
batchedEventUpdates @ react-dom.development.js:3746
dispatchEventForPluginEventSystem @ react-dom.development.js:8508
attemptToDispatchEvent @ react-dom.development.js:6006
dispatchEvent @ react-dom.development.js:5925
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
discreteUpdates$1 @ react-dom.development.js:22414
discreteUpdates @ react-dom.development.js:3757
dispatchDiscreteEvent @ react-dom.development.js:5890
consoleProxy.js:28 ❌ Exception during registerTerminal attempt {err: 'Terminal registration failed: HTTP 500 - {\r\n  "mes…ntrollerDispatcher.<SendAsync>d__1.MoveNext()"\r\n}', attempt: 3}
overrideMethod @ hook.js:608
(anonymous) @ consoleProxy.js:28
registerTerminalAsync @ queries.js:190
await in registerTerminalAsync
_performRegistration @ terminalService.js:202
ensureTerminalRegistered @ terminalService.js:179
handleLibreTable @ TableView.jsx:99
handleTableClick @ TableView.jsx:197
onClick @ TableView.jsx:658
callCallback @ react-dom.development.js:3946
invokeGuardedCallbackDev @ react-dom.development.js:3995
invokeGuardedCallback @ react-dom.development.js:4057
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4071
executeDispatch @ react-dom.development.js:8244
processDispatchQueueItemsInOrder @ react-dom.development.js:8276
processDispatchQueue @ react-dom.development.js:8289
dispatchEventsForPlugins @ react-dom.development.js:8300
(anonymous) @ react-dom.development.js:8509
batchedEventUpdates$1 @ react-dom.development.js:22397
batchedEventUpdates @ react-dom.development.js:3746
dispatchEventForPluginEventSystem @ react-dom.development.js:8508
attemptToDispatchEvent @ react-dom.development.js:6006
dispatchEvent @ react-dom.development.js:5925
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
discreteUpdates$1 @ react-dom.development.js:22414
discreteUpdates @ react-dom.development.js:3757
dispatchDiscreteEvent @ react-dom.development.js:5890
consoleProxy.js:28 ⚠️ Non-blocking: continuing without terminalId: Terminal registration failed: HTTP 500 - {
  "message": "An error has occurred.",
  "exceptionMessage": "Object reference not set to an instance of an object.",
  "exceptionType": "System.NullReferenceException",
  "stackTrace": "   at Samba.Services.Implementations.LogService.LogError(Exception e, String userMessage) in C:\\Users\\Vehbi\\Documents\\Source\\Repos\\sambapos-v5-pro\\Samba.Services\\Implementations\\LogService.cs:line 24\r\n   at Samba.MessagingServer.WindowsService.Controllers.GraphqlController.<Post>d__6.MoveNext()\r\n--- End of stack trace from previous location where exception was thrown ---\r\n   at System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()\r\n   at System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task task)\r\n   at System.Threading.Tasks.TaskHelpersExtensions.<CastToObject>d__3`1.MoveNext()\r\n--- End of stack trace from previous location where exception was thrown ---\r\n   at System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()\r\n   at System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task task)\r\n   at System.Web.Http.Controllers.ApiControllerActionInvoker.<InvokeActionAsyncCore>d__0.MoveNext()\r\n--- End of stack trace from previous location where exception was thrown ---\r\n   at System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()\r\n   at System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task task)\r\n   at System.Web.Http.Controllers.ActionFilterResult.<ExecuteAsync>d__2.MoveNext()\r\n--- End of stack trace from previous location where exception was thrown ---\r\n   at System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()\r\n   at System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task task)\r\n   at System.Web.Http.Filters.AuthorizationFilterAttribute.<ExecuteAuthorizationFilterAsyncCore>d__2.MoveNext()\r\n--- End of stack trace from previous location where exception was thrown ---\r\n   at System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()\r\n   at System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task task)\r\n   at System.Web.Http.Dispatcher.HttpControllerDispatcher.<SendAsync>d__1.MoveNext()"
}
overrideMethod @ hook.js:608
(anonymous) @ consoleProxy.js:28
_performRegistration @ terminalService.js:204
await in _performRegistration
ensureTerminalRegistered @ terminalService.js:179
handleLibreTable @ TableView.jsx:99
handleTableClick @ TableView.jsx:197
onClick @ TableView.jsx:658
callCallback @ react-dom.development.js:3946
invokeGuardedCallbackDev @ react-dom.development.js:3995
invokeGuardedCallback @ react-dom.development.js:4057
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4071
executeDispatch @ react-dom.development.js:8244
processDispatchQueueItemsInOrder @ react-dom.development.js:8276
processDispatchQueue @ react-dom.development.js:8289
dispatchEventsForPlugins @ react-dom.development.js:8300
(anonymous) @ react-dom.development.js:8509
batchedEventUpdates$1 @ react-dom.development.js:22397
batchedEventUpdates @ react-dom.development.js:3746
dispatchEventForPluginEventSystem @ react-dom.development.js:8508
attemptToDispatchEvent @ react-dom.development.js:6006
dispatchEvent @ react-dom.development.js:5925
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
discreteUpdates$1 @ react-dom.development.js:22414
discreteUpdates @ react-dom.development.js:3757
dispatchDiscreteEvent @ react-dom.development.js:5890
queries.js:155 Fetch failed loading: POST "http://localhost:8081/api/graphql".
registerTerminalAsync @ queries.js:155
await in registerTerminalAsync
_performRegistration @ terminalService.js:202
ensureTerminalRegistered @ terminalService.js:179
handleLibreTable @ TableView.jsx:99
handleTableClick @ TableView.jsx:197
onClick @ TableView.jsx:658
callCallback @ react-dom.development.js:3946
invokeGuardedCallbackDev @ react-dom.development.js:3995
invokeGuardedCallback @ react-dom.development.js:4057
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4071
executeDispatch @ react-dom.development.js:8244
processDispatchQueueItemsInOrder @ react-dom.development.js:8276
processDispatchQueue @ react-dom.development.js:8289
dispatchEventsForPlugins @ react-dom.development.js:8300
(anonymous) @ react-dom.development.js:8509
batchedEventUpdates$1 @ react-dom.development.js:22397
batchedEventUpdates @ react-dom.development.js:3746
dispatchEventForPluginEventSystem @ react-dom.development.js:8508
attemptToDispatchEvent @ react-dom.development.js:6006
dispatchEvent @ react-dom.development.js:5925
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
discreteUpdates$1 @ react-dom.development.js:22414
discreteUpdates @ react-dom.development.js:3757
dispatchDiscreteEvent @ react-dom.development.js:5890
consoleProxy.js:28 🚫 No terminal ID for current user after registration attempt, cannot create ticket
overrideMethod @ hook.js:608
(anonymous) @ consoleProxy.js:28
handleLibreTable @ TableView.jsx:108
await in handleLibreTable
handleTableClick @ TableView.jsx:197
onClick @ TableView.jsx:658
callCallback @ react-dom.development.js:3946
invokeGuardedCallbackDev @ react-dom.development.js:3995
invokeGuardedCallback @ react-dom.development.js:4057
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4071
executeDispatch @ react-dom.development.js:8244
processDispatchQueueItemsInOrder @ react-dom.development.js:8276
processDispatchQueue @ react-dom.development.js:8289
dispatchEventsForPlugins @ react-dom.development.js:8300
(anonymous) @ react-dom.development.js:8509
batchedEventUpdates$1 @ react-dom.development.js:22397
batchedEventUpdates @ react-dom.development.js:3746
dispatchEventForPluginEventSystem @ react-dom.development.js:8508
attemptToDispatchEvent @ react-dom.development.js:6006
dispatchEvent @ react-dom.development.js:5925
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
discreteUpdates$1 @ react-dom.development.js:22414
discreteUpdates @ react-dom.development.js:3757
dispatchDiscreteEvent @ react-dom.development.js:5890
consoleProxy.js:20 Fetch failed loading: GET "http://localhost:8081/__log?level=error&msg=%E2%9D%8C%20Exception%20during%20registerTerminal%20attempt%20%7B%22err%22%3A%22Terminal%20registration%20failed%3A%20HTTP%20500%20-%20%7B%5Cr%5Cn%20%20%5C%22message%5C%22%3A%20%5C%22An%20error%20has%20occurred.%5C%22%2C%5Cr%5Cn%20%20%5C%22exceptionMessage%5C%22%3A%20%5C%22Object%20reference%20not%20set%20to%20an%20instance%20of%20an%20object.%5C%22%2C%5Cr%5Cn%20%20%5C%22exceptionType%5C%22%3A%20%5C%22System.NullReferenceException%5C%22%2C%5Cr%5Cn%20%20%5C%22stackTrace%5C%22%3A%20%5C%22%20%20%20at%20Samba.Services.Implementations.LogService.LogError(Exception%20e%2C%20String%20userMessage)%20in%20C%3A%5C%5C%5C%5CUsers%5C%5C%5C%5CVehbi%5C%5C%5C%5CDocuments%5C%5C%5C%5CSource%5C%5C%5C%5CRepos%5C%5C%5C%5Csambapos-v5-pro%5C%5C%5C%5CSamba.Services%5C%5C%5C%5CImplementations%5C%5C%5C%5CLogService.cs%3Aline%2024%5C%5Cr%5C%5Cn%20%20%20at%20Samba.MessagingServer.WindowsService.Controllers.GraphqlController.%3CPost%3Ed__6.MoveNext()%5C%5Cr%5C%5Cn---%20End%20of%20stack%20trace%20from%20previous%20location%20where%20exception%20was%20thrown%20---%5C%5Cr%5C%5Cn%20%20%20at%20System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()%5C%5Cr%5C%5Cn%20%20%20at%20System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task%20task)%5C%5Cr%5C%5Cn%20%20%20at%20System.Threading.Tasks.TaskHelpersExtensions.%3CCastToObject%3Ed__3%601.MoveNext()%5C%5Cr%5C%5Cn---%20End%20of%20stack%20trace%20from%20previous%20location%20where%20exception%20was%20thrown%20---%5C%5Cr%5C%5Cn%20%20%20at%20System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()%5C%5Cr%5C%5Cn%20%20%20at%20System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task%20task)%5C%5Cr%5C%5Cn%20%20%20at%20System.Web.Http.Controllers.ApiControllerActionInvoker.%3CInvokeActionAsyncCore%3Ed__0.MoveNext()%5C%5Cr%5C%5Cn---%20End%20of%20stack%20trace%20from%20previous%20location%20where%20exception%20was%20thrown%20---%5C%5Cr%5C%5Cn%20%20%20at%20System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()%5C%5Cr%5C%5Cn%20%20%20at%20System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task%20task)%5C%5Cr%5C%5Cn%20%20%20at%20System.Web.Http.Controllers.ActionFilterResult.%3CExecuteAsync%3Ed__2.MoveNext()%5C%5Cr%5C%5Cn---%20End%20of%20stack%20trace%20from%20previous%20location%20where%20exception%20was%20thrown%20---%5C%5Cr%5C%5Cn%20%20%20at%20System.Runtime.ExceptionServices.ExceptionDispatchInfo.Throw()%5C%5Cr%5C%5Cn%20%20%20at%20System.Runtime.CompilerServices.TaskAwaiter.HandleNonSuccessAndDebuggerNotification(Task%20task)%5C%5Cr%5C%5Cn%20%20%20at%20System.Web.Http.Filters.".
send @ consoleProxy.js:20
(anonymous) @ consoleProxy.js:27
registerTerminalAsync @ queries.js:190
await in registerTerminalAsync
_performRegistration @ terminalService.js:202
ensureTerminalRegistered @ terminalService.js:179
handleLibreTable @ TableView.jsx:99
handleTableClick @ TableView.jsx:197
onClick @ TableView.jsx:658
callCallback @ react-dom.development.js:3946
invokeGuardedCallbackDev @ react-dom.development.js:3995
invokeGuardedCallback @ react-dom.development.js:4057
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4071
executeDispatch @ react-dom.development.js:8244
processDispatchQueueItemsInOrder @ react-dom.development.js:8276
processDispatchQueue @ react-dom.development.js:8289
dispatchEventsForPlugins @ react-dom.development.js:8300
(anonymous) @ react-dom.development.js:8509
batchedEventUpdates$1 @ react-dom.development.js:22397
batchedEventUpdates @ react-dom.development.js:3746
dispatchEventForPluginEventSystem @ react-dom.development.js:8508
attemptToDispatchEvent @ react-dom.development.js:6006
dispatchEvent @ react-dom.development.js:5925
unstable_runWithPriority @ scheduler.development.js:468
runWithPriority$1 @ react-dom.development.js:11277
discreteUpdates$1 @ react-dom.development.js:22414
discreteUpdates @ react-dom.development.js:3757
dispatchDiscreteEvent @ react-dom.development.js:5890
useMesasStatus.js:53 pmpos:mesa-status 🔄 Refreshing mesa status... +2s
queries.js:1030 pmpos:queries 🌍 Getting all open tickets for mesa occupancy... +722ms
queries.js:48 pmpos:queries 🔐 Ensuring authentication... +0ms
consoleProxy.js:28 ✅ Using valid cached access token (preloaded)
useMesasStatus.js:45 pmpos:mesa-status 🚫 Throttling rapid refresh calls +1ms
queries.js:1071 pmpos:queries ✅ Found 44 open tickets from all users +27ms
TableView.jsx:403 pmpos:tables 🔄 Re-processing tables with updated tickets... +2s
TableView.jsx:331 pmpos:tables 📋 Loading entity screen items (tables)... +1ms
consoleProxy.js:28 📦 Cache HIT: pmpos_cached_tables
TableView.jsx:337 pmpos:tables 📦 Using cached tables (30 tables) +0ms
useMesasStatus.js:60 pmpos:mesa-status ✅ Refreshed: 44 open tickets +55ms
