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
import "./LandingPage.css";

function LandingPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

        <Card title="Sample Projects" />
        <Card title="Documentation" />
      </div>

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