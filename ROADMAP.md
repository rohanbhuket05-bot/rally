# Rally — Development Roadmap

> Based on codebase audit completed 2026-06-22
> Reference: @RALLY_CONTEXT.md

---

## ✅ What's Already Built

### Core Infrastructure
- **Navigation**: 5-tab bottom navigation bar (Home, Explore, Create, Groups, Profile)
- **Authentication**: Supabase integration with OTP magic links and OAuth (Google)
- **Database**: Supabase setup with schema.sql and policies.sql
- **API Layer**: Supabase client wrapper (`supabaseClient.js`) with event CRUD operations
- **Fallback Storage**: localStorage for offline/non-Supabase scenarios

### Implemented Features
- **Home Feed**: Event discovery feed with attendee display
- **Event Management**: Create, edit, delete events with date/time/location
- **Event Cards**: Display events with attendee avatars and "I'm in" RSVP
- **Explore Page**: Basic search input and navigation (categories UI removed)
- **Groups Navigation**: Groups tab and group chat interface
- **Profile Page**: User profile editing, personal event management, friend system UI
- **Group Chat**: Message interface with send/receive (not persistent yet)
- **Cheers System**: Running counter for engagement tracking
- **Responsive Design**: Mobile-first CSS with Tailwind-like styling

### Tech Stack
- React 19 with Hooks
- Supabase (auth, database, real-time capable)
- Vanilla CSS with CSS variables (brand colors defined)
- localStorage for client-side state persistence

---

## ❌ What's Missing

### Critical Features
1. **Event Details Page** — Full event view with attendee list, group formation, media
2. **Group Formation UI** — UI for creating/joining groups at event level
3. **Search & Filter on Explore** — Functional event search by title/location/category
4. **Categories Filter** — Working category buttons to filter events
5. **Geolocation & Nearby** — Location-based event discovery
6. **Spontaneous Posts** — Quick live posts that expire after hours
7. **Group Creation** — Full flow to create user groups
8. **Real-time Chat** — Persist messages to Supabase, real-time updates
9. **Friend System** — Fully working add/accept/reject friend requests
10. **Event Sharing** — Generate beautiful share cards for stories

### Secondary Features
- Trending algorithm for home feed
- Event tickets/external RSVP links
- Media uploads for events/groups (photos, videos)
- Campus/city layer switching
- Notifications (in-app + push)
- Event analytics (attendance, engagement)
- Mutual detection on event cards
- Group member management & permissions
- Event cancellation/rescheduling
- User profile images
- Hashtag support
- Event repeat scheduling

### Polish & UX
- Mobile responsiveness refinement
- Loading states and error handling
- Empty states with guidance
- Confirmation modals for destructive actions
- Animations and transitions
- Accessibility (ARIA labels, keyboard nav)

---

## 🎯 Next 10 Features — Prioritized Build Order

### 1. **Implement Working Search & Filter on Explore Page**
**Business Value**: Medium | **Effort**: Small | **Impact**: High
- Users can't find events without search
- Quick win with existing infrastructure

**Files to Edit**:
- `src/components/Explore.js` — Add filter logic to existing search input, filter by category
- `src/components/Explore.js` — Connect category buttons to filter state

**Implementation**:
```jsx
// In Explore.js:
// - Add state for selected category
// - Filter results by category when buttons clicked
// - Update search to also filter by category
// - Show filtered results in Trending/Nearby sections
```

---

### 2. **Build Event Details Modal/Page**
**Business Value**: High | **Effort**: Medium | **Impact**: High
- Users need to see full event details before committing
- Required for group formation feature
- Currently missing event data (description, ticket link, full attendee list)

**Files to Create**:
- `src/components/EventDetails.js` — New component for full event view

**Files to Edit**:
- `src/App.js` — Add activeTab state for 'event-details', pass event ID and handlers
- `src/components/EventCard.js` — Add click handler to open event details
- `src/components/HomeFeed.js` — Integrate EventDetails modal
- `src/components/Explore.js` — Integrate EventDetails modal

**Implementation**:
- Show event metadata (full description, ticket links, map embed)
- Display all attendees with profiles
- Show groups formed for this event
- "Create a group" button that launches group formation UI

---

### 3. **Implement Group Formation UI**
**Business Value**: Critical | **Effort**: Medium | **Impact**: High
- Core Rally feature: groups at event level
- Gate group chat behind group size/requirements

**Files to Create**:
- `src/components/GroupFormation.js` — Modal for creating/joining event groups

