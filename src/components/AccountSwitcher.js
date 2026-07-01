import React from 'react';
import './HomeFeed.css';

export default function AccountSwitcher({ profile, orgs, onSelectStudent, onSelectOrg }) {
  const initials = (profile?.name || 'You').trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0A0A0F',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '40px 24px',
      boxSizing: 'border-box',
      maxWidth: 520,
      margin: '0 auto',
      width: '100%',
    }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900, color: '#EEEEFF', letterSpacing: '-0.5px' }}>
        Who are you today?
      </h1>
      <p style={{ margin: '0 0 36px', fontSize: 15, color: '#8888AA' }}>
        Select an account to continue
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Student account */}
        <button onClick={onSelectStudent} style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '16px 18px', borderRadius: 16, border: 'none',
          background: 'rgba(255,255,255,0.04)',
          outline: '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer', textAlign: 'left', transition: 'background 150ms',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        >
          <div style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'rgba(83,74,183,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--purple)' }}>{initials}</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#EEEEFF', marginBottom: 2 }}>
              {profile?.name || 'Student account'}
            </div>
            <div style={{ fontSize: 13, color: '#8888AA' }}>
              {profile?.username ? `@${profile.username}` : 'Personal account'}
            </div>
          </div>
          <ChevronRight />
        </button>

        {/* Org accounts */}
        {orgs.map(org => {
          const orgInitials = org.name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
          return (
            <button key={org.id} onClick={() => onSelectOrg(org)} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '16px 18px', borderRadius: 16, border: 'none',
              background: 'rgba(255,255,255,0.04)',
              outline: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', textAlign: 'left', transition: 'background 150ms',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, overflow: 'hidden', background: 'rgba(83,74,183,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {org.logo_url ? (
                  <img src={org.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--purple)' }}>{orgInitials}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#EEEEFF', marginBottom: 2 }}>
                  {org.name}
                </div>
                <div style={{ fontSize: 13, color: '#8888AA' }}>
                  @{org.handle} · {org.org_type}
                </div>
              </div>
              <ChevronRight />
            </button>
          );
        })}

      </div>
    </div>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8888AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}
