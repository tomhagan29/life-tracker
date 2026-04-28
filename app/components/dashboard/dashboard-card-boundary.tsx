"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type DashboardCardBoundaryProps = {
  children: ReactNode;
  resetKey: string;
  title: string;
};

type DashboardCardBoundaryState = {
  hasError: boolean;
};

export class DashboardCardBoundary extends Component<
  DashboardCardBoundaryProps,
  DashboardCardBoundaryState
> {
  state: DashboardCardBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): DashboardCardBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Dashboard card failed: ${this.props.title}`, error, errorInfo);
  }

  componentDidUpdate(previousProps: DashboardCardBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="rounded-lg border border-red-100 bg-red-50 p-5 shadow-sm">
          <h3 className="text-xl font-semibold text-red-900">{this.props.title}</h3>
          <p className="mt-3 text-sm font-medium text-red-700">
            This card could not be displayed.
          </p>
        </section>
      );
    }

    return this.props.children;
  }
}
