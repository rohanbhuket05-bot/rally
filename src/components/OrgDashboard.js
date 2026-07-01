import React from 'react';
import './HomeFeed.css';

export default function OrgDashboard({ org, onSwitch }) {
  const orgInitials = org.name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <main className="feed-root">
      <header className="feed-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0 }}>{org.name}</h1>
            <p className="tagline">@{org.handle} · {org.org_type}</p>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 12, overflow: 'hidden', background: 'rgba(83,74,183,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {org.logo_url ? (
              <img src={org.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--purple)' }}>{orgInitials}</span>
            )}
          </div>
        </div>
      </header>

      <div className="scroll-area">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, textAlign: 'center', padding: '40px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(83,74,183,0.15)', border: '1px solid rgba(83,74,183,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#EEEEFF' }}>Org dashboard coming soon</div>
          <div style={{ fontSize: 14, color: '#8888AA', maxWidth: 260, lineHeight: 1.6 }}>
            Post events, manage members, and grow your presence on campus.
          </div>
        </div>

        <button onClick={onSwitch} style={{
          width: '100%', padding: '14px', borderRadius: 14,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: '#8888AA', fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}>
          Switch account
        </button>
      </div>
    </main>
  );
}
