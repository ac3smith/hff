import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css' // Ensure this exists or comment it out if not using CSS file

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)