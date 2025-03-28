import React from "react"
import { createRoot } from "react-dom/client"
import NProgress from 'nprogress/nprogress'

import "normalize.css"
import './css/nprogress.css'

NProgress.configure({
  showSpinner: false,
  trickle: false
})

import App from './App'

// Prevent transitions from preloading
window.addEventListener('load', () => {
  document.body.classList.remove('preload')

  // Create root and render after window load
  const container = document.getElementById('root')
  const root = createRoot(container)
  root.render(<App />)
})
