import { useState, useEffect } from 'react';
import { COLOR, RADIUS, SHADOW, FONT, SPACE, TRANSITION, BADGE_STYLES } from '../data/tokens';

// ── Button — primary | secondary | ghost ─────────────────────────────────────
const BTN_BASE = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: SPACE[2],
  height: 36,
  padding: `0 ${SPACE[5]}px`,
  borderRadius: RADIUS.md,
  fontFamily: FONT.body,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  transition: `background ${TRANSITION.fast}, border-color ${TRANSITION.fast}, transform ${TRANSITION.fast}, box-shadow ${TRANSITION.fast}, color ${TRANSITION.fast}`,
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

const BTN_VARIANT = {
  primary: {
    background: COLOR.gold,
    color: COLOR.white,
    border: 'none',
  },
  secondary: {
    background: COLOR.white,
    color: COLOR.textBody,
    border: `1px solid ${COLOR.border}`,
  },
  ghost: {
    background: 'transparent',
    color: COLOR.textMuted,
    border: 'none',
    padding: `0 ${SPACE[2]}px`,
  },
  danger: {
    background: COLOR.danger,
    color: COLOR.white,
    border: 'none',
  },
};

const BTN_HOVER = {
  primary:   { background: '#9a7826' },
  secondary: { background: '#FAFAF9', borderColor: '#D9D9D5' },
  ghost:     { color: COLOR.gold, textDecoration: 'underline' },
  danger:    { background: '#b03737' },
};

export function Button({
  variant = 'primary', size = 'md', onClick, disabled,
  children, style, icon: Icon, type = 'button', title, ...rest
}) {
  const [hovered, setHovered] = useState(false);
  const v = BTN_VARIANT[variant] || BTN_VARIANT.primary;
  const h = BTN_HOVER[variant] || {};
  const sz = size === 'sm' ? { height: 28, padding: `0 ${SPACE[3]}px`, fontSize: 12 }
           : size === 'lg' ? { height: 44, padding: `0 ${SPACE[6]}px`, fontSize: 15 }
           : {};

  const hoverStyle = hovered && !disabled ? {
    ...h,
    transform: variant === 'ghost' ? 'none' : 'translateY(-1px)',
    boxShadow: variant === 'ghost' ? 'none' : SHADOW.card,
  } : {};

  return (
    <button
      type={type}
      disabled={disabled}
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...BTN_BASE, ...v, ...sz,
        ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
        ...hoverStyle,
        ...style,
      }}
      {...rest}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

// ── Badge — status pill (one consistent style) ───────────────────────────────
export function Badge({ tone = 'draft', children, style }) {
  const t = BADGE_STYLES[tone] || BADGE_STYLES.draft;
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: FONT.body,
      fontSize: 11,
      fontWeight: 500,
      padding: '3px 8px',
      borderRadius: RADIUS.xs,
      background: t.bg,
      color: t.color,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {children}
    </span>
  );
}

