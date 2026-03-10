import React, { useState, useEffect } from "react";
import axios from "axios";
import "./NoteMemoWorkspace.css";

function NoteMemoWorkspace({ projectId, codes = [] }) {

  const [memos, setMemos] = useState([]);
  const [activeTab, setActiveTab] = useState("Project");
  const [newMemoTitle, setNewMemoTitle] = useState("");
  const [newMemoContent, setNewMemoContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [codeMemos, setCodeMemos] = useState([]);

  useEffect(() => {
    if (projectId) loadMemos();
  }, [projectId]);

  useEffect(() => {
    if (codes && codes.length > 0) {
      setCodeMemos(codes.filter(c => c.description));
    } else {
      setCodeMemos([]);
    }
  }, [codes]);

  const loadMemos = async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/memos/${projectId}`);
      setMemos(res.data);
    } catch (err) {
      console.error("Error loading memos:", err);
    }
  };

  const handleSaveMemo = async (segmentId = null) => {
    if (!newMemoTitle || !newMemoContent) return;

    setIsSaving(true);

    try {
      await axios.post("http://127.0.0.1:8000/memos/", {
        title: newMemoTitle,
        content: newMemoContent,
        project_id: projectId,
        segment_id: segmentId,
      });

      setNewMemoTitle("");
      setNewMemoContent("");
      loadMemos();

    } catch (err) {
      console.error("Error saving memo:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMemo = async (id) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/memos/${id}`);
      loadMemos();
    } catch (err) {
      console.error("Error deleting memo:", err);
    }
  };

  /* MEMO FILTERING */
  const projectOnlyMemos = memos.filter(m => m.segment_id === null);
  const segmentOnlyMemos = memos.filter(m => m.segment_id !== null);

  return (
    <div className="memo-workspace">

      <div className="memo-header">
        <h1>Note & Memo Hub</h1>
        <p>Document your analytical journey and record theoretical insights.</p>
      </div>

      <div className="memo-tabs">
        <button
          className={`memo-tab-btn ${activeTab === "Project" ? "active" : ""}`}
          onClick={() => setActiveTab("Project")}
        >
          Project Memos ({projectOnlyMemos.length})
        </button>

        <button
          className={`memo-tab-btn ${activeTab === "Segments" ? "active" : ""}`}
          onClick={() => setActiveTab("Segments")}
        >
          Segment Memos ({segmentOnlyMemos.length})
        </button>

       
      </div>

      <div className="memo-content">

        {activeTab === "Project" && (
          <div className="project-memos">

            <div className="memo-editor-card">
              <h3>Create New Analytical Memo</h3>

              <input
                type="text"
                placeholder="Title..."
                value={newMemoTitle}
                onChange={(e) => setNewMemoTitle(e.target.value)}
              />

              <textarea
                placeholder="Write thoughts..."
                value={newMemoContent}
                onChange={(e) => setNewMemoContent(e.target.value)}
              />

              <button
                onClick={() => handleSaveMemo(null)}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Memo"}
              </button>

            </div>

            <div className="memo-list">

              {projectOnlyMemos.map(memo => (
                <div key={memo.id} className="memo-card">

                  <div className="memo-card-header">
                    <h4>{memo.title}</h4>
                    <button
                      className="del-btn"
                      onClick={() => handleDeleteMemo(memo.id)}
                    >
                      ✕
                    </button>
                  </div>

                  <p>{memo.content}</p>

                  <span className="memo-date">
                    {new Date(memo.created_at).toLocaleDateString()}
                  </span>

                </div>
              ))}

            </div>

          </div>
        )}

        {activeTab === "Segments" && (

          <div className="memo-list">

            {segmentOnlyMemos.map(memo => (

              <div key={memo.id} className="memo-card segment-memo">

                <div className="memo-card-header">
                  <h4>{memo.title}</h4>
                  <button
                    className="del-btn"
                    onClick={() => handleDeleteMemo(memo.id)}
                  >
                    ✕
                  </button>
                </div>

                {memo.segment && (
                  <div className="memo-quote-context">

                    <small>CODED TEXT:</small>

                    <blockquote>
                      "{memo.segment.selected_text}"
                    </blockquote>

                  </div>
                )}

                <p>{memo.content}</p>

                <span className="memo-date">
                  Ref ID: #{memo.segment_id} •
                  {new Date(memo.created_at).toLocaleDateString()}
                </span>

              </div>

            ))}

          </div>

        )}

        {activeTab === "Codes" && (

          <div className="memo-list">

            {codeMemos.map(c => (

              <div key={c.id} className="memo-card code-memo">

                <div className="memo-card-header">
                  <h4>Code: {c.name}</h4>

                  <span
                    className="color-indicator"
                    style={{ background: c.color }}
                  ></span>

                </div>

                <div className="memo-body">
                  <strong>Definition:</strong> {c.description}
                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}

export default NoteMemoWorkspace;