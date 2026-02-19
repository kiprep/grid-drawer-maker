import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';
import ProjectsPage from './pages/ProjectsPage';
import BinPlacerPage from './pages/BinPlacerPage';
import PrintQueuePage from './pages/PrintQueuePage';
import ExportPage from './pages/ExportPage';
// ChecklistPage deprecated — functionality moved to PrintQueuePage
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/project/:projectId/placer" element={<BinPlacerPage />} />
          <Route path="/project/:projectId/print-queue" element={<PrintQueuePage />} />
          <Route path="/project/:projectId/export" element={<ExportPage />} />
          <Route path="/project/:projectId/checklist" element={<Navigate to="../print-queue" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
