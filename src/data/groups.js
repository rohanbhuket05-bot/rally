export const groupsData = [
  {
    id: 'g1',
    name: 'Live Music Club',
    members: 24,
    privacy: 'Public',
    description: 'Weekly shows and campus meetups for live music lovers. Find people who want to catch concerts, dj nights, and chill jams together.',
    banner: 'Live music, local friends, late night vibes.',
    prompt: 'Drop your go-to weekend anthem.',
    events: [
      { id: 'e1', title: 'Acoustic Backyard Set', date: 'Sat · 8PM', location: 'East Commons' },
      { id: 'e2', title: 'Campus Open Mic', date: 'Wed · 7PM', location: 'Brewhaus' },
    ],
    messages: [
      { id: 'm1', sender: 'Ava', text: 'Who wants to grab tacos after the set?', time: '2m ago' },
      { id: 'm2', sender: 'You', text: 'I’m in. Let’s meet at the green stairs.', time: '1m ago', me: true },
    ],
  },
  {
    id: 'g2',
    name: 'Campus Climbers',
    members: 8,
    privacy: 'Private',
    description: 'A small group for hiking, sunrise sessions, and low-key adventures around campus and nearby trails.',
    banner: 'Find new trails and morning climbs.',
    prompt: 'Share your favorite trail snack.',
    events: [
      { id: 'e3', title: 'Sunrise Torrey Pines Hike', date: 'Sun · 6AM', location: 'Torrey Pines' },
      { id: 'e4', title: 'Lagoon Loop Walk', date: 'Thu · 5PM', location: 'Scripps Pier' },
    ],
    messages: [
      { id: 'm3', sender: 'Jordan', text: 'Anyone planning to carpool for Sunday?', time: '8m ago' },
      { id: 'm4', sender: 'You', text: 'I can drive two people if needed.', time: '5m ago', me: true },
    ],
  },
  {
    id: 'g3',
    name: 'Board Game Night',
    members: 18,
    privacy: 'Public',
    description: 'Casual board game nights with snacks and easy icebreaker games for everyone.',
    banner: 'Weekly game nights with snacks and new people.',
    prompt: 'What game are you bringing?',
    events: [
      { id: 'e5', title: 'Strategy Sunday', date: 'Sun · 6PM', location: 'Student Union' },
    ],
    messages: [
      { id: 'm5', sender: 'Maya', text: 'Does anyone want to try Catan or werewolf tonight?', time: '12m ago' },
    ],
  },
  {
    id: 'g4',
    name: 'Hiking Crew',
    members: 42,
    privacy: 'Friends',
    description: 'Group hikes and trail meetups for anyone who wants active weekends with a crew.',
    banner: 'Trail days and good company.',
    prompt: 'Where should we explore next?',
    events: [
      { id: 'e6', title: 'Sunset Trail Meetup', date: 'Sat · 5PM', location: 'Sunset Cliffs' },
    ],
    messages: [
      { id: 'm6', sender: 'Sam', text: 'Pack water and sunscreen. We’ll take the west trail.', time: '10m ago' },
    ],
  },
  {
    id: 'g5',
    name: 'Vegan Eats',
    members: 9,
    privacy: 'Open',
    description: 'Food-focused meetups for plant-based meals, recipe swaps, and new restaurant adventures.',
    banner: 'Try the best vegan spots with new friends.',
    prompt: 'Recommend your favorite vegan dish.',
    events: [
      { id: 'e7', title: 'Taco Tuesday Crawl', date: 'Tue · 7PM', location: 'Downtown' },
    ],
    messages: [
      { id: 'm7', sender: 'Lea', text: 'We should try the new vegan taco spot by the dorms.', time: '3m ago' },
    ],
  },
];
