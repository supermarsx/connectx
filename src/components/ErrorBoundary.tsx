import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', padding: '32px',
          background: 'linear-gradient(180deg, #FFB6C9 0%, #C9B6FF 100%)',
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{
            maxWidth: '400px', padding: '32px', backgroundColor: '#F3ECFF',
            borderRadius: '20px', border: '3px solid #17171F',
            boxShadow: '6px 6px 0 #17171F', textAlign: 'center',
          }}>
            <h1 style={{
              fontSize: '28px', fontWeight: 800, color: '#FF6FAF',
              fontFamily: "'Poppins', sans-serif", margin: '0 0 12px',
            }}>
              Oops!
            </h1>
            <p style={{ fontSize: '15px', color: '#444457', marginBottom: '8px' }}>
              Something went wrong. Don't worry — your progress is safe.
            </p>
            <p style={{ fontSize: '12px', color: '#9C9CB1', marginBottom: '20px', wordBreak: 'break-word' }}>
              {this.state.error?.message ?? 'Unknown error'}
            </p>
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 28px', borderRadius: '16px',
                border: '2px solid #17171F', backgroundColor: '#FF6FAF',
                color: '#fff', fontWeight: 700, fontSize: '16px',
                cursor: 'pointer', boxShadow: '4px 4px 0 #17171F',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
