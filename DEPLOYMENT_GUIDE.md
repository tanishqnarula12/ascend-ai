# AscendAI Free Deployment Guide 🚀

This guide will walk you through deploying the full **AscendAI** stack (Frontend, Backend, Database, and AI Service) for **free** using **Netlify** and **Render**.

## 📋 Prerequisites
1.  A **GitHub** account.
2.  **Git** installed on your computer.
3.  Accounts on **[Netlify](https://www.netlify.com/)** and **[Render](https://render.com/)**.

---

## 1️⃣ Step 1: Push Code to GitHub
You need your code in a GitHub repository to deploy it.

1.  Create a new **empty repository** on GitHub (e.g., `ascend-ai`).
2.  Open your project folder in the terminal and run:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/ascend-ai.git
    git push -u origin main
    ```

---

## 2️⃣ Step 2: Deploy Database & Backend (Render)
We will use **Render** for the Database and Node.js Server because it offers a free tier for both.

### **A. Create the Database**
1.  Go to the [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** and select **PostgreSQL**.
3.  **Name**: `ascend-db`
4.  **Region**: Choose the one closest to you (e.g., Singapore or Frankfurt).
5.  **Instance Type**: Select **Free**.
6.  Click **Create Database**.
7.  **Copy the "Internal DB URL"** (for the backend) and **"External DB URL"** (if you want to connect from your PC).

### **B. Deploy the Node.js Backend**
1.  Click **New +** and select **Web Service**.
2.  Connect your GitHub repository (`ascend-ai`).
3.  **Name**: `ascend-server`
4.  **Root Directory**: `server`
5.  **Runtime**: **Node**
6.  **Build Command**: `npm install`
7.  **Start Command**: `node index.js`
8.  **Instance Type**: **Free**.
9.  **Environment Variables** (Click "Advanced"):
    *   `DATABASE_URL`: *Paste the Internal DB URL from step A*
    *   `JWT_SECRET`: *Enter a long random string (e.g., mysecretkey123)*
    *   `PORT`: `10000` (Render uses 10000 by default, app should handle `process.env.PORT`)
    *   `AI_SERVICE_URL`: *Leave empty for now, we will fill this in Step 3*
10. Click **Create Web Service**.
11. **Wait for deployment**. Once live, copy the service URL (e.g., `https://ascend-server.onrender.com`).

---

## 3️⃣ Step 3: Deploy AI Service (Render)
1.  Click **New +** and select **Web Service**.
2.  Connect your GitHub repository again.
3.  **Name**: `ascend-ai-service`
4.  **Root Directory**: `ai-service`
5.  **Runtime**: **Python 3**
6.  **Build Command**: `pip install -r requirements.txt`
7.  **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
8.  **Instance Type**: **Free**.
9.  Click **Create Web Service**.
10. Once live, copy the URL (e.g., `https://ascend-ai-service.onrender.com`).

### **C. Link AI Service to Backend**
1.  Go back to your **Backend Service (`ascend-server`)** on Render.
2.  Go to **Environment**.
3.  Add/Update `AI_SERVICE_URL` with the URL from Step 3 (e.g., `https://ascend-ai-service.onrender.com`).
4.  **Save Changes** (This will trigger a redeploy of the backend).

---

## 4️⃣ Step 4: Deploy Frontend (Vercel - Recommended)
Since Netlify had some permission issues, we'll use **Vercel** which is excellent for Vite projects.

1.  Log in to **[Vercel](https://vercel.com/)**.
2.  Click **"Add New"** > **"Project"**.
3.  Connect your GitHub repo (`ascend-ai`).
4.  In the configuration:
    *   **Framework Preset**: Vite
    *   **Root Directory**: `client` (Very important!)
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
5.  **Environment Variables**:
    *   Add **Key**: `VITE_API_URL`
    *   Add **Value**: *Your Backend URL from Step 2B* (e.g., `https://ascend-server.onrender.com/api`)
6.  Click **"Deploy"**.

---

## 4️⃣ Alternative: Deploy Frontend (Netlify)
If you still want to use Netlify:
1.  **Base directory**: `client`
2.  **Build command**: `npm run build`
3.  **Publish directory**: `dist`
4.  **Environment Variables**: add `VITE_API_URL`.

---

## 5️⃣ Final Checks
1.  Open your **Netlify URL**.
2.  Try to **Register** a new account (This tests the DB connection).
3.  Create a **Goal** (Tests the Backend).
4.  Check the **Dashboard** (Tests the AI Service integration).

### ⚠️ Important Note on Free Tiers
*   **Render Free Tier** spins down services after inactivity. The **first request** after a while might take **50-60 seconds** to wake up the server. This is normal for free hosting.
