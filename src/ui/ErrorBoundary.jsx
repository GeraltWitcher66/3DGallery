import { Component } from 'react'
import Fatal from './Fatal'

export default class ErrorBoundary extends Component {
  state = { message: '' }

  static getDerivedStateFromError(error) {
    return { message: error?.message || 'خطای نامشخص' }
  }

  componentDidCatch(error) {
    console.error('gallery error:', error)
  }

  render() {
    if (this.state.message) {
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
