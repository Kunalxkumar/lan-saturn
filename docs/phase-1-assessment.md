# LAN Saturn Phase 1 Assessment

Date: 2026-08-14

## Scope

This assessment covers the repository state in `W:\Project\lan-saturn-main` as of 2026-08-14 and is the baseline for the security and production-hardening work requested for LAN Saturn.

The current implementation is a prototype, not a production-ready secure LAN collaboration product.

## Concise Assessment

LAN Saturn currently provides a functional prototype for local chat, tasks, polls, notes, shared-folder browsing, and basic desktop packaging, but the implementation is not safe to deploy on a shared LAN. The backend trusts client-supplied identity and ownership fields, administrative Socket.IO events are exposed without authentication or authorization, HTTP file and shared-folder endpoints are unauthenticated, and the desktop wrapper disables CSP while loading the app from `http://127.0.0.1:5000`.

The frontend and README claim stronger security properties than the code actually implements. The repository does not currently provide:

- authenticated device identity
- host-controlled enrollment
- session-bound authorization
- verified end-to-end signatures
- TLS transport
- secure key storage
- production packaging and installer flow
- release signing
- migration-based persistence
- reliable protocol contracts across backend and frontend

## Inventory

### HTTP routes

| Route | Method | Current purpose | Current auth | Required target |
|---|---|---|---|---|
| `/` | `GET` | Render shell page | none | local desktop shell or authenticated app bootstrap |
| `/static/<path:filename>` | `GET` | Serve built assets | none | desktop-packaged assets only; static hosting only |
| `/health` | `GET` | Process liveness | none | local-only or authenticated diagnostics |
| `/lan-info` | `GET` | Exposed IPs and port | none | authenticated host diagnostics or local-only |
| `/api/discover` | `GET` | Discovery list | none | authenticated/local role-specific behavior |
| `/upload` | `POST` | Store uploaded file | none | authenticated, authorized, rate-limited upload session |
| `/files/<filename>` | `GET` | Download uploaded file | none | scoped, expiring capability or authenticated authorized request |
| `/api/transfer-history` | `GET` | Return transfer history | none | authenticated and authorized |
| `/api/zip-preview/<filename>` | `GET` | Inspect uploaded ZIP | none | authenticated and authorized |
| `/api/shared-directory/config` | `POST` | Set shared root | none | host-local privileged operation only, not remotely callable |
| `/api/shared-directory/config` | `GET` | Read shared root | none | host admin only |
| `/api/shared-directory/files` | `GET` | List shared files | none | authenticated, authorized, root-scoped |
| `/api/shared-directory/download` | `GET` | Download shared file | none | authenticated, authorized, scoped, expiring |

### Socket.IO events

| Event | Direction | Current purpose | Current auth | Current risk |
|---|---|---|---|---|
| `connect` | client -> server | implicit connect | none | unauthenticated device state created |
| `disconnect` | client -> server | cleanup | none | tied to spoofable user state |
| `join_channel` | client -> server | join room and fetch history | none | client chooses username, channel, invite, password |
| `send_message` | client -> server | send message | weak device trust only | client chooses sender identity and channel |
| `typing_start` | client -> server | typing indicator | none | spoofable identity |
| `typing_stop` | client -> server | typing indicator stop | none | spoofable identity |
| `file_share` | client -> server | broadcast uploaded file message | weak device trust only | forged sender/channel metadata |
| `add_reaction` | client -> server | react to message | none | forged username and message ownership effects |
| `private_message` | client -> server | DM send | weak device trust only | broken sender/recipient contract and spoofable identity |
| `announce_share` | client -> server | advertise shared folder | none | spoofed filesystem-share presence |
| `get_shares` | client -> server | read share list | none | info leakage |
| `clear_chat_history` | client -> server | delete all chat history | none | any client can destroy global history |
| `broadcast_announcement` | client -> server | create announcement | none | any client can broadcast as anyone |
| `get_announcements` | client -> server | read announcements | none | no membership enforcement |
| `create_event` | client -> server | create calendar event | none | forged creator/channel |
| `delete_event` | client -> server | delete calendar event | none | no ownership/role checks |
| `get_events` | client -> server | read calendar | none | no channel auth |
| `clipboard_sync` | client -> server | sync clipboard | none | spoofing, privacy leakage, no opt-in server control |
| `get_clipboard_history` | client -> server | read clipboard history | none | privacy leakage |
| `get_notes` | client -> server | list notes | none | no channel auth |
| `get_note_content` | client -> server | get note content | none | no channel auth |
| `save_note` | client -> server | write note | none | spoofable author, no limits |
| `create_note` | client -> server | create note | none | no auth or ownership model |
| `delete_note` | client -> server | delete note | none | no auth or ownership model |
| `create_task` | client -> server | create task | none | spoofable creator |
| `toggle_task` | client -> server | toggle task | none | no ownership or role checks |
| `delete_task` | client -> server | delete task | none | no ownership or role checks |
| `get_tasks` | client -> server | read tasks | none | no channel auth |
| `set_channel_lock` | client -> server | set/remove channel password | none | any client can lock/unlock channels |
| `generate_invite` | client -> server | create invite code | none | any client can create invites |
| `get_device_list` | client -> server | enumerate devices | none | info leakage to all members |
| `update_device_trust` | client -> server | trust/untrust device | none | any client can approve itself or others |
| `create_poll` | client -> server | create poll | none | spoofable creator |
| `vote_poll` | client -> server | vote | none | spoofable voter identity |
| `close_poll` | client -> server | close poll | none | ownership based on submitted username |
| `get_polls` | client -> server | read polls | none | no channel auth |

