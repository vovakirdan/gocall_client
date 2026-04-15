# Room Voice Design

## Summary

This document defines a Discord-like room model for `gocall_client`, where a room is a persistent space and voice participation is a separate, explicit action. A user can enter a room without joining voice. Voice, camera, and screen sharing are activated only after the user presses an explicit button.

The design replaces the current "start a room call" mental model with a room-scoped voice presence model:

- entering a room does not auto-connect media
- voice connection is room-bound and explicit
- leaving the room page does not automatically leave voice
- only an explicit `Leave Voice` action disconnects media

## Goals

- Support Discord-like room behavior for voice participation.
- Allow a user to sit alone in a room voice channel without errors.
- Separate room presence from voice presence.
- Keep microphone, camera, and screen share as independent toggles after joining voice.
- Preserve an active room voice session when navigating away from the room page.
- Reuse existing client LiveKit/media controls where possible.

## Non-Goals

- Reworking direct calls in this design.
- Designing full moderator permissions or stage-channel semantics.
- Background recording, voice activity analytics, or push-to-talk.
- Solving room text chat protocol differences in this document.

## Current State

The current client already has:

- room pages
- a LiveKit wrapper
- room-oriented call UI controls
- a global call context

However, the active room flow still assumes a temporary call/session model:

- users open a room page
- a call is created separately
- room voice state is treated as a call lifecycle rather than a persistent room-scoped presence

The current Go backend in this workspace does not expose the `calls` and room-media endpoints expected by the client. That mismatch must be resolved in implementation by either restoring the original backend contract or adapting the client to the actual signaling/media backend.

## User Experience

### Entering a Room

When a user opens a room page, they enter the room as a participant in the space, but not in voice.

The room page should show:

- room metadata
- room members
- current voice participants
- media state indicators for voice participants

The room page must not request microphone, camera, or screen permissions on entry.

### Joining Voice

The room page includes a primary explicit action:

- `Join Voice`

When pressed:

- the client requests room-scoped media credentials
- the client joins the room voice session
- the user becomes visible in the voice participant list
- microphone/camera remain under explicit user control

### In Voice

After joining voice, the user can:

- mute/unmute microphone
- enable/disable camera
- start/stop screen share
- remain in the voice channel while alone
- navigate elsewhere in the app without being disconnected

### Leaving Voice

The room page and any global persistent voice UI include:

- `Leave Voice`

This is the only action that disconnects room voice participation.

Leaving the page or navigating through the app must not implicitly trigger `Leave Voice`.

## Room Model

Each room has two distinct states:

### Room Presence

Room presence means the user has opened the room and is participating in the room as an application space.

This includes:

- seeing room information
- seeing member lists
- seeing who is currently in voice

Room presence does not imply active media.

### Voice Presence

Voice presence means the user has explicitly joined the room voice session.

This includes:

- active membership in the room voice channel
- optional microphone publication
- optional camera publication
- optional screen-share publication

Voice presence can outlive the visible room page session.

## Required Backend Contract

The implementation needs a room-scoped voice/session API rather than an ad hoc room call creation flow.

Recommended backend contract:

- `GET /api/rooms/:id/state`
- `POST /api/rooms/:id/voice/join`
- `POST /api/rooms/:id/voice/leave`

`GET /api/rooms/:id/state` should return:

- room metadata
- room members
- voice participants
- per-participant media state

`POST /api/rooms/:id/voice/join` should return:

- media server URL
- media access token
- stable room media identity
- participant identity

`POST /api/rooms/:id/voice/leave` should:

- remove the user from room voice presence
- terminate the user's room media session
- keep room membership/page state intact

This backend can be implemented directly in the Go API or proxied to the signaling/media service used in the original project.

## Client State Model

The client should track room voice state independently from page visibility.

### Persistent Global Voice State

The global call context should evolve into a room voice session context capable of surviving route transitions.

At minimum it should track:

- active room ID
- active room name
- whether the user is in room voice
- whether mic is enabled
- whether camera is enabled
- whether screen share is enabled
- connected participants and their media state

### Route-Level Room State

The room page should read global room voice state and render room-specific controls.

The room page must not own the lifetime of the voice connection. It only reflects and manipulates it.

### Single Active Voice Session

Initial scope should support one active voice session at a time.

Rules:

- joining voice in another room should either be blocked or first require leaving the current room voice
- direct calls and room voice should not coexist in the initial implementation

## UI Design

### Room Header

The room header should show:

- room title
- room presence information
- voice participant count
- `Join Voice` or `Leave Voice` depending on current state

### Main Room Area

The main area should show:

- video tiles for participants publishing camera or screen
- avatar tiles for users in voice without video
- a stable empty/solo state when only one participant is present

### Controls

When in voice, controls should include:

- microphone toggle
- camera toggle
- screen share toggle
- leave voice button

These controls should remain available both in the room page and in a global persistent mini-bar so the user can leave voice from elsewhere in the app.

## Navigation Rules

- Opening a room page does not join voice.
- Leaving a room page does not leave voice.
- Returning to the room page should rehydrate the current room voice UI if the user is still connected.
- Explicit `Leave Voice` ends the room voice session.

## Error Handling

### Join Voice Failures

If joining voice fails:

- keep the user in room presence
- show an actionable error
- do not mark the user as in voice

### Permission Failures

If mic/camera/screen permission is denied:

- keep the voice session active if the base connection succeeded
- only disable the affected media capability
- present a clear local error state

### Solo Participant State

If the user is alone in voice:

- keep the session stable
- show a normal waiting state
- do not disconnect or degrade controls

## Testing Plan

### Core Scenarios

1. Open a room and do not press `Join Voice`.
2. Press `Join Voice` and connect to room voice.
3. Stay alone in voice without errors.
4. Toggle microphone on and off.
5. Toggle camera on and off.
6. Start and stop screen share.
7. Navigate away from the room page while remaining connected.
8. Return to the room page and verify rehydrated room voice UI.
9. Press `Leave Voice` from the room page.
10. Press `Leave Voice` from a global persistent voice bar.

### Regression Risks

- current room page assumes a call lifecycle tied to the page
- current call context assumes call endpoints that are not present in the local Go backend
- current client may need separation between direct-call state and room-voice state

## Recommended Implementation Order

1. Align backend or signaling contract for room-scoped voice join/leave/state.
2. Refactor global call state into persistent room voice session state.
3. Update room page to render `Join Voice` / `Leave Voice`.
4. Prevent route changes from tearing down room voice.
5. Add persistent global mini-bar for active room voice.
6. Reconnect room page UI to the persistent room voice state.
7. Verify solo, multi-user, and navigation scenarios.

## Open Decisions

For the agreed scope of this design, these decisions are fixed:

- joining voice is explicit
- leaving the room page does not disconnect voice
- leaving voice is explicit
- camera and screen share are supported after voice join

No unresolved product ambiguity remains for the first implementation slice.
