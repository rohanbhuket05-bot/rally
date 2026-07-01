# Sphera â€” Project Context

## What Sphera Is
A mobile-first social app for coordinating real-world experiences with friends. Core differentiator is the group/social layer built around events â€” not just RSVPing, but the coordination that happens around going somewhere together. Think group chats tied to events, a friends system, and spontaneous meetup tooling.

## Tech Stack
- React (Create React App), no TypeScript
- Supabase (PostgreSQL, RLS, Realtime, Auth)
- Plain CSS with CSS variables (HomeFeed.css is the global stylesheet)
- No component library â€” all UI is custom

## Git Workflow
- Always work on `master` branch â€” never switch branches unless the user explicitly says to
- Never push at all until user says to

---

## UI Guidelines

### Vision
Modern, nightlife-inspired, Gen Z social media aesthetic. The app should feel like it belongs alongside Instagram, Luma, Discord, and Radiate â€” not a generic CRUD app. Dark mode is the default and primary experience.

### References
Apps to draw from: Instagram, Luma, Discord, Radiate.
- If the user provides a reference website and asks to match a specific aspect (font, color, spacing, component style), match it exactly â€” do not approximate.

### Core Rules
- **Dark mode first.** Dark mode is the default. Every component must look correct in dark mode before light mode is considered.
- **Mobile-first.** The app lives in a ~390px wide container. Every UI decision is evaluated at that width.
- **No generic Claude-coded look.** Avoid the default "assistant-built" aesthetic: no flat grey cards, no system-ui font with no personality, no boxy unstyled buttons. Every component should feel intentional.
- **Typography matters.** Font choice is a primary visual signal. Do not change fonts unless the user specifies â€” when they do, match exactly.
- **No emojis in UI.** Use SVG icons instead of emoji for UI elements.
- **Spacing should feel tight and intentional** â€” not airy and generic. Dense where density serves the content (chat, lists), spacious where it serves hierarchy (headers, cards).

### Color
- Primary accent: `var(--purple)` (`#534AB7`)
- Do not introduce new colors without user direction. When user specifies a color from a reference, use the exact hex.

### Components
- Cards should feel elevated and purposeful â€” subtle shadows, rounded corners, clear hierarchy
- Buttons should have personality â€” not flat grey rectangles
- Modals/sheets should feel native to mobile â€” bottom sheets preferred over centered dialogs where appropriate
