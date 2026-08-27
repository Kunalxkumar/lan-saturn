# LAN Saturn Threat Model

Date: 2026-08-14

## Product boundary

LAN Saturn is intended to support collaboration on a trusted local network, Wi-Fi network, or mobile hotspot, with no dependency on cloud infrastructure for core collaboration. The product boundary includes:

- host desktop application
- client desktop/browser UI
- backend API and Socket.IO server
- local workspace database
- uploaded files and shared-folder content
- device enrollment and session state

LAN Saturn must not claim protection against a malicious or fully compromised endpoint.

## Assets to protect

- workspace membership and role assignments
- device identities and trust decisions
- session secrets and authentication state
- message content
- DM content
- file content
- shared-folder contents
- transfer history
- notes/tasks/polls/calendar state
- audit records
- workspace encryption material
- host filesystem boundaries

## Trust boundaries

1. Unauthenticated LAN device -> host network service
2. Enrolled member -> privileged/admin operations
3. Client UI -> backend transport
4. Backend process -> host filesystem
5. Desktop shell -> bundled backend process
6. Stored data at rest -> local attacker with filesystem access

## Threat actors

### Untrusted device on the same LAN

Capabilities:

- connect to exposed TCP/UDP ports
- replay or forge unauthenticated requests
- enumerate services
- attempt path traversal and brute force

Out of scope:

- physical control of host machine

### Malicious enrolled member

Capabilities:

- valid session and channel membership
- can send crafted protocol payloads
- can attempt privilege escalation and unauthorized reads

Out of scope:

- compromise of another member’s endpoint private key without endpoint compromise

### Passive network observer

Capabilities:

- capture HTTP/WebSocket traffic on the LAN
- capture discovery traffic

Desired protections:

- TLS for transport
- documented metadata exposure
- optional E2EE for protected content

### Local attacker with filesystem access

Capabilities:

- read unprotected config/data if stored insecurely
- tamper with database or uploads

Desired protections:

- encrypted workspace data where feasible
- integrity checks
- protected secret storage

## Key threats and required mitigations

### 1. Self-approval or unauthorized device approval

Current risk:

- any connected client can call `update_device_trust`

Mitigations:

- host-controlled enrollment only
- admin-authenticated device-management API
- audit log for approvals/revocations
- security regression tests

### 2. Username impersonation

Current risk:

- usernames are supplied by the client on most events

Mitigations:

- derive sender identity from authenticated session
- bind sessions to device identity and workspace membership
- ignore client-provided identity for authorization

### 3. Stolen or replayed invitation

Current risk:

- current invite codes are short, server-generated, and not tied to device enrollment state

Mitigations:

- high-entropy, single-use, expiring invitations
- optional QR enrollment bound to host fingerprint
- replay detection and redemption transactionality

### 4. Network packet capture

Current risk:

- current transport is HTTP/WebSocket without TLS

Mitigations:

- TLS for all transport
- certificate fingerprint verification during enrollment
- document metadata not hidden by transport encryption

### 5. Message modification and replay

Current risk:

- no verified end-to-end signatures or replay protection on envelopes

Mitigations:

- versioned signed envelopes
- event IDs and replay cache
- associated data binding for channel/message/workspace/device
- strict reject-on-failure behavior

### 6. Unauthorized shared-folder access

Current risk:

- remote clients can set host share root and browse/download without auth

Mitigations:

- remove remote root configuration
- host-local folder selection only
- scoped root IDs instead of raw paths
- pre-open authorization recheck
- traversal/symlink/hardlink defenses

### 7. Malicious uploads

Current risk:

- open upload route, predictable URLs, limited policy checks

Mitigations:

- authenticated upload session
- quotas, type/size limits, rate limits
- non-executable storage location
- expiring download capabilities
- safe content-disposition and `nosniff`

### 8. Resource exhaustion

Current risk:

- no rate limiting, weak bounds, and unbounded reads/writes in several paths

Mitigations:

- per-device and per-IP rate limits
- payload bounds
- storage quotas
- bounded queues
- cleanup for incomplete uploads

### 9. Compromised client-side stored data

Current risk:

- secret-like values are stored in browser storage and frontend memory without protected storage design

Mitigations:

- OS keychain for desktop private keys and session material
- WebCrypto non-exportable browser keys where possible
- no plaintext secret storage in `localStorage`

### 10. Loss of host machine

Current risk:

- workspace data, uploads, and notes are stored in repo-relative directories without a hardened backup/recovery model

Mitigations:

- platform data directories
- encrypted verified backups
- recovery documentation
- revocation workflow after host compromise

### 11. Database tampering

Current risk:

- SQLite database has no integrity metadata, audit protection, or migration governance

Mitigations:

- migration framework
- audit records
- integrity/version metadata
- optional encrypted-at-rest workspace storage

## Security properties LAN Saturn should eventually claim

LAN Saturn may claim the following only after implementation and tests prove them:

- authenticated device identity
- host-controlled enrollment and revocation
- session-bound authorization
- TLS-protected transport
- scoped and authorized file access
- signed and replay-protected encrypted content envelopes

LAN Saturn must not claim:

- protection from a malicious endpoint
- secrecy from the host for features where the host participates in key distribution or plaintext access
- full metadata secrecy on the LAN
- zero-trust architecture in the strict sense

## Target security posture by phase

### Phase 1

- document actual risks
- define authz matrix and target architecture

### Phase 2

- device identity
- enrollment
- sessions
- authorization
- admin-surface lockout

### Phase 3

- signed versioned protocol envelopes
- replay protection
- DM/file contract fixes

### Phase 4

- feature-wide policy enforcement
- bounded validation and rate limits

### Phase 5+

- desktop hardening
- installer and updater trust chain

