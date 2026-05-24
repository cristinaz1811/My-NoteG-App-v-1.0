import React, { useState } from 'react';

const EyeIcon = ({ open }) =>
    open ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );

// Rules used both to score and to show hints
const RULES = [
    { label: '8+ chars',  test: (p) => p.length >= 8 },
    { label: 'Uppercase', test: (p) => /[A-Z]/.test(p) },
    { label: 'Lowercase', test: (p) => /[a-z]/.test(p) },
    { label: 'Number',    test: (p) => /[0-9]/.test(p) },
    { label: 'Symbol',    test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

const LEVELS = [
    { min: 0, max: 0, label: '',            color: '#374151' }, // empty — no label
    { min: 1, max: 1, label: 'Very Weak',   color: '#ef4444' },
    { min: 2, max: 2, label: 'Weak',        color: '#f97316' },
    { min: 3, max: 3, label: 'Fair',        color: '#eab308' },
    { min: 4, max: 4, label: 'Good',        color: '#84cc16' },
    { min: 5, max: 5, label: 'Strong',      color: '#22c55e' },
];

export const getPasswordScore = (password) => {
    if (!password) return 0;
    return RULES.reduce((n, r) => n + (r.test(password) ? 1 : 0), 0);
};

export const PasswordStrengthBar = ({ password }) => {
    if (!password) return null;

    const score = getPasswordScore(password);
    const level = LEVELS[score];
    const pct = (score / 5) * 100;

    return (
        <div className="mt-2 space-y-1.5">
            {/* Bar */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, background: level.color }}
                />
            </div>

            {/* Label + criteria dots */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium transition-colors duration-300" style={{ color: level.color }}>
                    {level.label}
                </span>
                <div className="flex items-center gap-2">
                    {RULES.map((r) => {
                        const passed = r.test(password);
                        return (
                            <span
                                key={r.label}
                                className="text-xs transition-colors duration-200"
                                style={{ color: passed ? level.color : '#4b5563' }}
                                title={r.label}
                            >
                                {passed ? '●' : '○'}
                            </span>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const PasswordInput = React.forwardRef(({
    value,
    onChange,
    placeholder = '••••••••',
    disabled,
    required,
    className = '',
    id,
    name,
    autoComplete,
    minLength,
}, ref) => {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <input
                ref={ref}
                id={id}
                name={name}
                type={visible ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                autoComplete={autoComplete}
                minLength={minLength}
                className={`w-full pr-10 ${className}`}
                style={{ paddingRight: '2.5rem' }}
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                tabIndex={-1}
                aria-label={visible ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer bg-transparent border-none p-0"
            >
                <EyeIcon open={visible} />
            </button>
        </div>
    );
});

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