**Files to Edit**:
- `src/App.js` — Add state for group formation modal, add to event context
- `src/lib/supabaseClient.js` — Add functions: `createGroup`, `joinGroup`, `getGroupsForEvent`
- `db/schema.sql` — Add `groups` table with user_id, event_id, name, target_size, gender_ratio, members array
- `db/policies.sql` — Add RLS policies for groups table

**Implementation**:
- Show existing groups for event
- Form to create new group (name, target size, optional gender requirement)
- Join group button
- Show group members and requirements
- Only unlock chat when group is full or requirement met

---

### 4. **Implement Friend Request System**
**Business Value**: High | **Effort**: Medium | **Impact**: Medium
- Users want to connect before events
- Already has UI placeholders in Profile.js

**Files to Edit**:
- `src/components/Profile.js` — Connect incoming/outgoing request UI to actual handlers
- `src/lib/supabaseClient.js` — Add functions: `sendFriendRequest`, `acceptFriendRequest`, `rejectFriendRequest`, `removeFriend`
- `db/schema.sql` — Add `friendships` table (user_id, friend_id, status: pending/accepted/blocked)
- `db/policies.sql` — Add RLS for friendships

**Implementation**:
- "Add friend" button on user profiles
- Accept/reject buttons in Profile incoming section
- Pending/confirmed state management
- Show mutual friends on event attendee lists

---

### 5. **Add Geolocation & Location-Based Discovery**
**Business Value**: Critical | **Effort**: Large | **Impact**: Very High
- "Nearby" is core Rally differentiator
- Leaflet.js already in tech stack mention

**Files to Create**:
- `src/components/MapView.js` — Map interface for exploring events

**Files to Edit**:
- `src/components/Explore.js` — Add map toggle button, integrate MapView
- `src/App.js` — Request location permission on auth, store user location
- `src/lib/supabaseClient.js` — Add functions: `getNearbyEvents(lat, lng, radiusKm)`
- `db/schema.sql` — Add latitude, longitude columns to events table, create geo index
- `package.json` — Add `leaflet` and `react-leaflet` dependencies

**Implementation**:
- Request device location on app load
- Display map with event pins
- Filter events by distance
- Show "Nearby" in Explore with distance
- User location pin on map

---

### 6. **Implement Spontaneous Posts Feature**
**Business Value**: Medium | **Effort**: Medium | **Impact**: High
- Unique Rally feature for quick meetups
- Builds real-time engagement

**Files to Create**:
- `src/components/SpontaneousPost.js` — Form and display for live posts

**Files to Edit**:
- `src/components/Create.js` — Make "Spontaneous post" button functional, launch form
- `src/components/HomeFeed.js` — Display spontaneous posts section (realtime from Supabase)
- `src/lib/supabaseClient.js` — Add functions: `createSpontaneousPost`, `getSpontaneousPosts`, `deleteSpontaneousPost`
- `db/schema.sql` — Add `spontaneous_posts` table (text, location, expires_at, user_id)
- `db/policies.sql` — Add RLS for spontaneous posts

**Implementation**:
- Quick form: text, location
- Auto-expire after 4 hours
- Real-time updates using Supabase subscriptions
- Show on Home feed and in Explore
- Delete button (author only)

---

### 7. **Implement Group Creation Flow**
**Business Value**: High | **Effort**: Medium | **Impact**: High
- Users need to create standalone groups (not just event-tied)
- Complete the "Create a new group" card UI in Groups.js

**Files to Edit**:
- `src/components/Create.js` — Make "Create a rally" option functional, launch form
- `src/components/Groups.js` — "Create a new group" card should navigate to create form
- `src/lib/supabaseClient.js` — Add functions: `createUserGroup`, `getUserGroups`, `addGroupMember`
- `db/schema.sql` — Extend groups table or create separate `user_groups` table if needed
- `db/policies.sql` — Update RLS for user groups

**Implementation**:
- Form: group name, description, privacy (public/private), optional event anchor
- Cover photo upload (optional)
- Initial members selection
- Store in database
- Show in Groups tab
- Link to group chat

---

### 8. **Persist & Sync Real-time Group Chat**
**Business Value**: High | **Effort**: Medium | **Impact**: High
- Messages currently not saved
- Enable real-time collaboration

**Files to Edit**:
- `src/components/GroupChat.js` — Add message persistence and real-time subscription
- `src/lib/supabaseClient.js` — Add functions: `sendGroupMessage`, `getGroupMessages`, `subscribeToGroupMessages`
- `db/schema.sql` — Add `group_messages` table (group_id, user_id, text, created_at)
- `db/policies.sql` — Add RLS for group messages (only group members can see/send)