### Storage surface

- SQLite database in project root: `lan_saturn.db`
- uploaded files in project root: `uploads/`
- notes in project root: `notes/`
- no migrations framework
- no encrypted workspace data
- no audit log
- no session store
- no device key store
- no backup subsystem

### Desktop/build surface

- Tauri config points `frontendDist` and `devUrl` at `http://127.0.0.1:5000`
- CSP is explicitly disabled with `"csp": null`
- Tauri plugins include `tauri-plugin-shell`
- Rust bundle declares external backend binary but the repository does not yet define a production lifecycle around it
- no installer definitions for signed MSI/NSIS release flow
- no update manifest or signing flow

### Dependency and stack observations

Backend:

- `flask>=2.3.0`
- `flask-socketio>=5.3.0`
- `eventlet>=0.33.0`
- `pydantic>=2.0.0`

Frontend:

- React 18
- TypeScript 7
- Socket.IO client
- libsodium wrappers
- Zustand

Desktop:

- Tauri 2
- `tauri-plugin-shell`
- `tauri-plugin-log`

High-risk stack concerns:

- `eventlet` is not the production direction we want for a modern secure deployment
- backend dependencies are not pinned reproducibly
- no Python lock file
- no frontend lint/type/test pipeline committed for PR/release hardening

## Architecture Gap Report

### Current architecture

The repository currently has:

- Flask routes and Socket.IO handlers directly coordinating trust-sensitive operations
- light repository wrappers over SQLite
- minimal schema validation
- no explicit authentication layer
- no explicit authorization/policy layer
- no audit or rate-limit middleware
- frontend state and transport logic coupled to implicit trust assumptions

### Required target architecture

The production target should separate:

1. Transport layer
   - versioned HTTP API under `/api/v1`
   - versioned Socket.IO event envelope
   - typed request/response schema validation

2. Authentication layer
   - device key registration
   - challenge/response verification
   - short-lived sessions
   - session-bound socket attachment

3. Authorization layer
   - centralized policy checks
   - permissions and channel membership enforcement
   - admin-only host controls

4. Application services
   - channels
   - messages
   - direct messages
   - files/transfers
   - notes
   - tasks
   - polls
   - announcements
   - calendar
   - enrollment/devices

5. Persistence and crypto adapters
   - migrations
   - repositories
   - encrypted workspace storage
   - key management adapter
   - TLS certificate lifecycle

6. Desktop host integration
   - local privileged folder-picker workflow
   - local-only host administration bridge
   - bundled backend lifecycle
   - update/install/recovery flow

## Route and Event Authorization Matrix

This matrix is the Phase 2 implementation contract.

### HTTP matrix

| Surface | Authentication | Authorization | Validation | Rate limit | Notes |
|---|---|---|---|---|---|
| `/health` | local or service token | diagnostics.read | none | low | avoid broad LAN exposure |
| `/lan-info` | host admin session | workspace.admin | none | low | current unrestricted LAN exposure is not acceptable |
| `/api/discover` | authenticated client session | workspace.read | none | medium | may also be local-desktop-only in bundled mode |
| `/upload` | required | `files.upload` + channel membership | file size, mime, quota, envelope schema | strict | upload ID/capability should replace open endpoint |
| `/files/<token>` replacement | required or capability | `files.download` | signed token, expiry, scope | strict | replace permanent file URL |
| `/api/transfer-history` | required | `files.read_history` or workspace admin | query bounds | medium | separate own vs admin history views |
| `/api/zip-preview/<token>` | required or capability | `files.download` | archive limits | strict | never leak internal errors |
| shared-folder config | local host only | `shared_folders.configure` | local-path validation | local only | remove remote HTTP control |
| shared-folder list/download | required | `shared_folders.read` + root/channel scope | bounded path token | strict | never expose absolute paths |

