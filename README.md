# AscendAI - AI-Powered Progress Tracker

## Setup & Run Instructions

### Prerequisites
- Node.js & npm
- PostgreSQL
- Python 3.10+

### 1. Database Setup
Since `psql` might not be in your system path, the easiest way is using **pgAdmin 4** (which comes with PostgreSQL):

1. **Open pgAdmin 4** and connect to your server.
2. Right-click on **Databases** > **Create** > **Database...**
3. Name it `ascendai_db` and click **Save**.
4. Right-click on the new `ascendai_db` > **Query Tool**.
5. Open the file `database/schema.sql`, copy its content, paste it into the Query Tool, and hit the **Play** button (Execute).
6. **Update Credentials**:
   - Open `server/.env`.
   - Update `DATABASE_URL` with your actual Postgres username and password:
     ```
     DATABASE_URL=postgresql://your_username:your_password@localhost:5432/ascendai_db
     ```

### 2. Backend Setup
1. Navigate to `server/`.
2. Install dependencies: `npm install`.
3. Create `.env` file (see `server/.env`) and update `DATABASE_URL` with your credentials.
4. Run server: `npm run dev`.

### 3. AI Service Setup
1. Navigate to `ai-service/`.
2. Install requirements: `pip install -r requirements.txt`.
3. Run service: `uvicorn main:app --reload`.

### 4. Frontend Setup
1. Navigate to `client/`.
2. Install dependencies: `npm install`.
3. Start React app: `npm run dev`.

### Features
- **Dashboard**: Weekly performance charts & AI insights.
- **Goals**: Create and track long/short term goals.
- **Tasks**: Daily checklist with difficulty ratings.
- **AI Integration**: Mocked AI service providing motivational feedback.

## Tech Stack
- Frontend: React + TailwindCSS + Recharts
- Backend: Node.js + Express + PostgreSQL
- AI: Python + FastAPI
