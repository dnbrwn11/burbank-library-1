import { useState, useEffect } from 'react';

const ACCENT = '#B89030';
const HEADER = '#222222';
const BORDER = '#E5E5E0';

function fmt(n) {
  if (!n) return '';
  return `$${Number(n).toLocaleString('en-US')}`;
}

export default function BidSubmitScreen({ token, onDismiss }) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null); // { invitation, package, alreadySubmitted }
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    submitter_name: '', submitter_company: '',
    amount_low: '', amount_mid: '', amount_high: '',
    notes: '', qualifications: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/bid-submissions?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load bid details');
        setInfo(data);
        setForm(f => ({
          ...f,
          submitter_name: data.invitation?.name || '',
          submitter_company: data.invitation?.company || '',
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/bid-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const INPUT = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
    border: `1.5px solid ${BORDER}`, borderRadius: 7,
    fontFamily: "'Figtree', sans-serif", fontSize: 14, outline: 'none',
    background: '#fff',
  };

  const pkg = info?.package;
  const dueFmt = pkg?.due_date
    ? new Date(pkg.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div style={{ minHeight: '100vh', background: '#F9F9F8', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: HEADER, height: 56, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ color: ACCENT, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: 2 }}>
          COSTDECK
        </span>
        {onDismiss && (
          <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: '#888', fontSize: 13, fontFamily: "'Figtree', sans-serif", cursor: 'pointer' }}>
            Back to app →
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,.07)', padding: 40, maxWidth: 560, width: '100%' }}>

          {loading && (
            <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: "'Figtree', sans-serif", color: '#aaa', fontSize: 14 }}>
              Loading bid details…
            </div>
          )}

          {!loading && error && (
            <>
              <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>⚠</div>
              <h2 style={{ margin: '0 0 8px', fontFamily: "'Archivo', sans-serif", fontSize: 20, color: '#333', textAlign: 'center' }}>Invalid invitation</h2>
              <p style={{ margin: 0, fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#888', textAlign: 'center' }}>{error}</p>
            </>
          )}

          {!loading && !error && info?.alreadySubmitted && !submitted && (
            <>
              <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>✓</div>
              <h2 style={{ margin: '0 0 8px', fontFamily: "'Archivo', sans-serif", fontSize: 20, color: '#333', textAlign: 'center' }}>Bid already submitted</h2>
              <p style={{ margin: 0, fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#888', textAlign: 'center' }}>
                A bid has already been submitted for this invitation.
              </p>
            </>
          )}

          {!loading && !error && submitted && (
            <>
              <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16, color: '#16a34a' }}>✓</div>
              <h2 style={{ margin: '0 0 8px', fontFamily: "'Archivo', sans-serif", fontSize: 20, color: '#222', textAlign: 'center' }}>Bid submitted!</h2>
              <p style={{ margin: '0 0 24px', fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#666', textAlign: 'center' }}>
                Your bid for <strong>{pkg?.name}</strong> on <strong>{pkg?.projects?.name}</strong> has been received. The project team will be in touch.
              </p>
            </>
          )}

          {!loading && !error && !info?.alreadySubmitted && !submitted && info && (
            <>
              <h1 style={{ margin: '0 0 6px', fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 22, color: '#111' }}>
                Submit Bid — {pkg?.name}
              </h1>
              <p style={{ margin: '0 0 24px', fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#888' }}>
                Project: <strong>{pkg?.projects?.name}</strong>
                {dueFmt && <span> · Due <strong>{dueFmt}</strong></span>}
              </p>

              {pkg?.scope && (
                <div style={{ background: '#F9F9F8', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
                  <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Scope of Work</div>
                  <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, color: '#333', lineHeight: 1.6 }}>{pkg.scope}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontFamily: "'Figtree', sans-serif", fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={form.submitter_name}
                      onChange={e => setForm(f => ({ ...f, submitter_name: e.target.value }))}
                      placeholder="Jane Smith"
                      style={INPUT}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontFamily: "'Figtree', sans-serif", fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>
                      Company
                    </label>
                    <input
                      type="text"
                      value={form.submitter_company}
                      onChange={e => setForm(f => ({ ...f, submitter_company: e.target.value }))}
                      placeholder="ACME Construction"
                      style={INPUT}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, color: '#555', marginBottom: 10, textTransform: 'uppercase' }}>
                    Bid Amount
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {[['Low', 'amount_low', '#16a34a'], ['Base / Mid', 'amount_mid', '#2563eb'], ['High', 'amount_high', '#d97706']].map(([label, field, color]) => (
                      <div key={field}>
                        <label style={{ display: 'block', fontFamily: "'Figtree', sans-serif", fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>
                          {label}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={form[field]}
                          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                          placeholder="0"
                          style={{ ...INPUT, borderColor: form[field] ? color : BORDER }}
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: '#aaa', marginTop: 6 }}>
                    Enter at least a base/mid bid. Low and high are optional.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: "'Figtree', sans-serif", fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>
                    Notes &amp; Clarifications
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Scope exclusions, assumptions, alternates…"
                    rows={3}
                    style={{ ...INPUT, resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: "'Figtree', sans-serif", fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>
                    Qualifications &amp; Experience
                  </label>
                  <textarea
                    value={form.qualifications}
                    onChange={e => setForm(f => ({ ...f, qualifications: e.target.value }))}
                    placeholder="Relevant experience, certifications, references…"
                    rows={2}
                    style={{ ...INPUT, resize: 'vertical' }}
                  />
                </div>

                {submitError && (
                  <div style={{ fontSize: 13, fontFamily: "'Figtree', sans-serif", color: '#dc2626', padding: '8px 12px', background: '#fef2f2', borderRadius: 6 }}>
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !form.amount_mid}
                  style={{
                    background: submitting || !form.amount_mid ? '#ccc' : ACCENT,
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '13px 28px', fontFamily: "'Archivo', sans-serif",
                    fontWeight: 700, fontSize: 15,
                    cursor: submitting || !form.amount_mid ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Submitting…' : 'Submit Bid'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
