import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          background: 'rgba(239,68,68,0.1)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AlertCircle size={28} color="#ef4444" />
      </div>
      <div>
        <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>
          Something went wrong
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '300px' }}>
          {message || 'Failed to load data. Please try again.'}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--green)',
            color: '#000',
            border: 'none',
            borderRadius: '99px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--green-light)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--green)'}
        >
          <RefreshCcw size={14} />
          Try Again
        </button>
      )}
    </div>
  );
}
