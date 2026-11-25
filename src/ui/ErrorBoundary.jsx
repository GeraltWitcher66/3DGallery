import { Component } from 'react'
import Fatal from './Fatal'

export default class ErrorBoundary extends Component {
  state = { message: '' }

  static getDerivedStateFromError(error) {
    return { message: error?.message || 'خطای نامشخص' }
  }

  componentDidCatch(error) {
    console.error('gallery error:', error)
    // With a handler the shell can fall back to the 2D view instead of a
    // dead-end error page.
    this.props.onError?.(error)
  }

  render() {
    if (this.state.message) {
      if (this.props.onError) return null
      return (
        <Fatal
          title="نمایش گالری ممکن نشد"
          detail="مرورگر یا کارت گرافیک نتوانست صحنهٔ سه‌بعدی را بسازد."
          onRetry={() => window.location.reload()}
        />
      )
    }
    return this.props.children
  }
}
