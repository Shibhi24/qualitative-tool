import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/**
 * main.jsx
 * 
 * Initializes the React application and renders the App component 
 * into the DOM's root element. Uses StrictMode for development checks.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
