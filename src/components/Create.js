import React from 'react';
import './HomeFeed.css';

const createOptions = [
  {
    id: 'host-event',
    title: 'Host an event',
    description: 'Post a real event with time, place, and RSVP so people can show up together.',
    accent: '#534AB7',
    action: null,
  },
  {
    id: 'create-group',
    title: 'Create a group',
    description: 'Start a club, org, or friend group with its own chat, events, and member roster.',
    accent: '#D4537E',
    action: (onCreateGroup) => onCreateGroup({}),
  },
  {
    id: 'create-rally',
    title: 'Create a rally',
    description: 'Anchor your plan to an existing event and invite people to join your group.',
    accent: '#1D9E75',
    action: (onCreateGroup) => onCreateGroup({ initialType: 'event' }),
  },
  {
    id: 'spontaneous',
    title: 'Spontaneous post',
    description: 'Drop a short live post for easy meet-ups that expire in a few hours.',
    accent: '#EF9F27',
    action: null,
  },
];

export default function Create({ onNavigate = () => {}, onCreateGroup = () => {} }) {
  function handleStart(option) {
    if (option.action) {
      option.action(onCreateGroup);
    } else {
      alert(`${option.title} coming soon!`);
    }
  }

  return (
    <main className="feed-root">
      <header className="feed-header">
        <h1>Create</h1>
        <p className="tagline">Launch something new for your crew.</p>
      </header>

      <section className="create-grid">
        {createOptions.map((option) => (
          <article key={option.id} className="create-card" style={{ borderTopColor: option.accent }}>
            <div>
              <div className="create-badge" style={{ backgroundColor: option.accent }}>
                {option.title}
              </div>
              <p>{option.description}</p>
            </div>
            <button className="nav-btn" onClick={() => handleStart(option)}>
              {option.action ? `Start` : 'Coming soon'}
            </button>
          </article>
        ))}
      </section>

      <nav className="bottom-nav">
        <button className="nav-btn" onClick={() => onNavigate('home')}>
          <span className="nav-btn-icon">🏠</span><span className="nav-btn-label">Home</span>
        </button>
        <button className="nav-btn" onClick={() => onNavigate('explore')}>
          <span className="nav-btn-icon">🔍</span><span className="nav-btn-label">Explore</span>
        </button>
        <button className="nav-btn active" onClick={() => onNavigate('post')}>
          <span className="nav-btn-icon">➕</span><span className="nav-btn-label">Create</span>
        </button>
        <button className="nav-btn" onClick={() => onNavigate('groups')}>
          <span className="nav-btn-icon">💬</span><span className="nav-btn-label">Groups</span>
        </button>
        <button className="nav-btn" onClick={() => onNavigate('profile')}>
          <span className="nav-btn-icon">👤</span><span className="nav-btn-label">Profile</span>
        </button>
      </nav>
    </main>
  );
}
