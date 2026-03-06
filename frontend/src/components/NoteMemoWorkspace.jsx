import React, { useState, useEffect } from "react";
import axios from "axios";
import "./NoteMemoWorkspace.css";

function NoteMemoWorkspace({ projectId, codes, segments }) {
  const [memos, setMemos] = useState([]);
  const [activeTab, setActiveTab] = useState("Project");
  const [newMemoTitle, setNewMemoTitle] = useState("");
  const [newMemoContent, setNewMemoContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (projectId) loadMemos();
  }, [projectId]);

  const loadMemos = async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/memos/${projectId}`);
      setMemos(res.data);
    } catch (err) {
      console.error("Error loading memos:", err);
    }
  };

  const handleSaveMemo = async () => {
    if (!newMemoTitle || !newMemoContent) return;
    setIsSaving(true);
    try {
      await axios.post("http://127.0.0.1:8000/memos/", {
        title: newMemoTitle,
        content: newMemoContent,
        project_id: projectId,
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

  // Filter segments/codes that have memos
  const segmentMemos = segments?.filter(s => s.memo) || [];
  const codeMemos = codes?.filter(c => c.description) || [];

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
          Project Memos ({memos.length})
        </button>
        <button 
          className={`memo-tab-btn ${activeTab === "Segments" ? "active" : ""}`}
          onClick={() => setActiveTab("Segments")}
        >
          Segment Memos ({segmentMemos.length})
        </button>
        <button 
          className={`memo-tab-btn ${activeTab === "Codes" ? "active" : ""}`}
          onClick={() => setActiveTab("Codes")}
        >
          Code Descriptions ({codeMemos.length})
        </button>
      </div>

      <div className="memo-content">
        {activeTab === "Project" && (
          <div className="project-memos">
            <div className="memo-editor-card">
              <h3>Create New Analytical Memo</h3>
              <input 
                type="text" 
                placeholder="Memo Title (e.g., Initial Reflections)" 
                value={newMemoTitle}
                onChange={(e) => setNewMemoTitle(e.target.value)}
              />
              <textarea 
                placeholder="Write your thoughts here..." 
                value={newMemoContent}
                onChange={(e) => setNewMemoContent(e.target.value)}
              />
              <button onClick={handleSaveMemo} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Memo"}
              </button>
            </div>

            <div className="memo-list">
              {memos.length === 0 ? (
                <p className="empty-msg">No project memos yet.</p>
              ) : (
                memos.map(memo => (
                  <div key={memo.id} className="memo-card">
                    <div className="memo-card-header">
                      <h4>{memo.title}</h4>
                      <button className="del-btn" onClick={() => handleDeleteMemo(memo.id)}>✕</button>
                    </div>
                    <p>{memo.content}</p>
                    <span className="memo-date">{new Date(memo.created_at).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "Segments" && (
          <div className="memo-list">
            {segmentMemos.length === 0 ? (
              <p className="empty-msg">No coded segments have memos yet.</p>
            ) : (
              segmentMemos.map(s => (
                <div key={s.id} className="memo-card segment-memo">
                  <div className="memo-card-header">
                    <h4>Coded Text: "{s.selected_text.substring(0, 30)}..."</h4>
                  </div>
                  <p className="quoted-text">{s.selected_text}</p>
                  <div className="memo-body">
                    <strong>Memo:</strong> {s.memo}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "Codes" && (
          <div className="memo-list">
            {codeMemos.length === 0 ? (
              <p className="empty-msg">No codes have descriptions yet.</p>
            ) : (
              codeMemos.map(c => (
                <div key={c.id} className="memo-card code-memo">
                  <div className="memo-card-header">
                    <h4>Code: {c.name}</h4>
                    <span className="color-indicator" style={{ background: c.color }}></span>
                  </div>
                  <div className="memo-body">
                    <strong>Definition/Memo:</strong> {c.description}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default NoteMemoWorkspace;
