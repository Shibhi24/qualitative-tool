from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import pandas as pd
import spacy
from spacy import displacy
import os
import tempfile
from typing import List

from app.database import get_db
from app.models.project import Project
from app.models.document import Document
from app.models.segment import Segment
from app.models.code import Code
from app.models.memo import Memo as MemoModel

router = APIRouter(prefix="/export", tags=["Export"])

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

@router.get("/excel/{project_id}")
def export_excel_report(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 1. Segments Data
    segments = db.query(Segment).join(Document).filter(Document.project_id == project_id).all()
    seg_data = []
    for s in segments:
        codes_list = ", ".join([c.name for c in s.codes])
        seg_data.append({
            "Document": s.document.title,
            "Text": s.selected_text,
            "Codes": codes_list,
            "Sentiment": s.sentiment_label,
            "Score": s.sentiment_score,
            "Memo": s.memo
        })
    df_segments = pd.DataFrame(seg_data)

    # 2. Codes Data
    codes = db.query(Code).filter(Code.project_id == project_id).all()
    code_data = [{"Name": c.name, "Color": c.color, "Description": c.description} for c in codes]
    df_codes = pd.DataFrame(code_data)

    # 3. Memos Data
    memos = db.query(MemoModel).filter(MemoModel.project_id == project_id).all()
    memo_data = [{"Title": m.title, "Content": m.content, "Created At": m.created_at} for m in memos]
    df_memos = pd.DataFrame(memo_data)

    # 4. Entities Data (spaCy powered)
    documents = db.query(Document).filter(Document.project_id == project_id).all()
    entity_data = []
    for doc in documents:
        spacy_doc = nlp(doc.content[:100000]) # Limit length for safety
        for ent in spacy_doc.ents:
            entity_data.append({
                "Document": doc.title,
                "Entity": ent.text,
                "Label": ent.label_,
                "Start": ent.start_char,
                "End": ent.end_char
            })
    df_entities = pd.DataFrame(entity_data)

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
    with pd.ExcelWriter(temp_file.name, engine="xlsxwriter") as writer:
        df_segments.to_excel(writer, sheet_name="Segments", index=False)
        df_codes.to_excel(writer, sheet_name="Codes", index=False)
        df_memos.to_excel(writer, sheet_name="Memos", index=False)
        df_entities.to_excel(writer, sheet_name="Entities", index=False)

    return FileResponse(temp_file.name, filename=f"Project_{project.name}_Report.xlsx")

@router.get("/html/{project_id}")
def export_html_report(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    documents = db.query(Document).filter(Document.project_id == project_id).all()
    
    html_content = f"<html><head><title>{project.name} Report</title><style>body{{font-family:sans-serif; padding:40px;}} .doc-block{{margin-bottom:60px;}}</style></head><body>"
    html_content += f"<h1>Qualitative Analysis Report: {project.name}</h1>"
    html_content += f"<p>{project.description}</p><hr/>"

    for doc in documents:
        html_content += f"<div class='doc-block'><h2>Document: {doc.title}</h2>"
        spacy_doc = nlp(doc.content[:10000]) # Sample for visualization
        # Use displacy to generate colored entity tags
        svg = displacy.render(spacy_doc, style="ent", page=True)
        html_content += svg
        html_content += "</div>"

    html_content += "</body></html>"
    
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".html", mode='w', encoding='utf-8')
    temp_file.write(html_content)
    temp_file.close()

    return FileResponse(temp_file.name, filename=f"Project_{project.name}_Summary.html")

@router.get("/text/{project_id}")
def export_text_summary(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    documents = db.query(Document).filter(Document.project_id == project_id).all()
    text_content = f"PROJECT SUMMARY: {project.name}\n"
    text_content += "="*40 + "\n\n"
    
    for doc in documents:
        text_content += f"DOCUMENT: {doc.title}\n"
        text_content += "-"*20 + "\n"
        text_content += doc.content + "\n\n"

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".txt", mode='w', encoding='utf-8')
    temp_file.write(text_content)
    temp_file.close()

    return FileResponse(temp_file.name, filename=f"Project_{project.name}_FullText.txt")
