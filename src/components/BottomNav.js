import React, { useRef, useEffect, useState } from 'react';
import './HomeFeed.css';

const NAV_IDS = ['home', 'explore', 'campus', 'post', 'groups', 'profile'];
const GROUP_TABS = new Set(['groups', 'group', 'group-chat']);

const ICONS = {
  home: (active) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.8 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  ),
  explore: (active) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.8 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  campus: (active) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.8 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3.333 2 8.667 2 12 0v-5"/>
    </svg>
  ),
  post: (active) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.8 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  groups: (active) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.8 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  profile: (active) => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.8 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
};

export default function BottomNav({ activeTab = '', onNavigate = () => {} }) {
  const navRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  function isActive(id) {
    if (id === 'groups') return GROUP_TABS.has(activeTab);
    return activeTab === id;
  }

  const activeIndex = NAV_IDS.findIndex(id => isActive(id));

  useEffect(() => {
    if (!navRef.current || activeIndex < 0) return;
    const buttons = navRef.current.querySelectorAll('button');
    const btn = buttons[activeIndex];
    if (!btn) return;
    const navRect = navRef.current.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({
      left: btnRect.left - navRect.left,
      width: btnRect.width,
      ready: true,
    });
  }, [activeIndex]);

  return (
    <nav ref={navRef} className="bottom-nav">
      {indicator.ready && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: indicator.left - 8,
            width: indicator.width + 16,
            top: '50%',
            height: 38,
            borderRadius: 999,
            transform: 'translateY(-50%)',
            background: 'rgba(83,74,183,0.14)',
            transition: 'left 320ms cubic-bezier(0.34, 1.25, 0.64, 1)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      {NAV_IDS.map(id => (
        <button
          key={id}
          className={`nav-pill-btn${isActive(id) ? ' active' : ''}`}
          onClick={() => onNavigate(id)}
          aria-label={id}
          style={{ position: 'relative', zIndex: 1 }}
        >
          {ICONS[id](isActive(id))}
        </button>
      ))}
    </nav>
  );
}
