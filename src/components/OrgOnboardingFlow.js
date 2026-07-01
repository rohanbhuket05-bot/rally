import React, { useState, useEffect, useRef } from 'react';
import { SCHOOLS, getDomainsForSchool } from '../data/schools';
import { checkOrgHandleAvailable, insertOrganization, uploadOrgLogo, sendEduVerification, verifyEduCode } from '../lib/supabaseClient';
import './HomeFeed.css';

const ORG_TYPES = ['Club', 'Sports Team', 'Greek Life', 'Academic Org', 'Student Government', 'Media / Publication', 'Other'];
const TOTAL_STEPS = 7;

function validateHandle(h) {
  if (!h) return 'Handle is required';
  if (h.length < 2) return 'At least 2 characters';
  if (h.length > 30) return 'Max 30 characters';
  if (!/^[a-z0-9_.]+$/.test(h)) return 'Only lowercase letters, numbers, _ and .';
  return null;
}

export default function OrgOnboardingFlow({ user, onComplete }) {
  const [step, setStep] = useState(1);

  // Step 1 — school
  const [school, setSchool] = useState('');
  const [query, setQuery] = useState('');

  // Step 2 — org type
  const [orgType, setOrgType] = useState('');

  // Step 3 — org name
  const [orgName, setOrgName] = useState('');

  // Step 4 — handle
  const [handle, setHandle] = useState('');
  const [handleStatus, setHandleStatus] = useState('idle'); // idle | checking | available | taken | invalid
  const [handleError, setHandleError] = useState(null);

  // Step 5 — description
  const [description, setDescription] = useState('');

  // Step 6 — logo
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Step 7 — .edu verification
  const [verifySubStep, setVerifySubStep] = useState('email');
  const [verifyPrefix, setVerifyPrefix] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [eduVerified, setEduVerified] = useState(false);
  const [eduEmail, setEduEmail] = useState('');

  const filtered = query.trim()
    ? SCHOOLS.filter(s => s.toLowerCase().includes(query.trim().toLowerCase()))
    : SCHOOLS;

  // Handle availability check
  useEffect(() => {
    if (!handle) { setHandleStatus('idle'); setHandleError(null); return; }
    const err = validateHandle(handle);
    if (err) { setHandleStatus('invalid'); setHandleError(err); return; }
    setHandleStatus('checking');
    const timer = setTimeout(async () => {
      const available = await checkOrgHandleAvailable(handle);
      setHandleStatus(available ? 'available' : 'taken');
      setHandleError(available ? null : 'Handle already taken');
    }, 400);
    return () => clearTimeout(timer);
  }, [handle]);

  function handleSchoolSelect(s) { setSchool(s); setQuery(s); }

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const url = await uploadOrgLogo(user.id, file);
    if (url) setLogoUrl(url);
    setUploading(false);
  }

  async function handleSendCode() {
    setVerifyLoading(true);
    setVerifyError(null);
    const domain = getDomainsForSchool(school)[0] || '';
    const fullEmail = `${verifyPrefix.trim().toLowerCase()}@${domain}`;
    const { success, error } = await sendEduVerification(fullEmail, school);
    setVerifyLoading(false);
    if (success) setVerifySubStep('code');
    else setVerifyError(error || 'Failed to send code. Try again.');
  }

  async function handleVerifyCode() {
    setVerifyLoading(true);
    setVerifyError(null);
    const domain = getDomainsForSchool(school)[0] || '';
    const fullEmail = `${verifyPrefix.trim().toLowerCase()}@${domain}`;
    const { success, error } = await verifyEduCode(fullEmail, verifyCode.trim());
    setVerifyLoading(false);
    if (success) {
      setEduVerified(true);
      setEduEmail(fullEmail);
      setVerifySubStep('success');
    } else {
      setVerifyError(error || 'Invalid code. Try again.');
    }
  }

  async function handleFinish(skipVerify = false) {
    const org = await insertOrganization({
      owner_id: user.id,
      name: orgName.trim(),
      handle: handle.toLowerCase(),
      description: description.trim() || null,
      org_type: orgType,
      school,
      logo_url: logoUrl || null,
      school_verified: !skipVerify && eduVerified,
      edu_email: eduVerified && !skipVerify ? eduEmail : null,
    });
    onComplete(org);
  }

  function back() { setStep(s => s - 1); }

  const orgInitials = orgName.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0A0A0F',
      display: 'flex',
      flexDirection: 'column',
      padding: '56px 24px 40px',
      boxSizing: 'border-box',
      maxWidth: 520,
      margin: '0 auto',
      width: '100%',
    }}>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 40 }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} style={{
            height: 3, flex: 1, borderRadius: 99,
            background: i < step ? 'var(--purple)' : 'rgba(255,255,255,0.1)',
            transition: 'background 300ms',
          }} />
        ))}
      </div>

      {/* ── Step 1: School ── */}
      {step === 1 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: '#EEEEFF', letterSpacing: '-0.5px' }}>
            Where is your org based?
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 15, color: '#8888AA' }}>Select the university your org is affiliated with</p>

          <div style={{ position: 'relative', marginBottom: 12 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#8888AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="text-input"
              placeholder="Search universities…"
              value={query}
              onChange={e => { setQuery(e.target.value); setSchool(''); }}
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 38 }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, scrollbarWidth: 'none' }}>
            {filtered.map(s => (
              <button key={s} onClick={() => handleSchoolSelect(s)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 16px', borderRadius: 12, border: 'none',
                background: school === s ? 'rgba(83,74,183,0.2)' : 'rgba(255,255,255,0.04)',
                outline: school === s ? '1.5px solid var(--purple)' : '1px solid rgba(255,255,255,0.07)',
                cursor: 'pointer', textAlign: 'left', transition: 'background 150ms', flexShrink: 0,
              }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: '#EEEEFF' }}>{s}</span>
                {school === s && (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--purple)" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            ))}
            {filtered.length === 0 && <div style={{ fontSize: 14, color: '#555', padding: '12px 0' }}>No results</div>}
          </div>

          <button onClick={() => setStep(2)} disabled={!school} className="join"
            style={{ width: '100%', padding: '15px', borderRadius: 14, fontSize: 16, opacity: school ? 1 : 0.35 }}>
            Continue
          </button>
        </div>
      )}

      {/* ── Step 2: Org Type ── */}
      {step === 2 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <BackButton onClick={back} />
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: '#EEEEFF', letterSpacing: '-0.5px' }}>
            What kind of org?
          </h1>
          <p style={{ margin: '0 0 28px', fontSize: 15, color: '#8888AA' }}>Select the category that fits best</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 'auto' }}>
            {ORG_TYPES.map(type => (
              <button key={type} onClick={() => setOrgType(type)} style={{
                padding: '14px 16px', borderRadius: 12, border: 'none', textAlign: 'left',
                background: orgType === type ? 'rgba(83,74,183,0.2)' : 'rgba(255,255,255,0.04)',
                outline: orgType === type ? '1.5px solid var(--purple)' : '1px solid rgba(255,255,255,0.07)',
                cursor: 'pointer', transition: 'background 150ms',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: orgType === type ? 'var(--purple)' : '#EEEEFF' }}>{type}</span>
                {orgType === type && (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--purple)" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            ))}
          </div>

          <button onClick={() => setStep(3)} disabled={!orgType} className="join"
            style={{ width: '100%', padding: '15px', borderRadius: 14, fontSize: 16, marginTop: 28, opacity: orgType ? 1 : 0.35 }}>
            Continue
          </button>
        </div>
      )}

      {/* ── Step 3: Org Name ── */}
      {step === 3 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <BackButton onClick={back} />
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: '#EEEEFF', letterSpacing: '-0.5px' }}>
            What's your org called?
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 15, color: '#8888AA' }}>Use the official name of your organization</p>

          <input
            className="text-input"
            placeholder="e.g. UCLA Surf Club"
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
            autoFocus
            style={{ width: '100%', boxSizing: 'border-box', marginBottom: 24 }}
          />

          <button onClick={() => setStep(4)} disabled={!orgName.trim()} className="join"
            style={{ width: '100%', padding: '15px', borderRadius: 14, fontSize: 16, marginTop: 'auto', opacity: orgName.trim() ? 1 : 0.35 }}>
            Continue
          </button>
        </div>
      )}

      {/* ── Step 4: Handle ── */}
      {step === 4 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <BackButton onClick={back} />
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: '#EEEEFF', letterSpacing: '-0.5px' }}>
            Pick a handle
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 15, color: '#8888AA' }}>This is how people find your org</p>

          <div style={{ position: 'relative', marginBottom: 8 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8888AA', fontSize: 15, pointerEvents: 'none' }}>@</span>
            <input
              className="text-input"
              placeholder="uclasurfclub"
              value={handle}
              onChange={e => setHandle(e.target.value.toLowerCase())}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              style={{
                width: '100%', boxSizing: 'border-box', paddingLeft: 30,
                borderColor: handleStatus === 'available' ? 'var(--teal)'
                  : handleStatus === 'invalid' || handleStatus === 'taken' ? '#E74C3C'
                  : undefined,
              }}
            />
          </div>

          <div style={{ minHeight: 20, fontSize: 13, marginBottom: 24 }}>
            {handleStatus === 'checking' && <span style={{ color: '#8888AA' }}>Checking…</span>}
            {handleStatus === 'available' && <span style={{ color: 'var(--teal)' }}>✓ Available</span>}
            {(handleStatus === 'taken' || handleStatus === 'invalid') && <span style={{ color: '#E74C3C' }}>{handleError}</span>}
            {handleStatus === 'idle' && <span style={{ color: '#555' }}>Lowercase letters, numbers, _ and .</span>}
          </div>

          <button onClick={() => setStep(5)} disabled={handleStatus !== 'available'} className="join"
            style={{ width: '100%', padding: '15px', borderRadius: 14, fontSize: 16, marginTop: 'auto', opacity: handleStatus === 'available' ? 1 : 0.35 }}>
            Continue
          </button>
        </div>
      )}

      {/* ── Step 5: Description ── */}
      {step === 5 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <BackButton onClick={back} />
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: '#EEEEFF', letterSpacing: '-0.5px' }}>
            Describe your org
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 15, color: '#8888AA' }}>Optional — give people a sense of what you're about</p>

          <textarea
            className="text-input textarea"
            placeholder="What does your org do? What kind of events do you host?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            autoFocus
            style={{ width: '100%', boxSizing: 'border-box', minHeight: 120, resize: 'vertical' }}
          />

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 24 }}>
            <button onClick={() => setStep(6)} className="join"
              style={{ width: '100%', padding: '15px', borderRadius: 14, fontSize: 16 }}>
              Continue
            </button>
            {!description.trim() && (
              <button onClick={() => setStep(6)} style={{ background: 'none', border: 'none', color: '#8888AA', fontSize: 14, cursor: 'pointer', padding: '8px' }}>
                Skip for now
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Step 6: Logo ── */}
      {step === 6 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <BackButton onClick={back} style={{ alignSelf: 'flex-start' }} />
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: '#EEEEFF', letterSpacing: '-0.5px', alignSelf: 'flex-start' }}>
            Add a logo
          </h1>
          <p style={{ margin: '0 0 40px', fontSize: 15, color: '#8888AA', alignSelf: 'flex-start' }}>Optional — you can always do this later</p>

          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />

          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
            width: 120, height: 120, borderRadius: 28, border: 'none',
            background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden', marginBottom: 16,
            outline: '2px dashed rgba(255,255,255,0.15)',
          }}>
            {logoUrl ? (
              <img src={logoUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(83,74,183,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: 'var(--purple)' }}>
                {orgInitials}
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 36,
              background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </button>

          {uploading && <div style={{ fontSize: 13, color: '#8888AA', marginBottom: 8 }}>Uploading…</div>}
          {logoUrl && !uploading && (
            <button onClick={() => fileRef.current?.click()} style={{ background: 'none', border: 'none', color: 'var(--purple)', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
              Change logo
            </button>
          )}

          <div style={{ marginTop: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => setStep(7)} disabled={uploading} className="join"
              style={{ width: '100%', padding: '15px', borderRadius: 14, fontSize: 16, opacity: uploading ? 0.5 : 1 }}>
              Continue
            </button>
            {!logoUrl && (
              <button onClick={() => setStep(7)} style={{ background: 'none', border: 'none', color: '#8888AA', fontSize: 14, cursor: 'pointer', padding: '8px' }}>
                Skip for now
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Step 7: .edu Verification ── */}
      {step === 7 && (() => {
        const domain = getDomainsForSchool(school)[0] || '';
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <BackButton onClick={back} />

            {verifySubStep === 'email' && (
              <>
                <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: '#EEEEFF', letterSpacing: '-0.5px' }}>
                  Verify affiliation
                </h1>
                <p style={{ margin: '0 0 28px', fontSize: 15, color: '#8888AA' }}>
                  Use your {school} email to confirm your org is affiliated with this school
                </p>

                {domain ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: 8 }}>
                      <input
                        className="text-input"
                        placeholder="yourname"
                        value={verifyPrefix}
                        onChange={e => { setVerifyPrefix(e.target.value); setVerifyError(null); }}
                        onKeyDown={e => { if (e.key === 'Enter' && verifyPrefix.trim() && !verifyLoading) handleSendCode(); }}
                        autoFocus
                        autoCapitalize="none"
                        autoCorrect="off"
                        style={{ flex: 1, border: 'none', borderRadius: 0, background: 'transparent', minWidth: 0 }}
                      />
                      <span style={{ padding: '0 14px', fontSize: 14, color: '#8888AA', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>@{domain}</span>
                    </div>
                    {verifyError && <div style={{ fontSize: 13, color: '#E74C3C', marginBottom: 12 }}>{verifyError}</div>}
                  </>
                ) : (
                  <p style={{ fontSize: 14, color: '#8888AA', marginBottom: 16 }}>
                    We don't have a known .edu domain for {school} yet — you can verify from your org settings later.
                  </p>
                )}

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {domain && (
                    <button onClick={handleSendCode} disabled={verifyLoading || !verifyPrefix.trim()} className="join"
                      style={{ width: '100%', padding: '15px', borderRadius: 14, fontSize: 16, opacity: verifyPrefix.trim() && !verifyLoading ? 1 : 0.35 }}>
                      {verifyLoading ? 'Sending…' : 'Send code'}
                    </button>
                  )}
                  <button onClick={() => handleFinish(true)} style={{ background: 'none', border: 'none', color: '#8888AA', fontSize: 14, cursor: 'pointer', padding: '8px' }}>
                    Verify later
                  </button>
                </div>
              </>
            )}

            {verifySubStep === 'code' && (
              <>
                <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: '#EEEEFF', letterSpacing: '-0.5px' }}>
                  Check your email
                </h1>
                <p style={{ margin: '0 0 28px', fontSize: 15, color: '#8888AA' }}>
                  We sent a 6-digit code to <strong style={{ color: '#EEEEFF' }}>{verifyPrefix}@{domain}</strong>
                </p>

                <input
                  className="text-input"
                  placeholder="000000"
                  value={verifyCode}
                  onChange={e => { setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setVerifyError(null); }}
                  onKeyDown={e => { if (e.key === 'Enter' && verifyCode.length === 6 && !verifyLoading) handleVerifyCode(); }}
                  inputMode="numeric"
                  autoFocus
                  style={{ letterSpacing: '0.3em', fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}
                />
                {verifyError && <div style={{ fontSize: 13, color: '#E74C3C', marginBottom: 12 }}>{verifyError}</div>}

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button onClick={handleVerifyCode} disabled={verifyLoading || verifyCode.length < 6} className="join"
                    style={{ width: '100%', padding: '15px', borderRadius: 14, fontSize: 16, opacity: verifyCode.length === 6 && !verifyLoading ? 1 : 0.35 }}>
                    {verifyLoading ? 'Verifying…' : 'Verify'}
                  </button>
                  <button onClick={() => { setVerifySubStep('email'); setVerifyCode(''); setVerifyError(null); }}
                    style={{ background: 'none', border: 'none', color: '#8888AA', fontSize: 14, cursor: 'pointer', padding: '8px' }}>
                    Use a different email
                  </button>
                </div>
              </>
            )}

            {verifySubStep === 'success' && (
              <>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 40 }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(83,74,183,0.2)', border: '2px solid var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="var(--purple)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#EEEEFF', marginBottom: 6 }}>Affiliation verified</div>
                    <div style={{ fontSize: 15, color: '#8888AA' }}>{school} confirmed</div>
                  </div>
                </div>
                <button onClick={() => handleFinish(false)} className="join" style={{ width: '100%', padding: '15px', borderRadius: 14, fontSize: 16 }}>
                  Launch your org
                </button>
              </>
            )}
          </div>
        );
      })()}

    </div>
  );
}

function BackButton({ onClick, style }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', color: '#8888AA', cursor: 'pointer',
      fontSize: 14, padding: 0, marginBottom: 24, textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 6, ...style,
    }}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      Back
    </button>
  );
}
