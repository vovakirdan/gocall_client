# Messages Sidebar And Friend Removal Design

## Summary

This spec covers two related UX changes:

1. Add explicit friend removal on the friends page.
2. Add a `Messages` section to the lower-left sidebar that shows only existing direct conversations.

It also removes the dependency on the legacy global WebSocket flow for normal personal messaging navigation, because that flow is incompatible with the current Go backend and produces authorization errors.

## Goals

- Users can remove a friend directly from the `Friends` page.
- Sidebar shows only users who already have a direct message history with the current user.
- Clicking a sidebar conversation opens the existing direct chat page.
- The sidebar/messages flow does not rely on the legacy WireChat protocol.
- Normal app navigation no longer triggers the `Authorization header missing` error for the personal chat path.

## Non-Goals

- Reintroducing old incoming direct-call signaling.
- Reworking room voice behavior.
- Deleting chat history when a friend is removed.
- Adding unread counts, typing indicators, or search in messages.

## Current Problems

### Friend Removal

The backend already supports `DELETE /api/friends/remove`, but the current friends UI does not expose a removal action.

### Messages Sidebar

The sidebar currently has `Pinned Friends`, but no separate direct message list. The user wants a dedicated `Messages` section that contains only conversations with existing chat history.

### Authorization Errors

The app still mounts the legacy global `WebSocketContext`. That context is built for a different signaling/chat contract and attempts to connect during normal app usage. On the current backend this causes repeated authorization-related failures and is unrelated to the newer direct chat page implementation.

## Proposed UX

### Friends Page

Each friend card will have three actions:

- Open direct chat
- Open private voice room
- Remove friend

Removal behavior:

- Clicking `Remove` sends the existing backend request.
- On success, the friend disappears from the current list immediately.
- A success message is shown.
- If the user had an existing direct chat history with that person, the chat history is not deleted automatically.

### Sidebar

A new `Messages` section will appear near the lower-left area of the sidebar.

The list contains only direct conversations that already exist in message history.

Each item shows:

- Username
- Optional display name fallback if available
- Last message preview
- Last message timestamp

Clicking an item navigates to `/chat/:friendUserId`.

### Empty State

If there are no existing conversations, the `Messages` section shows a short empty-state message instead of listing all friends.

## Backend API

### Existing Endpoint Reused

Friend removal continues to use:

- `DELETE /api/friends/remove`

Payload:

```json
{ "friend_username": "alice" }
```

### New Endpoint Required

Add:

- `GET /api/chat/conversations`

Protected endpoint. It returns the direct conversation list for the authenticated user.

Response shape:

```json
{
  "conversations": [
    {
      "user_id": "friend-uuid",
      "username": "alice",
      "name": "Alice",
      "last_message": "hello",
      "last_message_at": "2026-04-05T12:00:00Z"
    }
  ]
}
```

Behavior:

- Find all messages where current user is sender or receiver.
- Group by the other participant.
- For each participant, return the latest message text and timestamp.
- Join against `users` to return `username` and `name`.
- Sort by `last_message_at` descending.

## Client Architecture

### New Sidebar Messages Data Flow

Add a small client API layer for:

- `fetchConversations(token)`

The sidebar will load this list after authentication and render it without depending on the legacy global WebSocket context.

### Friend Removal Flow

Use the existing client service for removal or extend it if needed so that the `Friends` page can call:

- `removeFriend(friend.username, token)`

Then refresh or optimistically update local friends state.

### WebSocket Scope

The legacy `WebSocketContext` should no longer be a required global app dependency for the personal messaging path.

Target behavior:

- Sidebar conversation list uses plain HTTP.
- Direct chat page continues using the newer direct chat implementation.
- Normal app boot should not open the old incompatible personal chat socket automatically.

The safest implementation is to remove global mounting of the legacy context from the main app tree unless another still-working feature depends on it. If any remaining feature still depends on it, scope it only to those screens instead of the whole application.

## Implementation Outline

### Backend

1. Add `GET /api/chat/conversations`.
2. Query distinct conversation partners with latest message metadata.
3. Return stable JSON payload documented above.

### Client

1. Add messages sidebar service/types.
2. Render `Messages` block in sidebar.
3. Add `Remove` button to friend cards.
4. Stop relying on the legacy global `WebSocketContext` for personal chat navigation.

## Risks

### Legacy Call Features

Some old call UI may still reference the legacy WebSocket/call context. Removing or scoping the old context must be done carefully so room voice work remains intact.

### Conversation Identity

The sidebar must use UUID `user_id`, not numeric DB IDs, because direct chat routes and backend message history are UUID-based.

### Message Preview Accuracy

The backend query for latest message per conversation must be deterministic and sorted correctly, otherwise sidebar order will feel broken.

## Testing

### Friend Removal

1. Add two users as friends.
2. Remove one from the friends page.
3. Confirm the friend disappears from the list.
4. Confirm a direct chat page, if previously opened, can still render history.

### Sidebar Messages

1. Send at least one message between two users.
2. Reload the app.
3. Confirm the conversation appears in `Messages`.
4. Confirm users without message history do not appear there.
5. Click a conversation and confirm chat opens with the correct user UUID.

### Authorization Regression

1. Open the app after login.
2. Navigate between home, friends, and chat.
3. Confirm the previous `Authorization header missing` error no longer appears for the personal chat path.

## Scope Check

This spec is intentionally limited to:

- friend removal
- sidebar conversation list
- removal of the legacy personal-chat bootstrap dependency

It is small enough for a single implementation pass.
