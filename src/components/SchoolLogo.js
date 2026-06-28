import React, { useState } from 'react';
import { getDomainsForSchool } from '../data/schools';

export default function SchoolLogo({ school, size = 20, style = {} }) {
  const [failed, setFailed] = useState(false);
  const domain = getDomainsForSchool(school)[0];
  const initial = (school || '?')[0].toUpperCase();
  const radius = Math.round(size * 0.22);

  if (!domain || failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: radius,
        background: 'rgba(157,143,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.52), fontWeight: 800, color: 'var(--purple)',
        flexShrink: 0, lineHeight: 1, ...style,
      }}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={school}
      onError={() => setFailed(true)}
      style={{
        width: size, height: size, borderRadius: radius,
        objectFit: 'contain', background: '#fff',
        flexShrink: 0, display: 'block', ...style,
      }}
    />
  );
}
