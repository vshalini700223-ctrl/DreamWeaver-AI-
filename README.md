# 🌙 DreamWeaver AI — AI-Powered Dream Analysis & Visualization

DreamWeaver AI is an AI-powered web application that transforms users' dreams into meaningful insights and creative visual experiences. Users can enter their dreams, explore emotional patterns, generate dream-inspired images, and save their dream entries in a personal journal.

## ✨ Features

- 📝 **Dream Input:** Enter and analyze dream descriptions.
- 🧠 **AI Dream Analysis:** Explore emotions and insights associated with dream content.
- 🎨 **Dream Visualization:** Generate images inspired by dream descriptions through an image-generation service.
- 📔 **Dream Journal:** Save, view, and manage dream entries.
- 💫 **Interactive Interface:** Explore dreams through a visually engaging, cosmic-themed user interface.
- 🔍 **API Integration:** Connect the React frontend to the FastAPI backend.

## 🛠️ Technologies Used

**Frontend**
- React.js
- Vite
- JavaScript
- CSS

**Backend**
- Python
- FastAPI
- Uvicorn
- SQLite

**AI Integration**
- Natural language processing for dream analysis
- External image-generation service

## 📂 Project Structure

```text
DreamWeaver-AI/
├── backend/
│   ├── main.py
│   └── dream_journal.db
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── index.html
├── .gitignore
└── README.md
```

*Note: The structure above is illustrative. Actual files and folders may differ.*

## ⚙️ Installation and Setup

### Prerequisites

- Python 3.12
- Node.js and npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/DreamWeaver-AI.git
cd DreamWeaver-AI
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Set Up the Python Backend

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it in Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the Python dependencies listed in your project's `requirements.txt`:

```powershell
pip install -r backend/requirements.txt
```

*If your requirements file is stored elsewhere, adjust the path accordingly.*

Start the backend:

```powershell
python -m uvicorn main:app --reload --app-dir backend
```

The backend API is expected at:

http://127.0.0.1:8000

API documentation:

http://127.0.0.1:8000/docs

### 3. Set Up the React Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, usually:

http://localhost:5173

## 🔌 API Endpoints

The application includes endpoints for the following operations:

- `POST /api/analyze-dream` — Analyze dream descriptions.
- `POST /api/generate-scene` — Request dream-inspired image generation.
- `POST /api/journal` — Save a dream journal entry.
- `GET /api/journal` — Retrieve saved dream entries.
- `DELETE /api/journal/{entry_id}` — Delete a journal entry.

## 🔐 Security

- Keep API keys and credentials in environment variables.
- Never commit `.env` files or private credentials to GitHub.
- Exclude virtual environments and unnecessary generated files from version control.

## 🚀 Future Improvements

- More detailed dream emotion analysis
- Improved dream-inspired image generation
- Dream history and search
- Personalized dream insights
- Cloud deployment and secure user accounts

## 🎯 Project Goal

DreamWeaver AI explores how artificial intelligence can combine natural language processing, image generation, and interactive web development to create a creative dream-exploration experience.

## 👩‍💻 Author

**Shalini Venkatesan**

---

*DreamWeaver AI — Explore your dreams. Discover your imagination.*
