import './PageStyles.css'

const Settings = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="settings-grid">
        <div className="settings-section">
          <h3>System Settings</h3>
          <div className="settings-item">
            <label>Company Name</label>
            <input type="text" value="Stock Inventory Management Inc." readOnly />
          </div>
          <div className="settings-item">
            <label>Time Zone</label>
            <select>
              <option>UTC+0 (GMT)</option>
              <option>UTC+8 (PHT)</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3>Notifications</h3>
          <div className="settings-item">
            <label>
              <input type="checkbox" defaultChecked />
              Email notifications
            </label>
          </div>
          <div className="settings-item">
            <label>
              <input type="checkbox" defaultChecked />
              Stock alerts
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings