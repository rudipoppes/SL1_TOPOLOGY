# REJECTED FEATURES - DO NOT IMPLEMENT

This document tracks features that have been explicitly rejected by the user and should **NEVER** be implemented again.

---

## ❌ Floating/Draggable Panels (August 30, 2025)

**Status**: PERMANENTLY REJECTED  
**User Feedback**: "Nah don't like it. Revert back to previous version"  
**Date**: August 30, 2025

### What Was Rejected:
- Floating/draggable control panels that can be moved around the screen
- Split controls into multiple movable panels
- Drag handles and positioning state management
- Any implementation of movable UI components

### Files That Should Never Be Created:
- `FloatingPanel.tsx` or `FloatingPanel.*`
- `DraggablePanel.*`
- `MovablePanel.*`
- `FloatingControls.*`
- `MovableControls.*`

### What to Keep Instead:
- **Fixed positioned controls** in the right sidebar
- **Single control panel** layout
- **Static positioning** - no drag functionality
- Current `ZoomControls.tsx` implementation

### Implementation Details That Were Rejected:
- Mouse event handling for dragging
- Position state management with `useState`
- Viewport boundary constraints
- Visual drag handles with dot indicators
- Panel positioning with `initialPosition` props
- Any form of movable/draggable UI elements

---

## Guidelines for Future Development

1. **NEVER** implement floating or draggable UI elements
2. **ALWAYS** use fixed positioning for control panels  
3. **STICK** to the current sidebar layout approach
4. **ASK** the user before implementing any major UI layout changes
5. **REFER** to this document when considering panel/control modifications

---

**Last Updated**: August 30, 2025  
**Maintained By**: Development team to prevent re-implementation of rejected features