// ── Card — white, consistent padding, hover shadow ───────────────────────────
export function Card({ children, style, padded = true, hoverable = false, accent, onClick }) {
  const [hovered, setHovered] = useState(false);
  const accentStyle = accent ? {
    borderLeft: `3px solid ${accent}`,
    paddingLeft: padded ? SPACE[5] - 3 : 0,
  } : {};
  return (
    <div
      onMouseEnter={() => hoverable && setHovered(true)}
      onMouseLeave={() => hoverable && setHovered(false)}
      onClick={onClick}
      style={{
        background: COLOR.card,
        border: `1px solid ${COLOR.border}`,
        borderRadius: RADIUS.lg,
        padding: padded ? SPACE[5] : 0,
        transition: `box-shadow ${TRANSITION.fast}, border-color ${TRANSITION.fast}`,
        boxShadow: hoverable && hovered ? SHADOW.card : 'none',
        cursor: onClick ? 'pointer' : 'default',
        ...accentStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Input, Textarea, Select ──────────────────────────────────────────────────
const INPUT_BASE = {
  width: '100%',
  height: 40,
  padding: `0 ${SPACE[3]}px`,
  border: `1px solid ${COLOR.border}`,
  borderRadius: RADIUS.md,
  background: COLOR.white,
  fontFamily: FONT.body,
  fontSize: 14,
  color: COLOR.text,
  outline: 'none',
  transition: `border-color ${TRANSITION.fast}, box-shadow ${TRANSITION.fast}`,
  boxSizing: 'border-box',
};

const inputFocus = (e) => {
  e.target.style.borderColor = COLOR.gold;
  e.target.style.boxShadow = `0 0 0 2px rgba(184,144,48,0.15)`;
};
const inputBlur = (e) => {
  e.target.style.borderColor = COLOR.border;
  e.target.style.boxShadow = 'none';
};

export function Input({ style, ...props }) {
  return <input {...props} style={{ ...INPUT_BASE, ...style }} onFocus={inputFocus} onBlur={inputBlur} />;
}

export function Textarea({ style, rows = 3, ...props }) {
  return (
    <textarea
      {...props}
      rows={rows}
      onFocus={inputFocus}
      onBlur={inputBlur}
      style={{
        ...INPUT_BASE,
        height: 'auto',
        minHeight: 80,
        padding: SPACE[3],
        resize: 'vertical',
        lineHeight: 1.5,
        ...style,
      }}
    />
  );
}

export function Select({ style, children, ...props }) {
  return (
    <select
      {...props}
      onFocus={inputFocus}
      onBlur={inputBlur}
      style={{
        ...INPUT_BASE,
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg viewBox=\'0 0 12 12\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3 4.5L6 7.5L9 4.5\' stroke=\'%23888\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `right ${SPACE[3]}px center`,
        paddingRight: SPACE[8],
        ...style,
      }}
    >
      {children}
    </select>
  );
}

// ── FieldLabel — Figtree 12 medium uppercase muted ───────────────────────────
export function FieldLabel({ children, style }) {
  return (
    <label style={{
      display: 'block',
      fontFamily: FONT.body,
      fontSize: 12,
      fontWeight: 500,
      color: COLOR.textLabel,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: SPACE[1] + 2,
      ...style,
    }}>
      {children}
    </label>
  );
}

// ── Skeleton — pulse animation ────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('cd-skel-keyframes')) {
  const s = document.createElement('style');
  s.id = 'cd-skel-keyframes';
  s.textContent = `
    @keyframes cd-skel-pulse { 0%, 100% { opacity: 0.4 } 50% { opacity: 1 } }
  `;
  document.head.appendChild(s);
}

export function Skeleton({ width = '100%', height = 12, radius = 4, style }) {
  return (
    <div style={{
      width, height,
      borderRadius: radius,
      background: '#EEEEEA',
      animation: 'cd-skel-pulse 1.5s ease-in-out infinite',
      ...style,
    }} />
  );
}

// ── EmptyState — centered, icon + text + action ──────────────────────────────
export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: `${SPACE[10]}px ${SPACE[6]}px`,
      background: COLOR.card,
      border: `1px solid ${COLOR.border}`,
      borderRadius: RADIUS.lg,
    }}>
      {Icon && (
        <div style={{ marginBottom: SPACE[4], display: 'flex', justifyContent: 'center' }}>
          <Icon size={24} color={COLOR.textFaint} strokeWidth={1.5} />
        </div>
      )}
      {title && (
        <div style={{
          fontFamily: FONT.body, fontSize: 14, fontWeight: 500,
          color: COLOR.textMuted, marginBottom: action ? SPACE[5] : 0, lineHeight: 1.5,
        }}>
          {title}
        </div>
      )}
      {body && (
        <div style={{
          fontFamily: FONT.body, fontSize: 13, color: COLOR.textMuted,
          marginBottom: action ? SPACE[5] : 0, lineHeight: 1.6, maxWidth: 420, margin: `0 auto ${action ? SPACE[5] : 0}px`,
        }}>
          {body}
        </div>
      )}
      {action}
    </div>
  );
}

// ── Modal — consistent header/body/footer shell ──────────────────────────────
export function Modal({ open, onClose, title, children, footer, width = 560 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: SPACE[5],
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLOR.white,
          borderRadius: RADIUS.xl,
          boxShadow: SHADOW.modal,
          width: '100%', maxWidth: width,
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {title && (
          <div style={{
            padding: SPACE[5],
            borderBottom: `1px solid ${COLOR.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontFamily: FONT.heading, fontWeight: 600, fontSize: 18, color: COLOR.text }}>
              {title}
            </div>
            <CloseButton onClick={onClose} />
          </div>
        )}
        <div style={{ padding: SPACE[6], overflowY: 'auto' }}>
          {children}
        </div>
        {footer && (
          <div style={{
            padding: SPACE[5],
            borderTop: `1px solid ${COLOR.border}`,
            display: 'flex', justifyContent: 'flex-end', gap: SPACE[2],
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function CloseButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Close"
      style={{
        width: 32, height: 32,
        borderRadius: '50%',
        background: hovered ? COLOR.altBg : 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: COLOR.textMuted,
        fontSize: 18, lineHeight: 1,
        transition: `background ${TRANSITION.fast}`,
      }}
    >
      ×
    </button>
  );
}
