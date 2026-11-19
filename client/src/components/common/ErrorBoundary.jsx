import { Component } from 'react';

/**
 * Last-resort UI guard: if a render throws, show a readable message and a
 * reload action instead of leaving the user with a blank screen.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('Unhandled UI error', error, info);
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 'var(--space-6)' }}>
        <div className="state-block" role="alert">
          <h3>Something went wrong</h3>
          <p>This page hit an unexpected error. Reload to try again.</p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
