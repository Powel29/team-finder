import { Component } from 'react';
import { ErrorState } from '@/components/ui';

/** Last line of defence: a render crash shows a retry card instead of a blank page. */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <ErrorState
          error={this.state.error}
          title="Something broke on this page"
          onRetry={() => window.location.reload()}
        />
      </main>
    );
  }
}
