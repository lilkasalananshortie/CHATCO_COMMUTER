import React, { Component, type ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { MascotMessage } from "./MascotMessage";

/** Render failures only: API errors remain handled by their screen and retry action. */
export class MascotErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 };

  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (this.state.failed) {
      return (
        <ScrollView contentContainerStyle={styles.fallback}>
          <MascotMessage
            pose="not-found"
            title="Let's try that again"
            message="This screen couldn't open. Your saved account and ride data haven't been cleared."
            onRetry={() => this.setState(({ attempt }) => ({ failed: false, attempt: attempt + 1 }))}
          />
        </ScrollView>
      );
    }
    return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
  }
}

const styles = StyleSheet.create({
  fallback: { flexGrow: 1, justifyContent: "center", padding: 24, backgroundColor: "#050F1A" },
});
