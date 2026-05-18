import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx' // <--- Make sure this points exactly to your unified App.jsx
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)