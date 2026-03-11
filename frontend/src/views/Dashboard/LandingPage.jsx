/**
 * LandingPage Component (Function-Based)
 *
 * The main dashboard / home screen of the application.
 * Displays navigation cards for creating new projects, viewing
 * recent projects (with search/filter), sample projects, and docs.
 * Fetches existing projects from the backend on mount.
 */
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import Card from "../../components/Card";
import ExternalVideo from "../../components/ExternalVideo"; // Import our video component
import "./LandingPage.css";

function LandingPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDocs, setShowDocs] = useState(false);
  const [isCreatingSample, setIsCreatingSample] = useState(false);

  // Fetches existing projects from the backend on component mount.
  useEffect(() => {
    axios
      .get("http://127.0.0.1:8000/projects/")
      .then((response) => {
        setProjects(response.data.reverse()); // Show newest projects first
      })
      .catch((error) => {
        console.error("Error fetching projects:", error);
      });
  }, []);

  // Filters the list of projects based on the search input.
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSample = () => {
    setIsCreatingSample(true);
    axios.post("http://127.0.0.1:8000/projects/sample")
      .then(response => {
        setIsCreatingSample(false);
        navigate(`/editor/${response.data.id}`);
      })
      .catch(error => {
        console.error("Error creating sample:", error);
        alert("Failed to create sample project.");
        setIsCreatingSample(false);
      });
  };

  return (
    <div className="dashboard">
      <h2>Qualitative Tool</h2>

      <div className="card-grid">
        <Card
          title="New Project"
          onClick={() => navigate("/new-project")}
        />

        <Card
          title="Recent Projects"
          onClick={() => setIsOpen(!isOpen)}
        />

        <Card 
          title={isCreatingSample ? "Creating..." : "Sample Projects"} 
          onClick={handleCreateSample} 
        />
        <Card title="Documentation" onClick={() => setShowDocs(true)} />
      </div>

      {/* Basic Documentation Modal */}
      {showDocs && (
        <div className="docs-modal-overlay">
          <div className="docs-modal-content">
            <button className="close-docs-btn" onClick={() => setShowDocs(false)}>×</button>
            <h3>Quick Start Guide</h3>
            <h3>Tutorial Video</h3>
            {/* Local Video Section */}
            <div className="docs-video-container">
              <ExternalVideo />
            </div>
            

            <p>Welcome to the <strong>Qualitative Analysis Tool</strong>!</p>
            <ul>
              <li><strong>Documents:</strong> Upload text files to begin your analysis.</li>
              <li><strong>Codes:</strong> Highlight text in the editor and apply thematic tags (codes).</li>
              <li><strong>Sentiment:</strong> Automatically classify emotions (Positive/Negative/Neutral).</li>
              <li><strong>Memos:</strong> Write reflective notes and link them to your project.</li>
              <li><strong>Export:</strong> Download HTML presentations or Excel spreadsheets.</li>
            </ul>
            <p className="docs-footer">For full deployment details, refer to the <code>README.md</code> in the repository root.</p>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="recent-projects-dropdown">
          <input
            type="text"
            placeholder="Search project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          {filteredProjects.length === 0 ? (
            <p className="no-project">No projects found</p>
          ) : (
            filteredProjects.map((project) => (
              <div
                key={project.id}
                className="project-item"
                onClick={() => navigate(`/editor/${project.id}`)}
              >
                <strong>{project.name}</strong>
                <p>{project.description}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default LandingPage;