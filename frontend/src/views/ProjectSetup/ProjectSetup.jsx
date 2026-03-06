import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProjectSetup.css";

/**
 * ProjectSetup Component
 * 
 * Provides a multi-modal interface for creating a new project.
 * Supports pasting raw text or importing documents (PDF, DOCX, etc.).
 * Handles file extraction and initial project/document persistence.
 */
function ProjectSetup() {
  const navigate = useNavigate();

  const [projectTitle, setProjectTitle] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("English");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [inputMode, setInputMode] = useState("paste");
  const [loading, setLoading] = useState(false);

  /* ===============================
     HANDLE FILE UPLOAD
  =============================== */
  /**
   * Handles file selection for document import.
   * Automatically extracts text from the uploaded file using the backend.
   */
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/documents/extract-text/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setContent(response.data.content);
    } catch (error) {
      console.error(error);
      alert("File processing failed");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     CREATE PROJECT
  =============================== */
  /**
   * Orchestrates the project and document creation process.
   * 1. Creates a new project entry.
   * 2. Associates the extracted/pasted text as a document.
   * 3. Redirects the user to the editor workspace.
   */
  const handleCreateProject = async () => {
    if (!projectTitle.trim()) {
      alert("Project Title is required");
      return;
    }

    if (inputMode === "paste" && !content.trim()) {
      alert("Please paste text content");
      return;
    }

    if (inputMode === "import" && !file) {
      alert("Please upload a file");
      return;
    }

    try {
      setLoading(true);

      // 1️⃣ Create Project
      const projectResponse = await axios.post(
        "http://127.0.0.1:8000/projects/",
        {
          name: projectTitle,
          description: description,
        }
      );

      const createdProject = projectResponse.data;

      // 2️⃣ Create Document
      await axios.post(
        "http://127.0.0.1:8000/documents/",
        {
          title: fileName || projectTitle || "Main Document",
          content: content,
          project_id: createdProject.id,
        }
      );

      // 3️⃣ Navigate to Editor
      navigate(`/editor/${createdProject.id}`);

    } catch (error) {
      console.error("Error creating project:", error);
      alert("Error creating project. Check backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="project-setup-container">

      {/* ===============================
         PROJECT TITLE
      =============================== */}
      <input
        type="text"
        placeholder="Project Title"
        className="project-title"
        value={projectTitle}
        onChange={(e) => setProjectTitle(e.target.value)}
      />

      <div className="project-box">

        {/* ===============================
           INPUT MODE SELECTOR
        =============================== */}
        <div className="input-section">
          <label>Choose Input Method</label>

          <div style={{ display: "flex", gap: "20px", marginTop: "10px" }}>
            <label>
              <input
                type="radio"
                value="paste"
                checked={inputMode === "paste"}
                onChange={() => {
                  setInputMode("paste");
                  setFile(null);
                  setFileName("");
                }}
              />
              &nbsp;Paste Text
            </label>

            <label>
              <input
                type="radio"
                value="import"
                checked={inputMode === "import"}
                onChange={() => {
                  setInputMode("import");
                  setContent("");
                }}
              />
              &nbsp;Import File
            </label>
          </div>
        </div>



        {/* ===============================
           PASTE SECTION
        =============================== */}
        {inputMode === "paste" && (
          <div className="input-section">
            <label>Paste Text</label>
            <textarea
              className="text-input"
              placeholder="Paste your text content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        )}

        {/* ===============================
           IMPORT SECTION
        =============================== */}
        {inputMode === "import" && (
          <div className="input-section">
            <label>Import File</label>

            <div className="file-upload-wrapper">
              <label htmlFor="fileUpload" className="custom-file-button">
                {loading ? "Processing..." : "Browse"}
              </label>

              <input
                type="file"
                id="fileUpload"
                className="file-input-hidden"
                accept=".txt,.doc,.docx,.pdf,.ppt,.pptx"
                onChange={handleFileChange}
              />
            </div>

            {fileName && (
              <p className="file-name">
                Selected File: {fileName}
              </p>
            )}
          </div>
        )}
        {/* ===============================
           DESCRIPTION (Moved Here)
        =============================== */}
        <div className="input-section">
          <label>Description</label>
          <textarea
            className="text-input"
            placeholder="Enter project description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* ===============================
           LANGUAGE
        =============================== */}
        <div className="language-section">
          <span>Language</span>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
            <option>German</option>
          </select>
        </div>

        {/* ===============================
           CREATE BUTTON
        =============================== */}
        <div className="create-button-wrapper">
          <button
            className="create-project-button"
            onClick={handleCreateProject}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Project"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default ProjectSetup;