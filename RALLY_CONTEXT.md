# Rally — Claude Code Context Document

> Reference this file at the start of every Claude Code session with @RALLY_CONTEXT.md

---

## What is Rally?

Rally is a social media app built around local events. Think Instagram, but every post, group, and connection is anchored to a real life experience. The core insight is simple — the reason people don't put themselves out there socially isn't lack of opportunity, it's fear of vulnerability. Every feature in Rally is designed to reduce that friction and make it easier to show up in real life.

**Tagline:** Experiences are better shared.

---

## The Problem

There is no app that lets you:
- See what people in your city are doing on a Friday night
- Find others going to the same events as you
- Connect with them before you even show up
- Do all of this without it feeling like a dating app

Partiful is closed/invite-only. Radiate is rave-specific and paywalled. Eventbrite has zero social layer. Meetup is culturally dead with Gen Z. Rally fills the gap.

---

## Target User

**Primary:** College students, specifically starting at UCSD and USC.

**Core persona:** The shy extrovert. Someone who loves going out and experiencing things but hates going alone and isn't good at cold small talk. Someone who bonds through shared activities rather than forced conversation. Someone who wants to expand their social circle without it feeling vulnerable or desperate.

**Secondary:** Anyone in a city who loves going out — not strictly college students. College is the entry point, not the ceiling. Post-grads keep their accounts and transition from the campus layer to the city layer seamlessly.

---

## Brand

- **Name:** Rally
- **Tagline:** Experiences are better shared
- **Verb usage:** "I'll make a Rally" / "check Rally" / "who's rallying for this"
- **Vibe:** Vibrant, warm, inclusive, non-judgmental, real. Not a dating app. Not corporate. Built around community and showing up in real life.
- **Cultural ethos:** Similar to PLUR in rave culture — Peace, Love, Unity, Respect — but broader. A judgment-free space where showing up is celebrated.

---

## Brand Colors

- **Primary purple:** #534AB7
- **Light purple:** #EEEDFE (backgrounds, badges)
- **Pink:** #D4537E
- **Light pink:** #FBEAF0
- **Amber:** #EF9F27
- **Light amber:** #FAEEDA
- **Teal:** #1D9E75
- **Light teal:** #E1F5EE

---

## Tech Stack

- **Frontend:** React + Tailwind CSS
- **Backend:** Supabase (auth, database, real-time, file storage)
- **Maps:** Leaflet.js
- **Hosting:** Vercel
- **Future mobile:** React Native

Always build mobile-first. Max width 390px for mobile screens. Use bottom navigation bar with 5 tabs.

---

## App Structure — Navigation

Bottom navigation bar with 5 tabs:
1. **Home** — discovery feed
2. **Explore** — search, map view
3. **Post** — create event or rally
4. **Groups** — orgs, friend groups, event groups
5. **Profile** — personal profile

---

## Core Features

### 1. Events Discovery Feed (Home)
- Shows trending events at your campus/city
- Spontaneous activity posts from your network
- Recent content from events friends attended
- Every piece of content is anchored to an event or activity — not just floating in a feed

### 2. Event Page
- Event name, date, location, ticket link
- Who's going — mutuals shown first
- Group formation section — join or create a group for this event
- Photo and video content from past editions
- Share button that generates a beautiful card for Instagram/Snapchat stories

### 3. Group Formation
- User sets group name, target size, optional gender ratio requirement
- Group chat only unlocks when requirements are met
- Shows current composition in real time — "4F · 3M · 1 spot left"
- Icebreaker prompt when group first forms — e.g. "drop your most listened artist this week"
- Designed to make strangers feel comfortable before meeting in person

### 4. Org & Club Pages
- Any student org can create a page
- Members see upcoming events, who's going, group chat
- Replaces Discord/GroupMe for student orgs — cleaner, event-native
- Public events from orgs can spill into the campus discovery feed
- Hosts/orgs can post their own events directly

### 5. Spontaneous Activity Posts
- "Anyone want to play pool at Price Center rn?"
- Story-style, expires after 3 hours
- Tiered visibility: just my groups / my school / everyone nearby
- Shows on map view as active pins
- Low-stakes way to put yourself out there without permanent record

### 6. Cheers System
- Give a cheer to someone you vibed with at an event
- Can only cheer someone you both attended the same event with
- One cheer per person per event
- Shows on profile as reputation built in real life, not online
- Acts as a trust/safety signal — high cheers = reliable, fun person
- Cannot be gamed through online behavior

### 7. Run It Back
- Button that appears 24-48 hours after an event ends
- One tap: "rally_user is down to run it back"
- No cringe "I had the best time!" message — just a casual signal
- If enough group members tap it, app surfaces similar upcoming events nearby
- Converts one-time event groups into recurring social circles

