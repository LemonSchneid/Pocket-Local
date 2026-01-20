import { Component, type ReactNode } from "react";

import { logError } from "../../utils/logger";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: "Something went wrong. Please reload the app.",
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "Something went wrong. Please reload the app.",
    };
  }

  componentDidCatch(error: Error, info: unknown) {
    logError("ui-render-error", error, { info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="page">
          <h2 className="page__title">Something went wrong</h2>
          <p className="page__status page__status--error" role="alert">
            {this.state.message}
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload app
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
