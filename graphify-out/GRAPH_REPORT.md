# Graph Report - .  (2026-07-16)

## Corpus Check
- 32 files · ~175,449 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 174 nodes · 199 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.89)
- Token cost: 140,680 input · 3,363 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Webpack Vendor Modules|Webpack Vendor Modules]]
- [[_COMMUNITY_Client Runtime & React|Client Runtime & React]]
- [[_COMMUNITY_React Components & Flask App|React Components & Flask App]]
- [[_COMMUNITY_Tauri Configuration|Tauri Configuration]]
- [[_COMMUNITY_Flask Backend & Websockets|Flask Backend & Websockets]]
- [[_COMMUNITY_NPM Package Deps|NPM Package Deps]]
- [[_COMMUNITY_NPM Dev Dependencies|NPM Dev Dependencies]]
- [[_COMMUNITY_Application Icons|Application Icons]]
- [[_COMMUNITY_Tauri Capabilities|Tauri Capabilities]]
- [[_COMMUNITY_Core Entrypoints|Core Entrypoints]]
- [[_COMMUNITY_Package Config File|Package Config File]]

## God Nodes (most connected - your core abstractions)
1. `__webpack_require__()` - 34 edges
2. `build` - 5 edges
3. `bundle` - 5 edges
4. `update_user_list()` - 4 edges
5. `scripts` - 4 edges
6. `app` - 3 edges
7. `lan_info()` - 2 edges
8. `handle_connect()` - 2 edges
9. `handle_disconnect()` - 2 edges
10. `handle_join_channel()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Tauri Desktop Config` --references--> `Flask Application Server`  [EXTRACTED]
  src-tauri/tauri.conf.json → app.py
- `E2EE Crypto Module` --references--> `libsodium-wrappers-sumo`  [EXTRACTED]
  src/App.js → package.json
- `main` --calls--> `run`  [EXTRACTED]
  src-tauri/src/main.rs → src-tauri/src/lib.rs

## Import Cycles
- None detected.

## Communities (16 total, 2 thin omitted)

### Community 0 - "Webpack Vendor Modules"
Cohesion: 0.07
Nodes (5): "./node_modules/engine.io-client/build/esm/transports/polling-fetch.js"(), "./node_modules/engine.io-client/build/esm/transports/websocket.js"(), "./node_modules/engine.io-parser/build/esm/index.js"(), "./node_modules/scheduler/index.js"(), "./src/App.js"()

### Community 1 - "Client Runtime & React"
Cohesion: 0.07
Nodes (29): "./node_modules/css-loader/dist/cjs.js!./src/styles.css"(), "./node_modules/debug/src/browser.js"(), "./node_modules/engine.io-client/build/esm/index.js"(), "./node_modules/engine.io-client/build/esm/socket.js"(), "./node_modules/engine.io-client/build/esm/transport.js"(), "./node_modules/engine.io-client/build/esm/transports/index.js"(), "./node_modules/engine.io-client/build/esm/transports/polling.js"(), "./node_modules/engine.io-client/build/esm/transports/polling-xhr.js"() (+21 more)

### Community 2 - "React Components & Flask App"
Cohesion: 0.08
Nodes (14): handle_message(), handle_private_message(), Flask Application Server, SocketIO Server Instance, libsodium-wrappers-sumo, e2ee, servers, E2EE Crypto Module (+6 more)

### Community 3 - "Tauri Configuration"
Cohesion: 0.10
Nodes (19): debugApplicationIdSuffix, app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl (+11 more)

### Community 4 - "Flask Backend & Websockets"
Cohesion: 0.15
Nodes (6): get_lan_urls(), handle_connect(), handle_disconnect(), handle_join_channel(), lan_info(), update_user_list()

### Community 5 - "NPM Package Deps"
Cohesion: 0.13
Nodes (14): dependencies, libsodium-wrappers-sumo, qrcode.react, react, react-dom, socket.io-client, description, main (+6 more)

### Community 6 - "NPM Dev Dependencies"
Cohesion: 0.20
Nodes (10): devDependencies, @babel/core, babel-loader, @babel/preset-env, @babel/preset-react, css-loader, style-loader, @tauri-apps/cli (+2 more)

### Community 8 - "Tauri Capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 9 - "Core Entrypoints"
Cohesion: 0.40
Nodes (4): App, e2ee, run, main

## Knowledge Gaps
- **52 isolated node(s):** `name`, `version`, `description`, `main`, `build` (+47 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `__webpack_require__()` connect `Client Runtime & React` to `Webpack Vendor Modules`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `handle_message()` connect `React Components & Flask App` to `Flask Backend & Websockets`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `handle_private_message()` connect `React Components & Flask App` to `Flask Backend & Websockets`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `LAN Saturn Application Icons` (e.g. with `Square150x150Logo.png` and `Square284x284Logo.png`) actually correct?**
  _`LAN Saturn Application Icons` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _52 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Webpack Vendor Modules` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Client Runtime & React` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._