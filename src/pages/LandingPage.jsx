import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

function LandingPage() {
  const navigate = useNavigate();
  const { colors } = useTheme();

  const handleSignIn = () => {
    // For now, just navigate to projects page
    // Later: Add actual authentication
    navigate('/projects');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{
        fontSize: '4rem',
        marginBottom: '1rem',
        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
      }}>
        Gridfinity Drawer Maker
      </h1>
      <p style={{
        fontSize: '1.5rem',
        marginBottom: '3rem',
        opacity: 0.9
      }}>
        Design and organize your gridfinity drawer layouts
      </p>
      <button
        onClick={handleSignIn}
        style={{
          padding: '1rem 3rem',
          fontSize: '1.25rem',
          background: 'white',
          color: '#667eea',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
          transition: 'transform 0.2s'
        }}
        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      >
        Sign In
      </button>
    </div>
  );
}

export default LandingPage;
