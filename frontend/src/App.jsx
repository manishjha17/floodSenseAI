import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import axios from 'axios'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function App() {
  const getInitialState = () => {
    const savedSession = localStorage.getItem('auth_session')
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession)
        if (parsed.token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${parsed.token}`
        }
        return parsed
      } catch (e) {
        console.error("Failed to parse auth session", e)
      }
    }
    return { isAuthenticated: false, userRole: null, username: null, token: null }
  }

  const initialState = getInitialState()
  const [isAuthenticated, setIsAuthenticated] = useState(initialState.isAuthenticated)
  const [userRole, setUserRole] = useState(initialState.userRole)
  const [username, setUsername] = useState(initialState.username)

  const handleLogin = (role, uname = null, token = null) => {
    setIsAuthenticated(true)
    setUserRole(role)
    setUsername(uname)
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
    localStorage.setItem('auth_session', JSON.stringify({
      isAuthenticated: true,
      userRole: role,
      username: uname,
      token: token
    }))
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUserRole(null)
    setUsername(null)
    delete axios.defaults.headers.common['Authorization']
    localStorage.removeItem(`latest_assessment_${username || 'guest'}`)
    localStorage.removeItem('latest_assessment') // fallback cleanup
    localStorage.removeItem('auth_session')
    sessionStorage.setItem('auto_open_login', 'true')
  }

  return (
    <Router>
      <div className={`relative w-full ${isAuthenticated ? 'h-screen overflow-hidden' : 'min-h-screen overflow-x-hidden'} bg-[#000000] text-gray-100 font-sans`}>
        <div className="relative z-10 h-full w-full">
          <Routes>
            <Route
              path="/login"
              element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" />}
            />
            <Route
              path="/*"
              element={isAuthenticated ? <Dashboard userRole={userRole} username={username} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
