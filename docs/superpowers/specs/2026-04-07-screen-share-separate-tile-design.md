# Screen Share Separate Tile Design

## Summary

This spec defines the next room voice UI step: screen sharing must appear as a separate tile, without replacing the user's normal participant tile.

The goal is to support the following model:

- a participant remains visible as a normal voice/camera tile
- an active screen share from that same participant appears as an additional tile
- camera and screen share can coexist visually

## Goals

- Keep the participant's normal tile visible while screen sharing.
- Render screen share as its own tile in the room grid.
- Allow a participant to have both camera and screen share active at the same time.
- Remove only the screen-share tile when sharing stops.

## Non-Goals

- Reworking room membership or voice lifecycle.
- Changing authentication or room voice bootstrap behavior.
- Adding screen-share pinning, focus mode, or presenter layouts.

## Current Problem

The current client media model collapses camera and screen share into a single `videoTrack` field. That means:

- screen share can replace camera in the UI
- the room grid cannot show both sources simultaneously
- the client cannot cleanly represent the difference between a participant tile and a screen-share tile

## Target Behavior

### Participant Tile

Each participant in room voice keeps a normal tile:

- avatar when camera is off
- camera video when camera is on
- mic/camera indicators
- no screen-share takeover

### Screen Share Tile

When a participant starts sharing their screen:

- a new separate tile appears in the grid
- the participant's normal tile remains visible
- the screen-share tile shows only the shared screen
- the tile should be labeled clearly, for example `username is sharing`

When screen sharing stops:

- only the screen-share tile disappears
- the participant tile remains unchanged

## Client State Model

The client media state must represent camera and screen share independently.

### Required `ParticipantInfo` Shape

Instead of a single combined `videoTrack`, participant state should expose:

- `cameraTrack`
- `screenShareTrack`
- `audioTrack`
- `isCameraOff`
- `isMuted`

This allows the UI to render camera and screen share at the same time.

## Rendering Model

The room grid should be derived from two view-model item types:

### 1. Participant Tile Item

Represents the participant identity and optional camera.

### 2. Screen Share Tile Item

Represents the participant's active shared screen.

The rendered grid becomes:

- all participant tiles
- plus all active screen-share tiles

These are separate items, even if both belong to the same person.

## UI Rules

- Camera tile and screen-share tile must be visually distinct.
- The participant tile keeps the user's identity, status icons, and avatar/camera.
- The screen-share tile is clearly labeled as a screen share.
- Screen-share tiles should not silently replace participant tiles.

## Error Handling

- If screen sharing fails to start, no screen-share tile should appear.
- If screen sharing stops unexpectedly, remove only the screen-share tile.
- If camera and screen share are both active, failure in one must not tear down the other.

## Testing

1. Join room voice with no camera and no screen share.
   Expectation: only normal participant tile.
2. Enable camera only.
   Expectation: participant tile shows camera.
3. Enable screen share only.
   Expectation:
   - participant tile remains visible
   - new screen-share tile appears
4. Enable both camera and screen share.
   Expectation:
   - participant tile shows camera
   - separate screen-share tile appears
5. Disable screen share while camera remains on.
   Expectation:
   - screen-share tile disappears
   - camera tile remains
6. Disable camera while screen share remains on.
   Expectation:
   - participant tile falls back to avatar
   - screen-share tile remains
7. Verify behavior in a second browser window.
   Expectation: remote participant sees the same structure.

## Scope Check

This is a safe next feature step because it stays concentrated in:

- `src/services/livekit.ts`
- `src/context/RoomVoiceContext.tsx`
- `src/pages/RoomPage.tsx`

It does not require new backend endpoints.
