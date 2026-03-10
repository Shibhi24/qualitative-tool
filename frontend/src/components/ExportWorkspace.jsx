import React, { useState } from "react";
import axios from "axios";
import "./ExportWorkspace.css";

function ExportWorkspace({ projectId }) {
  const [isExporting, setIsExporting] = useState(false);
  const [activeExport, setActiveExport] = useState(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const handleDownload = async (format) => {
    setIsExporting(true);
    setActiveExport(format);
    
    try {
      // For HTML format, FIRST run sentiment analysis to ensure data exists
      if (format === 'html') {
        try {
          console.log("Running sentiment analysis for project", projectId);
          await axios.post(`http://127.0.0.1:8000/analysis/sentiment/analyze-project/${projectId}`);
          console.log("Sentiment analysis completed successfully");
        } catch (analysisErr) {
          // If it fails, maybe it's already analyzed or no documents
          console.log("Note: Analysis may have already been run:", analysisErr);
          // Continue with download anyway
        }
      }
      
      // THEN download the report
      const endpoints = {
        excel: `http://127.0.0.1:8000/export/excel/${projectId}`,
        html: `http://127.0.0.1:8000/export/html/${projectId}`,
        text: `http://127.0.0.1:8000/export/text/${projectId}`,
      };

      const response = await axios.get(endpoints[format], {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      const filenames = {
        excel: "Project_Report.xlsx",
        html: "Project_Summary.html",
        text: "Project_FullText.txt",
      };

      link.setAttribute("download", filenames[format]);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Please check the backend connection.");
    } finally {
      setIsExporting(false);
      setActiveExport(null);
    }
  };

  // Optional: Add a separate button to prepare the report
  const prepareReport = async () => {
    setIsPreparing(true);
    try {
      await axios.post(`http://127.0.0.1:8000/analysis/sentiment/analyze-project/${projectId}`);
      alert("Report prepared! Sentiment analysis is now complete. You can download the HTML report.");
    } catch (err) {
      console.error("Preparation failed:", err);
      alert("Failed to prepare report. The project might have no documents.");
    } finally {
      setIsPreparing(false);
    }
  };

  const exportOptions = [
    {
      id: "excel",
      title: "Full Excel Report",
      icon: "📊",
      desc: "Comprehensive multi-sheet report with segments, codes, memos, entities, sentiment stats, and thematic crosstabs.",
      color: "#166534"
    },
    {
      id: "html",
      title: "Rich HTML Summary",
      icon: "🌐",
      desc: "Interactive visual report including spaCy entity visualizations and analysis highlights.",
      color: "#1e3a8a"
    },
    {
      id: "text",
      title: "Plain Text Dump",
      icon: "📄",
      desc: "Simple text format optimized for Word, focusing on raw content and basic organization.",
      color: "#334155"
    }
  ];

  return (
    <div className="export-workspace">
      <div className="export-header">
        <h1>Export & Data Portability</h1>
        <p>Finalize your research by moving your data into standard formats for presentation or further analysis.</p>
      </div>

      {/* Optional: Add a prepare button */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={prepareReport}
          disabled={isPreparing}
          style={{
            backgroundColor: "#059669",
            color: "white",
            padding: "12px 24px",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            width: "100%"
          }}
        >
          {isPreparing ? "⏳ Preparing Report..." : "🔄 Prepare Report with Sentiment Data"}
        </button>
        <p style={{ fontSize: "12px", color: "#666", marginTop: "5px", textAlign: "center" }}>
          Run this first to ensure sentiment data is included in your HTML export
        </p>
      </div>

      <div className="export-grid">
        {exportOptions.map((opt) => (
          <div key={opt.id} className="export-card">
            <div className="export-icon" style={{ color: opt.color }}>{opt.icon}</div>
            <div className="export-info">
              <h3>{opt.title}</h3>
              <p>{opt.desc}</p>
            </div>
            <button
              className="export-btn"
              style={{ backgroundColor: opt.color }}
              onClick={() => handleDownload(opt.id)}
              disabled={isExporting}
            >
              {isExporting && activeExport === opt.id ? "⏳ Exporting..." : "↓ Download"}
            </button>
          </div>
        ))}
      </div>

      <div className="export-info-block">
        <h3>💡 Why Export?</h3>
        <ul>
          <li><strong>Sharing:</strong> Share structured reports with colleagues or stakeholders.</li>
          <li><strong>Further Analysis:</strong> Use Excel for complex quantitative tallies.</li>
          <li><strong>Presentation:</strong> Include HTML visualizations directly in slide decks.</li>
          <li><strong>Portability:</strong> Move your coding data between specialized analysis tools.</li>
        </ul>
      </div>
    </div>
  );
}

export default ExportWorkspace;