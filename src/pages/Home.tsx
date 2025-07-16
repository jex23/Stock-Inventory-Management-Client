import './Home.css'

const Home = () => {
  return (
    <div className="home-container">
      <div className="welcome-section">
        <h2 className="welcome-title">Welcome to your Dashboard!</h2>
        <p className="welcome-text">
          You have successfully logged in. This is your home page where you can access all your features.
        </p>
      </div>

      <div className="cards-grid">
        <div className="feature-card">
          <div className="card-icon">📊</div>
          <h3>Analytics</h3>
          <p>View your data and insights</p>
        </div>

        <div className="feature-card">
          <div className="card-icon">👥</div>
          <h3>Users</h3>
          <p>Manage user accounts</p>
        </div>

        <div className="feature-card">
          <div className="card-icon">⚙️</div>
          <h3>Settings</h3>
          <p>Configure your preferences</p>
        </div>

        <div className="feature-card">
          <div className="card-icon">📱</div>
          <h3>Messages</h3>
          <p>Check your notifications</p>
        </div>
      </div>

      <div className="stats-section">
        <h3>Quick Stats</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number">1,234</span>
            <span className="stat-label">Total Users</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">56</span>
            <span className="stat-label">Active Sessions</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">89%</span>
            <span className="stat-label">Success Rate</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home