# Room Tile Focus And Fullscreen Design

## Summary

Add a unified room viewing mode for all video-based tiles in `RoomPage`.

Any visual tile with a real video track should support:

- `Expand`: switch the room into focused layout mode
- `Fullscreen`: open that tile through the browser fullscreen API

This applies to:

- participant camera tiles
- screen-share tiles

Voice-only participant cards without video remain visible in the room, but do not support `Expand` or `Fullscreen`.

## Goals

- Let the user enlarge any camera or screen-share tile inside the room page
- Keep room voice controls available while one tile is focused
- Allow browser fullscreen for any visual tile with video
- Preserve the current separate screen-share tile model

## Non-Goals

- No changes to LiveKit media transport
- No changes to room membership, auth, or voice session lifecycle
- No floating window or separate route for focused media

## Tile Model

`RoomPage` should build a unified list of visual tiles for layout and interaction.

Each visual tile should have:

- `id`
- `kind: "camera" | "screen-share"`
- `participant`
- `track`
- `title`

Camera tiles and screen-share tiles are rendered from the same list, but can keep different visual styling.

## Focus Mode

`RoomPage` should keep one focused tile id:

- `focusedTileId: string | null`

When `focusedTileId` is `null`:

- the page uses the normal grid layout

When `focusedTileId` is set:

- the selected tile is rendered in a large primary area
- all remaining visual tiles are rendered in a horizontal strip near the bottom
- room voice controls remain visible
- voice-only participant cards remain outside the focus/fullscreen model and should not block the layout

If the focused tile disappears because camera or screen share was turned off:

- focus mode should fall back to another available visual tile if one exists
- otherwise it should exit focus mode cleanly

## Fullscreen

Any visual tile with video should support `Fullscreen`.

Implementation should use the browser fullscreen API on the tile container element.

Rules:

- fullscreen is available for both camera and screen-share tiles
- fullscreen does not change room voice state
- leaving fullscreen returns to the previous room layout state

## UI Actions

Normal grid mode:

- visual tiles show `Expand` and `Fullscreen`
- voice-only cards do not show these actions

Focus mode:

- focused tile shows `Exit focus` and `Fullscreen`
- tiles in the bottom strip can be clicked to become the focused tile

## Error Handling

- if fullscreen is unavailable or rejected by the browser, keep the room layout unchanged
- do not break voice controls or tile rendering on fullscreen failure

## Testing

Manual verification should cover:

1. Expand a camera tile and verify focused layout
2. Expand a screen-share tile and verify focused layout
3. Switch focus from one tile to another via the bottom strip
4. Fullscreen a camera tile
5. Fullscreen a screen-share tile
6. Turn off the currently focused camera or screen share and verify graceful fallback
7. Exit focus mode and verify the normal grid layout returns