### 8. User Profiles
- Events attended archive
- Photos and videos from those events
- Cheers count and who gave them
- Current groups (public/private toggle per group)
- Upcoming events — public or private user's choice
- Mutual connections shown when viewing someone else's profile

### 9. Create Event / Create Rally
Two distinct flows from the + (Post) tab:
- **Host an event:** You're organizing something — party, kickback, campus event. You set details, manage guest list, can make it public to campus feed.
- **Create a rally:** You're going to an existing event and want people to join. External event is the anchor, group formation is the focus.

### 10. Map View
- Color-coded pins by category: music (purple), campus (teal), casual (amber), sports (pink)
- Shows both planned events AND live spontaneous activity posts
- Tap a pin to see a preview card
- Filter by: tonight / this weekend / music / campus / casual

### 11. Trending Page
- Trending events at your school this week
- Most cheersed people recently
- Fastest growing groups
- Hottest venues in your city

### 12. Cost Splitting (V2)
- Built into event groups
- Add a cost item, splits automatically by member count
- Tracks who's paid, routes payment requests via Venmo/Zelle deep links
- No in-app payment processing (legal/regulatory reasons)

### 13. Privacy Controls
- Per-group toggle: Public / Friends only / Private
- Activity posts visibility: my groups / my school / everyone nearby
- Upcoming events: public or private
- Designed for people who want to meet new people without their existing friends watching

---

## Authentication & Onboarding

- Sign up with personal email OR .edu email
- Personal email = basic account, can see public events and explore
- Add .edu email = unlocks campus community, trending at your school, org groups
- .edu email domain mapped to specific university (ucsd.edu = UCSD, usc.edu = USC)
- Verified college student badge on profile

---

## Safety Features

- .edu verification raises barrier to bad actors
- Real identity tied to account (known to platform even if not fully public)
- Gender ratio requirement in group formation
- Cheers system as organic trust/reputation signal
- Minimum account age/cheers threshold before posting spontaneous activities
- One-tap reporting
- Groups only visible within verified school network by default
- Community ethos of respect baked into onboarding and brand

---

## Two-Sided Marketplace

**Regular users** — find events, form groups, meet people, post content, give cheers

**Hosts/Organizers** — clubs, orgs, promoters, venues post events, reach their demographic, build following

These two user types need each other. Hosts need an audience, users need events. The network effect compounds as both sides grow.

---

## Competitive Landscape

| App | What they do | What they're missing |
|-----|-------------|---------------------|
| Partiful | Closed invite-only party planning | Open discovery, stranger matching, group formation, campus layer |
| Radiate | Rave-specific social discovery | Broad events, non-dating vibe, college community |
| Meetup | Interest group meetups | Gen Z relevance, modern UI, events-native social layer |
| Eventbrite | Event ticketing | Any social features whatsoever |
| Discord | Community chat for orgs | Events-native, clean UX, non-power-user friendly |
| Yik Yak | Anonymous campus posts | Accountability, real identity, events focus |

**Rally's position:** Open social discovery network for real life experiences, with college as the entry point and vulnerability reduction as the core philosophy. Nobody else is doing this.

---

## Go-To-Market Strategy

1. Launch at UCSD via existing org leader connections
2. Simultaneously soft launch at USC via existing connections
3. Expand to other UC campuses via Reddit communities
4. College community = acquisition engine for city-wide expansion
5. Org/club pages drive institutional adoption and word of mouth

**Launch target:** September (back to school — freshmen arriving, highest social energy of the year)

---

## Long Term Vision

Own the college social events space → expand to all young people in every city → acquisition by major platform (Meta, Snapchat, Spotify, or Eventbrite) who needs a trusted social graph organized around real life experiences.

**Comparable exits/valuations:**
- Partiful: $27.3M raised, $120M+ valuation, 5M users, named Time's 100 Most Influential Companies 2025
- Yik Yak: $400M valuation at peak (cautionary tale — no identity layer, moderation failure)
- Meetup: $63M annual revenue even after losing cultural relevance

---

## Key Metrics to Track

- Activation rate (% who complete meaningful action after signup)
- Did someone make a real world plan that they followed through on (most important metric)
- Group formation completion rate
- Run it back conversion rate
- Week over week retention
- Events per user per month

---

## Design Principles

1. Every feature reduces the vulnerability of putting yourself out there
2. Activity is the icebreaker — friendship is the byproduct, not the product
3. Real life is the product — content is just the evidence it happened
4. Safety by design, not safety by warning label
5. Community rewards showing up in real life, not performing online
6. College is the entry point, not the ceiling
7. Never feel like a dating app

---

*This document was created from the founding conversation between Rally's creator and Claude on June 20, 2026. Update it as the product evolves.*
npm start