**Implementation**:
- Save messages to Supabase on send
- Subscribe to message updates on mount
- Display incoming messages in real-time
- Show message timestamps
- Typing indicator (optional)

---

### 9. **Implement Event Sharing (Story Share Cards)**
**Business Value**: Medium | **Effort**: Medium | **Impact**: High
- Growth mechanism: viral sharing
- Users want to share with friends outside app

**Files to Create**:
- `src/components/ShareCard.js` — Visual card generator for sharing

**Files to Edit**:
- `src/components/EventDetails.js` — Add share button
- `src/lib/supabaseClient.js` — Add function: `generateShareImage(eventId)` (optional backend)

**Implementation**:
- Render shareable card (event title, date, attendee count, Rally branding)
- Canvas or HTML2Canvas to generate image
- Copy link to clipboard (Rally deeplink)
- Share to social (Instagram story, Snapchat, WhatsApp)
- Include event join link

---

### 10. **Add Basic Location Mapping & Event Pins**
**Business Value**: High | **Effort**: Small | **Impact**: High
- Visual exploration is more engaging
- Leverage Leaflet.js integration from Step 5
- Quick follow-up once geolocation done

**Files to Edit**:
- `src/components/MapView.js` (from Step 5) — Implement full map display
- `src/components/Explore.js` — Add map toggle button
- `src/App.js` — Store and pass map center (user location)

**Implementation**:
- Center map on user location
- Show event pins with color coding by category
- Tap pin to preview event card
- Show distance on pins
- Cluster markers at zoom out

---

## 📊 Implementation Strategy

### Phase 1 (Weeks 1-2): Search & Discovery
- Features 1-2: Search/Filter + Event Details
- Goal: Make discovering events work end-to-end

### Phase 2 (Weeks 3-4): Social & Community
- Features 3-4: Group Formation + Friend Requests
- Goal: Enable users to form groups and connect

### Phase 3 (Weeks 5-6): Location & Real-time
- Features 5-6: Geolocation + Spontaneous Posts
- Goal: Enable location-based discovery and live updates

### Phase 4 (Weeks 7-8): User-Generated Content & Engagement
- Features 7-8: Group Creation + Chat Persistence
- Goal: Enable users to create and manage groups

### Phase 5 (Weeks 9-10): Virality & Polish
- Features 9-10: Sharing + Mapping
- Goal: Enable growth through sharing, visual discovery

---

## 🔄 Database & Schema Updates Needed

### New Tables Required
1. **`groups`** — User-created and event-tied groups
   ```sql
   id, event_id, user_id, name, description, target_size, gender_ratio, created_at, updated_at
   ```

2. **`group_members`** — Group membership tracking
   ```sql
   id, group_id, user_id, joined_at, role (member/admin)
   ```

3. **`group_messages`** — Group chat messages
   ```sql
   id, group_id, user_id, text, created_at
   ```

4. **`friendships`** — Friend connections
   ```sql
   id, user_id, friend_id, status (pending/accepted/blocked), created_at
   ```

5. **`spontaneous_posts`** — Live quick meetups
   ```sql
   id, user_id, text, location, lat, lng, expires_at, created_at
   ```

### Schema Modifications
- **`events`** table: Add `latitude`, `longitude`, `description`, `ticket_url`
- **`users`** table: Add `bio`, `profile_image_url`, `last_known_location`, `campus`

---

## 🚀 Success Metrics

After implementing these 10 features:
- ✅ Users can discover events by search, category, and location
- ✅ Users can RSVP and see who's attending
- ✅ Users can form groups within events and chat
- ✅ Users can create their own groups and events
- ✅ Users can connect with each other (friends)
- ✅ Real-time updates enable live engagement
- ✅ Sharing enables viral growth
- ✅ Location-based discovery is core experience

---

## 📝 Notes for Implementation

### Dependencies to Add
```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "html2canvas": "^1.4.1"
}
```

### Environment Variables Required
```
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_ANON_KEY=
REACT_APP_LEAFLET_TILE_URL=
```

### Key Architectural Decisions
- All state lives in App.js until we hit scaling limits
- localStorage persists for offline capability
- Supabase handles all persistence and auth
- Real-time via Supabase subscriptions (WebSocket)
- No external APIs until ticket integration phase

### Code Quality Standards
- All new components in `src/components/`
- All API calls wrapped in `src/lib/supabaseClient.js`
- CSS in `src/components/*.css` (one per component)
- Keep components under 300 lines where possible
- PropTypes or JSDoc for component APIs
