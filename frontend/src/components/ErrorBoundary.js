import React from 'react';

// Catches render-time errors anywhere below it and shows a recovery screen
// instead of an unmounted (blank) app.
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    className="min-h-screen flex items-center justify-center p-6"
                    style={{ background: 'var(--bg-color)' }}
                >
                    <div className="surface-card rounded-2xl p-10 max-w-md text-center">
                        <h1
                            className="text-2xl font-bold mb-3"
                            style={{ color: 'var(--text-color)' }}
                        >
                            Something went wrong
                        </h1>
                        <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
                            An unexpected error occurred. Try reloading the page.
                        </p>
                        <button
                            onClick={() => window.location.assign('/')}
                            className="px-6 py-3 rounded-xl font-semibold gradient-bg text-white border-none cursor-pointer"
                        >
                            Reload
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
