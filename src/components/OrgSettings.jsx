import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { updateOrganization, getOrgMembers, removeOrgMember } from '../supabase/db';

const ACCENT = '#B89030';
const HEADER = '#222222';
const BG = '#F9F9F8';

const INP = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', border: '1.5px solid #e0e0dc', borderRadius: 7,
  fontFamily: "'Figtree', sans-serif", fontSize: 14,
  outline: 'none', background: '#fff', color: '#111',
};

const LBL = {
  display: 'block',
  fontFamily: "'Archivo', sans-serif", fontWeight: 700,
  fontSize: 11, color: '#555', letterSpacing: 1,
  textTransform: 'uppercase', marginBottom: 8,
};

// ── Org avatar ──────────────────────────────────────────────────────────────

export function OrgAvatar({ org, size = 28 }) {
  if (org?.logo_url) {
    return (
      <img
        src={org.logo_url}
        alt={org.name}
        style={{ width: size, height: size, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  const name = org?.name || '?';
  const letters = name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const hue = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: 4,
      background: `hsl(${hue}, 38%, 42%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.floor(size * 0.38), fontWeight: 700, color: '#fff',
      fontFamily: "'Archivo', sans-serif", flexShrink: 0, letterSpacing: 0.5,
    }}>
      {letters || '?'}
    </div>
  );
}

// ── Org menu dropdown (used in headers) ────────────────────────────────────

export function OrgMenu({ org, user, onOrgSettings, onSignOut, onBack, onClose }) {
  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 99 }}
        onClick={onClose}
      />
      <div style={{
        position: 'absolute', right: 0, top: 42,
        background: '#fff', border: '1px solid #e5e5e0',
        borderRadius: 12, padding: '6px 0', zIndex: 100,
        minWidth: 230, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        {/* Org + user info header */}
        <div style={{ padding: '8px 14px 10px', borderBottom: '1px solid #eee' }}>
          {org ? (
            <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, color: '#222', marginBottom: 2 }}>
              {org.name}
            </div>
          ) : null}
          <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: '#888' }}>{user.email}</div>
        </div>

        {/* Org actions */}
        {org ? (
          <>
            <MItem onClick={() => { onClose(); onOrgSettings('members'); }}>Manage Team</MItem>
            <MItem onClick={() => { onClose(); onOrgSettings('settings'); }}>Organization Settings</MItem>
          </>
        ) : (
          <MItem onClick={() => { onClose(); onOrgSettings('settings'); }}>Create Organization</MItem>
        )}

        <div style={{ borderTop: '1px solid #eee', margin: '4px 0' }} />

        {onBack && (
          <MItem onClick={() => { onClose(); onBack(); }}>← All Projects</MItem>
        )}
        <MItem onClick={() => { onClose(); onSignOut(); }} danger>Sign Out</MItem>
      </div>
    </>
  );
}

function MItem({ onClick, children, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: hov ? '#f5f5f3' : 'transparent',
        border: 'none', padding: '8px 14px', fontSize: 13,
        fontFamily: "'Figtree', sans-serif", cursor: 'pointer',
        color: danger ? '#dc2626' : '#333',
      }}
    >
      {children}
    </button>
  );
}

// ── Role badge ──────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const colors = {
    owner: { bg: ACCENT, c: '#fff' },
    admin: { bg: '#e0e7ff', c: '#3730a3' },
    member: { bg: '#eee', c: '#666' },
  };
  const { bg, c } = colors[role?.toLowerCase()] || colors.member;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, padding: '2px 7px', borderRadius: 3, background: bg, color: c, textTransform: 'uppercase', flexShrink: 0 }}>
      {role}
    </span>
  );
}

// ── Create org form (shown when user has no org) ───────────────────────────

function CreateOrgForm({ user, onCreated, onClose }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/create-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create organization');
      onCreated(data.org);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: HEADER, height: 56, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 20, lineHeight: 1, padding: '0 4px 0 0' }}>‹</button>
        <span style={{ color: ACCENT, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: 2 }}>COSTDECK</span>
        <span style={{ color: '#555', fontSize: 11 }}>·</span>
        <span style={{ color: '#888', fontFamily: "'Figtree', sans-serif", fontSize: 13 }}>Create Organization</span>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '56px 24px' }}>
        <div style={{ background: '#fff', border: '1px solid #e6e6e2', borderRadius: 14, padding: '36px 32px', maxWidth: 460, width: '100%', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 22, color: '#111', marginBottom: 8 }}>Create your organization</h2>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#888', marginBottom: 28, lineHeight: 1.5 }}>
            Organize your projects under a company name. Invite teammates to collaborate across all projects.
          </p>

          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={LBL}>Company Name <span style={{ color: ACCENT }}>*</span></label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. PCL Construction"
                required
                autoFocus
                style={INP}
                onFocus={e => { e.target.style.borderColor = ACCENT; }}
                onBlur={e => { e.target.style.borderColor = '#e0e0dc'; }}
              />
            </div>

            {error && (
              <div style={{ fontSize: 13, color: '#dc2626', padding: '8px 12px', borderRadius: 6, background: '#fef2f2' }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid #ddd', borderRadius: 7, padding: '10px 0', fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#555', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving || !name.trim()} style={{ flex: 1, background: saving ? '#d4b86a' : ACCENT, color: '#fff', border: 'none', borderRadius: 7, padding: '10px 0', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Creating…' : 'Create Organization'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

// ── Settings tab ────────────────────────────────────────────────────────────

function SettingsTab({ org, orgRole, onOrgUpdated }) {
  const [name, setName] = useState(org.name);
  const [logoUrl, setLogoUrl] = useState(org.logo_url || null);
  const [savingName, setSavingName] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  const isAdmin = orgRole === 'owner' || orgRole === 'admin';

  const saveName = async () => {
    if (!isAdmin || !name.trim() || name === org.name) return;
    setSavingName(true);
    const { data, error } = await updateOrganization(org.id, { name: name.trim() });
    if (error) setMsg({ ok: false, text: error.message });
    else { setMsg({ ok: true, text: 'Name saved' }); onOrgUpdated(data); }
    setSavingName(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setMsg({ ok: false, text: 'Logo must be under 2MB' }); return; }

    setUploadingLogo(true);
    const ext = file.name.split('.').pop().toLowerCase();
    const path = `${org.id}/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('org-logos')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setMsg({ ok: false, text: `Upload failed: ${uploadError.message}` });
      setUploadingLogo(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('org-logos').getPublicUrl(path);
    const { data: updated, error: updateError } = await updateOrganization(org.id, { logo_url: publicUrl });

    if (updateError) setMsg({ ok: false, text: updateError.message });
    else {
      setLogoUrl(publicUrl);
      setMsg({ ok: true, text: 'Logo updated' });
      onOrgUpdated(updated);
    }
    setUploadingLogo(false);
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div style={{ maxWidth: 520, padding: '36px 28px' }}>
      {/* Logo */}
      <div style={{ marginBottom: 36 }}>
        <label style={LBL}>Company Logo</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 10 }}>
          {/* Preview */}
          {logoUrl ? (
            <img src={logoUrl} alt={org.name} style={{ height: 64, maxWidth: 160, objectFit: 'contain', borderRadius: 6, border: '1px solid #eee', padding: 8, background: '#fff' }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 8, background: ACCENT + '18', border: `1.5px dashed ${ACCENT}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <OrgAvatar org={org} size={40} />
            </div>
          )}

          {isAdmin && (
            <div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingLogo}
                style={{ background: uploadingLogo ? '#ddd' : ACCENT, color: '#fff', border: 'none', borderRadius: 7, padding: '9px 18px', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 12, cursor: uploadingLogo ? 'default' : 'pointer' }}
              >
                {uploadingLogo ? 'Uploading…' : logoUrl ? 'Replace Logo' : 'Upload Logo'}
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoUpload} style={{ display: 'none' }} />
              <p style={{ fontSize: 11, color: '#aaa', margin: '6px 0 0', fontFamily: "'Figtree', sans-serif" }}>PNG, JPG, SVG, WebP · max 2MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Name */}
      <div style={{ marginBottom: 20 }}>
        <label style={LBL}>Organization Name</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={!isAdmin}
            style={{ ...INP, flex: 1 }}
            onFocus={e => { e.target.style.borderColor = ACCENT; }}
            onBlur={e => { e.target.style.borderColor = '#e0e0dc'; }}
            onKeyDown={e => { if (e.key === 'Enter') saveName(); }}
          />
          {isAdmin && (
            <button
              onClick={saveName}
              disabled={savingName || !name.trim() || name === org.name}
              style={{ background: (savingName || !name.trim() || name === org.name) ? '#ddd' : ACCENT, color: '#fff', border: 'none', borderRadius: 7, padding: '9px 20px', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {savingName ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div style={{ fontSize: 13, fontFamily: "'Figtree', sans-serif", color: msg.ok ? '#16a34a' : '#dc2626', padding: '8px 12px', borderRadius: 6, background: msg.ok ? '#f0fdf4' : '#fef2f2' }}>
          {msg.text}
        </div>
      )}

      {!isAdmin && (
        <p style={{ fontSize: 13, color: '#aaa', fontFamily: "'Figtree', sans-serif", marginTop: 16 }}>
          Only owners and admins can edit organization settings.
        </p>
      )}
    </div>
  );
}

// ── Members tab ─────────────────────────────────────────────────────────────

function MembersTab({ org, user, orgRole }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [sending, setSending] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [msg, setMsg] = useState(null);

  const isAdmin = orgRole === 'owner' || orgRole === 'admin';

  useEffect(() => { load(); }, [org?.id]);

  const load = async () => {
    setLoading(true);
    const { data } = await getOrgMembers(org.id);
    let list = data || [];

    // The org owner must always appear. If they're missing from organization_members
    // (e.g. legacy row, RLS gap, or alternate creation path), fetch their profile
    // and prepend a synthetic entry so the list is never empty.
    if (!list.find(m => m.user_id === user.id)) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', user.id)
        .single();
      list = [
        {
          user_id: user.id,
          role: orgRole || 'owner',
          joined_at: null,
          invited_at: null,
          profiles: profile || { full_name: null, email: user.email, avatar_url: null },
        },
        ...list,
      ];
    }

    setMembers(list);
    setLoading(false);
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    setSending(true);
    setMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          type: 'org',
          orgId: org.id,
          inviteeEmail: inviteEmail.trim(),
          role: inviteRole,
          origin: window.location.origin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invite');
      setMsg({ ok: true, text: `Invite sent to ${inviteEmail.trim()}` });
      setInviteEmail('');
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setSending(false);
    }
  };

  const handleRemove = async (userId) => {
    setRemoving(userId);
    await removeOrgMember(org.id, userId);
    setMembers(prev => prev.filter(m => m.user_id !== userId));
    setRemoving(null);
  };

  const memberCount = loading ? '…' : members.length;

  return (
    <div style={{ maxWidth: 600, padding: '36px 28px' }}>

      {/* Member list */}
      <div style={{ background: '#fff', border: '1px solid #e6e6e2', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0ee', fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 11, color: '#888', letterSpacing: 1, textTransform: 'uppercase' }}>
          Members ({memberCount})
        </div>
        {loading ? (
          <div style={{ padding: '20px', fontFamily: "'Figtree', sans-serif", fontSize: 13, color: '#aaa' }}>Loading…</div>
        ) : (
          members.map(m => {
            const displayName = m.profiles?.full_name || m.profiles?.email || '(no profile)';
            const showEmail = m.profiles?.email && m.profiles?.full_name;
            const isYou = m.user_id === user.id;
            const canRemove = isAdmin && !isYou && m.role !== 'owner';

            return (
              <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #f5f5f5' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'Archivo', sans-serif", flexShrink: 0 }}>
                  {(m.profiles?.full_name || m.profiles?.email || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#222', fontFamily: "'Figtree', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {displayName}
                    {isYou && <span style={{ color: '#aaa', fontWeight: 400, marginLeft: 6, fontSize: 12 }}>(You)</span>}
                  </div>
                  {showEmail && (
                    <div style={{ fontSize: 11, color: '#aaa', fontFamily: "'Figtree', sans-serif" }}>{m.profiles.email}</div>
                  )}
                </div>
                <RoleBadge role={m.role} />
                {canRemove && (
                  <button
                    onClick={() => handleRemove(m.user_id)}
                    disabled={removing === m.user_id}
                    title="Remove member"
                    style={{ background: 'none', border: 'none', cursor: removing === m.user_id ? 'default' : 'pointer', color: removing === m.user_id ? '#ddd' : '#ccc', fontSize: 18, lineHeight: 1, padding: '0 0 0 4px', flexShrink: 0 }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Invite form — below the list, owners/admins only */}
      {isAdmin && (
        <div style={{ background: '#fff', border: '1px solid #e6e6e2', borderRadius: 12, padding: '22px 22px' }}>
          <div style={{ ...LBL, marginBottom: 14 }}>Invite Member</div>
          <form onSubmit={sendInvite} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              required
              style={INP}
              onFocus={e => { e.target.style.borderColor = ACCENT; }}
              onBlur={e => { e.target.style.borderColor = '#e0e0dc'; }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                style={{ ...INP, flex: 1, cursor: 'pointer' }}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={sending || !inviteEmail.trim()}
                style={{
                  background: (sending || !inviteEmail.trim()) ? '#ddd' : ACCENT,
                  color: '#fff', border: 'none', borderRadius: 7,
                  padding: '9px 20px', fontFamily: "'Archivo', sans-serif",
                  fontWeight: 700, fontSize: 13,
                  cursor: (sending || !inviteEmail.trim()) ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {sending ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
            {msg && (
              <div style={{ fontSize: 12, color: msg.ok ? '#16a34a' : '#dc2626', padding: '6px 10px', borderRadius: 5, background: msg.ok ? '#f0fdf4' : '#fef2f2', fontFamily: "'Figtree', sans-serif" }}>
                {msg.text}
              </div>
            )}
            <p style={{ fontSize: 11, color: '#aaa', fontFamily: "'Figtree', sans-serif", margin: 0 }}>
              Admins can manage team members and org settings. Members can view and edit projects.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

export default function OrgSettings({ user, org: initialOrg, orgRole, onClose, onOrgUpdated, initialTab = 'settings' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [org, setOrg] = useState(initialOrg);

  const handleOrgUpdated = (updated) => {
    setOrg(updated);
    onOrgUpdated(updated);
  };

  // No org yet — show creation form
  if (!org) {
    return (
      <CreateOrgForm
        user={user}
        onCreated={(newOrg) => { setOrg(newOrg); onOrgUpdated(newOrg); }}
        onClose={onClose}
      />
    );
  }

  const tabs = [
    ['settings', 'Settings'],
    ['members', 'Team Members'],
  ];

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ background: HEADER, height: 56, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 20, lineHeight: 1, padding: '0 4px 0 0' }}>
          ‹
        </button>
        <span style={{ color: ACCENT, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: 2 }}>COSTDECK</span>
        <span style={{ color: '#444', fontSize: 11 }}>·</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <OrgAvatar org={org} size={20} />
          <span style={{ color: '#888', fontFamily: "'Figtree', sans-serif", fontSize: 13 }}>{org.name}</span>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e5e0', display: 'flex', padding: '0 28px' }}>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              padding: '11px 18px', fontSize: 11,
              fontFamily: "'Archivo', sans-serif", fontWeight: 700,
              background: 'transparent', border: 'none',
              color: activeTab === id ? '#222' : '#aaa',
              borderBottom: activeTab === id ? `2px solid ${ACCENT}` : '2px solid transparent',
              cursor: 'pointer', letterSpacing: 1.2, textTransform: 'uppercase',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px' }}>
        {activeTab === 'settings' && (
          <SettingsTab org={org} orgRole={orgRole} onOrgUpdated={handleOrgUpdated} />
        )}
        {activeTab === 'members' && (
          <MembersTab org={org} user={user} orgRole={orgRole} />
        )}
      </div>
    </div>
  );
}
