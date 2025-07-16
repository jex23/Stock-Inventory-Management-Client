import './PageStyles.css'

const Dispatching = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Dispatching</h1>
        <button className="primary-btn">+ Schedule Dispatch</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🚚</div>
          <div className="stat-content">
            <h3>Pending Dispatches</h3>
            <p className="stat-number">15</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Completed Today</h3>
            <p className="stat-number">28</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <h3>Avg. Delivery Time</h3>
            <p className="stat-number">2.4 days</p>
          </div>
        </div>
      </div>

      <div className="content-section">
        <h2>Recent Dispatches</h2>
        <div className="placeholder-content">
          <p>Dispatch management system coming soon...</p>
        </div>
      </div>
    </div>
  )
}

export default Dispatching