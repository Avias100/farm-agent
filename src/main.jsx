import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✓ Service Worker registered:', registration.scope)
      })
      .catch(err => {
        console.log('✗ Service Worker registration failed:', err)
      })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
