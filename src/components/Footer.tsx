import './Footer.css'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <div className="copyright">
            <p>&copy; {currentYear} Stock Inventory Management. All rights reserved.</p>
          </div>
          
          <div className="footer-meta">
            <div className="system-status">
              <span className="status-indicator"></span>
              <span className="status-text">All systems operational</span>
            </div>
            
            <div className="version-info">
              <span className="version">v2.1.0</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer