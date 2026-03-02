import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./views/Dashboard/LandingPage";
import ProjectSetup from "./views/ProjectSetup/ProjectSetup";
import Editor from "./views/Editor/Editor";

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
