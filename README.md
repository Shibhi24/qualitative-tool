# Qualitative Analysis Tool

This project is a full-stack web application created to help qualitative researchers analyze textual data more efficiently. The tool allows users to upload documents, highlight important text segments, apply thematic codes, perform automated sentiment analysis, write analytical memos, and export results as structured reports.

The system is built using a **React (Vite)** frontend and a **FastAPI (Python)** backend, with **MySQL** used as the database for storing projects, documents, codes, segments, and analysis results.

---

# Prerequisites

Before running the application, make sure the following software is installed on your system:

1. **Node.js (v16 or higher)** – required to run the frontend application.
2. **Python (v3.10 or higher)** – required for the backend server.
3. **MySQL Server** – used for storing project data and analysis results.
4. **Git (optional)** – helpful if you are cloning the repository from a version control platform.

---

# 1. Database Setup (MySQL)

The backend requires a running MySQL server to store project data.

1. Open your MySQL client or command line interface.
2. Create a new database for the project by running the following command:

```sql
CREATE DATABASE qualitative_tool;
```

3. After creating the database, update the database connection settings in the backend configuration file.

Open the file:

```
backend/app/database.py
```

Modify the `DATABASE_URL` so it matches your local MySQL credentials. For example:

```python
# Format: mysql+pymysql://<username>:<password>@<host>:<port>/<database_name>
DATABASE_URL = "mysql+pymysql://root:YourPassword@localhost:3306/qualitative_tool"
```

Make sure to replace `YourPassword` with the password for your MySQL root user or whichever database user you are using.

---

# 2. Backend Setup (FastAPI)

The backend is built using the FastAPI framework and runs on Python.

### Step 1 – Navigate to the backend folder

Open a terminal and go to the backend directory:

```bash
cd f:\qualitative-tool-bkd\backend
```

### Step 2 – Create a virtual environment (recommended)

Creating a virtual environment keeps project dependencies isolated from other Python projects.

```bash
python -m venv venv
```

Activate the environment:

**Windows**

```bash
venv\Scripts\activate
```

Once activated, your terminal should show `(venv)` at the beginning of the command line.

### Step 3 – Install required dependencies

Install all required Python libraries using the requirements file:

```bash
pip install -r requirements.txt
```

### Step 4 – Download the NLP model

The project uses **spaCy** for natural language processing tasks such as Named Entity Recognition (NER).
Download the required model using the following command:

```bash
python -m spacy download en_core_web_sm
```

---

# Running the Backend Server

After completing the setup, start the FastAPI server using **uvicorn**:

```bash
python -m uvicorn app.main:app --reload
```

Once the server starts successfully:

* Backend API will run at
  **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

* Interactive API documentation (Swagger UI) is available at
  **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

This interface allows you to test backend API endpoints directly from your browser.

---

# 3. Frontend Setup (React + Vite)

The frontend user interface is developed using **React** and bundled with **Vite**.

### Step 1 – Open a new terminal

Navigate to the frontend directory:

```bash
cd f:\qualitative-tool-bkd\frontend
```

### Step 2 – Install frontend dependencies

Run the following command to install all required Node.js packages:

```bash
npm install
```

---

# Running the Frontend Server

Start the development server using Vite:

```bash
npm run dev
```

Once the server starts, the terminal will display a local URL such as:

```
http://localhost:5173
```

Open this link in your browser to access the application interface.

---

# Features and Usage

### Project Initialization

Users can start by creating a new research project and defining the overall objective of their qualitative study.

### Document Management

Researchers can upload plain text documents that will serve as the data source for qualitative analysis.

### Coding and Tagging Workspace

Users can highlight sections of text within a document and assign thematic **codes** to them.
Codes can include custom names, descriptions, and colors for easy identification.

### Sentiment Analysis

The tool includes a sentiment workspace where sentences in the document can be automatically classified as:

* Positive
* Negative
* Neutral

These sentiment results are visually displayed within the document to support analytical interpretation.

### Memo Writing

Researchers can write reflective memos to capture insights, interpretations, and emerging themes during the analysis process.

### Exporting Reports

The system allows users to export their analysis results in two formats:

* **Interactive HTML presentation**
* **Excel spreadsheet**

The exported reports include:

* coded segments
* extracted entities
* sentiment statistics
* document insights

---

# Troubleshooting

### CORS Errors

If the frontend cannot communicate with the backend, ensure:

* the backend server is running
* CORS is correctly configured in:

```
backend/app/main.py
```

### Database Connection Refused

If the backend cannot connect to MySQL:

* confirm that MySQL server is running
* verify the username, password, and port in `database.py`

### Missing spaCy Model

If you see an error related to `en_core_web_sm`, install the model again:

```bash
python -m spacy download en_core_web_sm
```

---

This setup will allow you to run the full qualitative analysis tool locally and begin analyzing textual datasets using coding, sentiment analysis, and exportable reports.
