import React from 'react';

export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div
        className={`${sizes[size]} rounded-full border-[#3a3a4a] border-t-[#1DB954] spin`}
        style={{ borderWidth: size === 'lg' ? '3px' : '2px' }}
      />
      {text && (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{text}</p>
      )}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: '12px',
        overflow: 'hidden',
        padding: '12px',
      }}
    >
      <div className="skeleton" style={{ height: '160px', borderRadius: '8px', marginBottom: '12px' }} />
      <div className="skeleton" style={{ height: '14px', width: '80%', marginBottom: '8px' }} />
      <div className="skeleton" style={{ height: '12px', width: '60%' }} />
    </div>
  );
}
