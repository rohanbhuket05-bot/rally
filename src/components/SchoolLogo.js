import React, { useState } from 'react';
import { getInitials } from '../lib/utils';

export default function SchoolLogo({ school = '', size = 48, style = {} }) {
  const [failed, setFailed] = useState(false);

  // Try Google favicon as school logo proxy
  const domain = school.toLowerCase().replace(/[^a-z0-9]/g, '') + '.edu';
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  const initials = getInitials(school) || school.slice(0, 2).toUpperCase();

  return failed ? (
    <div style={{
      width: size,
      height: size,
      borderRadius: size * 0.22,
      background: 'var(--purple)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 800,
      fontSize: size * 0.35,
      flexShrink: 0,
      ...style,
    }}>
      {initials}
    </div>
  ) : (
    <img
      src={faviconUrl}
      alt={school}
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        objectFit: 'contain',
        background: 'rgba(255,255,255,0.06)',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