### Socket.IO matrix

| Event | Authentication | Authorization | Validation | Rate limit |
|---|---|---|---|---|
| `join_channel` replacement | required session | `channels.read` + membership | strict envelope | medium |
| `send_message` | required session | `messages.send` + membership | strict envelope, size, schema | strict |
| `private_message` | required session | `messages.send_dm` | strict envelope, recipient validation | strict |
| `file_share` | required session | `files.upload` + membership | capability reference only | strict |
| `add_reaction` | required session | `messages.react` + membership | bounded schema | medium |
| `broadcast_announcement` | required session | `announcements.manage` | bounded schema | medium |
| `create_event` | required session | `calendar.write` + membership | bounded schema | medium |
| `delete_event` | required session | owner or `calendar.moderate` | id schema | medium |
| `clipboard_sync` | required session | `clipboard.write` + opt-in | size/type bounds | strict |
| `get_clipboard_history` | required session | `clipboard.read` | pagination | medium |
| `get_notes` | required session | `notes.read` + membership | pagination | medium |
| `get_note_content` | required session | `notes.read` + membership | id schema | medium |
| `save_note` | required session | `notes.write` + membership | size/version bounds | strict |
| `create_note` | required session | `notes.write` + membership | name/schema bounds | medium |
| `delete_note` | required session | owner or `notes.moderate` | id schema | medium |
| `create_task` | required session | `tasks.write` + membership | bounded schema | medium |
| `toggle_task` | required session | `tasks.write` + membership | id schema | medium |
| `delete_task` | required session | owner or `tasks.moderate` | id schema | medium |
| `get_tasks` | required session | `tasks.read` + membership | pagination | medium |
| `set_channel_lock` | required session | `channels.manage` | bounded schema | strict |
| `generate_invite` | required session | `devices.manage` | invite policy | strict |
| `get_device_list` | required session | `devices.manage` | none | low |
| `update_device_trust` replacement | required session | `devices.manage` | bounded admin schema | strict |
| `create_poll` | required session | `polls.write` + membership | bounded schema | medium |
| `vote_poll` | required session | `polls.vote` + membership | bounded schema | medium |
| `close_poll` | required session | owner or `polls.moderate` | id schema | medium |
| `get_polls` | required session | `polls.read` + membership | pagination | medium |
| `clear_chat_history` replacement | required session | `messages.delete.any` or admin retention action | explicit confirmation workflow | strict |

## Priority Findings

1. No authenticated session model exists.
2. Administrative capabilities are remotely callable by ordinary clients.
3. Host filesystem sharing is remotely configurable.
4. Channel access checks are partial and room-based instead of policy-based.
5. User identity is client-supplied throughout the system.
6. README security claims are materially inaccurate.
7. Desktop security posture is unsafe: no CSP and remote frontend URL in production config.
8. File delivery uses predictable long-lived URLs with no scoped authorization.
9. Persistence is rooted in the repo directory instead of platform application data.
10. Build/release automation and signing are absent.

## Proposed Remediation Sequence

### Phase 2

- implement persistent device identity and enrollment
- introduce authenticated session issuance and session-bound sockets
- create centralized authorization middleware/policies
- remove remote shared-directory configuration
- lock down CORS and Tauri CSP
- add security regression tests for device approval, admin calls, and shared-root configuration

### Phase 3

- define typed protocol contracts shared across Python and TypeScript
- add migrations and workspace metadata tables
- implement event IDs, sequencing, replay protection, and signed envelopes
- fix DM contract and file-transfer capability flow

### Phase 4

- refactor each feature to use authenticated identity and permission checks
- add pagination, acknowledgements, quotas, and retention
- tighten storage and error-handling behavior

### Phase 5+

- harden Tauri host lifecycle and local admin flows
- bundle backend runtime correctly
- produce installer/update/signing pipeline

## Files Most Likely to Change in Phase 2

- `app/__init__.py`
- `app/config.py`
- `app/routes/*.py`
- `app/sockets/*.py`
- `app/repositories/*.py`
- `app/models/*`
- `src/hooks/*`
- `src/store/*`
- `src/App.tsx`
- `src-tauri/tauri.conf.json`
- new auth/policy/crypto/service modules
- new migrations and tests

