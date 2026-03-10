import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

document.body.style.cssText = 'margin:0;padding:0;background:#08080F;'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
