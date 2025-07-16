import './PageStyles.css'

const Help = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Help & Support</h1>
      </div>

      <div className="help-grid">
        <div className="help-section">
          <h3>Quick Links</h3>
          <ul className="help-links">
            <li><a href="#">User Manual</a></li>
            <li><a href="#">Video Tutorials</a></li>
            <li><a href="#">FAQ</a></li>
            <li><a href="#">Contact Support</a></li>
          </ul>
        </div>

        <div className="help-section">
          <h3>Contact Information</h3>
          <div className="contact-info">
            <p><strong>Email:</strong> support@Stock Inventory Management.com</p>
            <p><strong>Phone:</strong> +1 (555) 123-4567</p>
            <p><strong>Hours:</strong> Monday - Friday, 9 AM - 5 PM</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Help