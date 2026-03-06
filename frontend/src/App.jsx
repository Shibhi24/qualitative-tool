import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./views/Dashboard/LandingPage";
import ProjectSetup from "./views/ProjectSetup/ProjectSetup";
import Editor from "./views/Editor/Editor";

/**
 * App Component
 * 
 * The main entry point for the React application. 
 * Defines the routing structure using react-router-dom.
 * 
 * Routes:
 * - /               : LandingPage (Dashboard)
 * - /new-project    : ProjectSetup (Creating a new project)
 * - /editor/:projectId : Editor (Main workspace for coding and analysis)
 */
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/new-project" element={<ProjectSetup />} />
        <Route path="/editor/:projectId" element={<Editor />} />
      </Routes>
    </Router>
  );
}

export default App;
