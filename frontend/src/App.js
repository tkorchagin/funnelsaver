import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing.jsx';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import DashboardNew from './components/DashboardNew.jsx';
import ProjectDetail from './components/ProjectDetail.jsx';
import ProjectDetailNew from './components/ProjectDetailNew.jsx';
import PublicProject from './components/PublicProject.jsx';
import PublicProjectNew from './components/PublicProjectNew.jsx';
import { ThemeProvider } from './components/ThemeProvider.jsx';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const handleLogin = (newToken) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    setToken(null);
  };

  return (
    <ThemeProvider defaultTheme="light">
      <Router>
        <div className="App">
          <Routes>
            {/* Landing page - always public */}
            <Route
              path="/"
              element={<Landing />}
            />

            {/* Login & Register */}
            <Route
              path="/login"
              element={token ? <Navigate to="/projects" /> : <Login onLogin={handleLogin} />}
            />
            <Route
              path="/register"
              element={token ? <Navigate to="/projects" /> : <Login onLogin={handleLogin} />}
            />

            {/* Projects - requires auth */}
            <Route
              path="/projects"
              element={token ? <DashboardNew onLogout={handleLogout} token={token} /> : <Navigate to="/login" />}
            />
            <Route
              path="/projects/:id"
              element={token ? <ProjectDetailNew token={token} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />

            {/* Public project view - no auth required */}
            <Route
              path="/public/:id"
              element={<PublicProjectNew />}
            />

            {/* Old routes for backwards compatibility */}
            <Route
              path="/dashboard"
              element={<Navigate to="/projects" />}
            />
            <Route
              path="/dashboard-old"
              element={token ? <Dashboard onLogout={handleLogout} token={token} /> : <Navigate to="/login" />}
            />
            <Route
              path="/project/:id"
              element={<Navigate to={`/projects/${window.location.pathname.split('/').pop()}`} />}
            />
            <Route
              path="/project-old/:id"
              element={token ? <ProjectDetail token={token} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/public-old/:id"
              element={<PublicProject />}
            />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
