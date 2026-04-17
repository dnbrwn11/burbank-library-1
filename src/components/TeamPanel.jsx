import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { getProjectMembers, removeProjectMember } from '../supabase/db';

const ACCENT = '#B89030';
const HEADER_BG = '#222222';

function initials(nameOrEmail) {
  if (!nameOrEmail) return '?';
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrEmail[0].toUpperCase();
}

function Avatar({ name, email, size = 34 }) {
  const label = name || email || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: ACCENT, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontFamily: "'Archivo', sans-serif",
      fontWeight: 700, flexShrink: 0, userSelect: 'none',
    }}>
      {initials(label)}
    </div>
  );
}

function RoleBadge({ role }) {
  const isOwner = role === 'owner' || role === 'Owner';
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
      padding: '2px 6px', borderRadius: 3,
      background: isOwner ? ACCENT : '#eee',
      color: isOwner ? '#fff' : '#666',
      textTransform: 'uppercase', flexShrink: 0,
    }}>
      {role}
    </span>
  );
}

export default function TeamPanel({ project, user, onClose }) {
  const [members, setMembers] = useState([]);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Viewer');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const [removing, setRemoving] = useState(null);

  const isOwner = project.owner_id === user.id;

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [membersResult, ownerResult] = await Promise.all([
      getProjectMembers(project.id),
      supabase.from('profiles').select('full_name, email, avatar_url').eq('id', project.owner_id).single(),
    ]);
    setMembers(membersResult.data || []);
    setOwnerProfile(ownerResult.data || null);
    setLoading(false);
  }

  async function sendInvite(e) {
    e.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          inviteeEmail: email.trim(),
          role,
          origin: window.location.origin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invite');
      setMessage({ ok: true, text: `Invite sent to ${email.trim()}` });
      setEmail('');
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setSending(false);
    }
  }

  async function handleRemove(userId) {
    setRemoving(userId);
    await removeProjectMember(project.id, userId);
    setMembers(prev => prev.filter(m => m.user_id !== userId));
    setRemoving(null);
  }

  // Build full list: owner first, then other members (excluding owner if they're also in project_members)
  const nonOwnerMembers = members.filter(m => m.user_id !== project.owner_id);

  const INPUT = {
    width: '100%', boxSizing: 'border-box',
    border: '1px solid #ddd', borderRadius: 6,
    padding: '8px 10px', fontSize: 13,
    fontFamily: "'Figtree', sans-serif",
    outline: 'none', background: '#fafafa',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          zIndex: 200,
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
        background: '#fff', zIndex: 201,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 28px rgba(0,0,0,.18)',
      }}>
        {/* Header */}
        <div style={{
          background: HEADER_BG, padding: '0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 52, flexShrink: 0,
        }}>
          <span style={{
            color: '#fff', fontFamily: "'Archivo', sans-serif",
            fontWeight: 700, fontSize: 14, letterSpacing: 0.5,
          }}>
            Team Members
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#888', fontSize: 20, lineHeight: 1, padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Member list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ padding: 20, fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#aaa' }}>
              Loading…
            </div>
          ) : (
            <>
              {/* Owner */}
              <MemberRow
                name={ownerProfile?.full_name}
                email={ownerProfile?.email}
                role="Owner"
                isYou={project.owner_id === user.id}
                canRemove={false}
              />

              {/* Other members */}
              {nonOwnerMembers.map(m => (
                <MemberRow
                  key={m.user_id}
                  name={m.profiles?.full_name}
                  email={m.profiles?.email}
                  role={m.role}
                  isYou={m.user_id === user.id}
                  canRemove={isOwner}
                  removing={removing === m.user_id}
                  onRemove={() => handleRemove(m.user_id)}
                />
              ))}

              {nonOwnerMembers.length === 0 && (
                <div style={{
                  padding: '16px 20px',
                  fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#bbb',
                }}>
                  No additional members yet.
                </div>
              )}
            </>
          )}
        </div>

        {/* Invite form — owners only */}
        {isOwner && (
          <form
            onSubmit={sendInvite}
            style={{
              borderTop: '1px solid #eee', padding: 20,
              display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0,
            }}
          >
            <div style={{
              fontFamily: "'Archivo', sans-serif", fontWeight: 700,
              fontSize: 11, letterSpacing: 1, color: '#555',
            }}>
              INVITE MEMBER
            </div>

            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              required
              style={INPUT}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                style={{ ...INPUT, flex: 1, cursor: 'pointer' }}
              >
                <option value="Editor">Editor</option>
                <option value="Viewer">Viewer</option>
              </select>

              <button
                type="submit"
                disabled={sending || !email.trim()}
                style={{
                  background: sending || !email.trim() ? '#ddd' : ACCENT,
                  color: '#fff', border: 'none', borderRadius: 6,
                  padding: '8px 16px', fontSize: 13,
                  fontFamily: "'Archivo', sans-serif", fontWeight: 700,
                  cursor: sending || !email.trim() ? 'default' : 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {sending ? 'Sending…' : 'Send Invite'}
              </button>
            </div>

            {message && (
              <div style={{
                fontSize: 12, fontFamily: "'Figtree', sans-serif",
                color: message.ok ? '#16a34a' : '#dc2626',
                padding: '6px 10px', borderRadius: 5,
                background: message.ok ? '#f0fdf4' : '#fef2f2',
              }}>
                {message.text}
              </div>
            )}

            <div style={{ fontSize: 11, color: '#aaa', fontFamily: "'Figtree', sans-serif" }}>
              Editors can modify estimates. Viewers can view only.
            </div>
          </form>
        )}
      </div>
    </>
  );
}

function MemberRow({ name, email, role, isYou, canRemove, removing, onRemove }) {
  const display = name || email || 'Unknown';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 20px',
      borderBottom: '1px solid #f5f5f5',
    }}>
      <Avatar name={name} email={email} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: '#222',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          fontFamily: "'Figtree', sans-serif",
        }}>
          {display}
          {isYou && (
            <span style={{ color: '#aaa', fontWeight: 400, marginLeft: 4 }}>(You)</span>
          )}
        </div>
        {name && email && (
          <div style={{
            fontSize: 11, color: '#aaa', fontFamily: "'Figtree', sans-serif",
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {email}
          </div>
        )}
      </div>
      <RoleBadge role={role} />
      {canRemove && (
        <button
          onClick={onRemove}
          disabled={removing}
          title="Remove member"
          style={{
            background: 'none', border: 'none',
            cursor: removing ? 'default' : 'pointer',
            color: removing ? '#ddd' : '#ccc',
            fontSize: 18, lineHeight: 1, padding: '0 0 0 4px',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// Exported for header avatar row
export { Avatar, initials };
