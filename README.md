# 🚀 DevCollab — Real-Time Collaborative Workspace Platform

A full-stack real-time collaboration platform where users can create workspaces, invite members, chat in real-time, and manage shared notes.

🔗 Live Demo: https://devcollab-one.vercel.app  
🔗 Backend API: https://devcollab-ymxf.onrender.com  
🔗 Repository: https://github.com/diwyanshu6/Devcollab  

---

# 🧠 System Architecture (Start Here)

## 📌 High-Level Flow

Frontend (React - Vercel)  
        ↓  
Backend (Node.js + Express - Render)  
        ↓  
Database (PostgreSQL - Supabase)  
        ↓  
Real-Time Layer (Socket.io)

---

# ⚙️ How It Works

## 🔐 Authentication Flow
1. User registers/logs in  
2. Server generates JWT token  
3. Token is sent in headers for protected routes  

---

## 🧑‍🤝‍🧑 Workspace System
- Users create workspaces  
- Creator becomes owner  
- Members join via invite link  
- Membership stored in `workspace_members`  

---

## 💬 Real-Time Chat Flow

User sends message  
   ↓  
Socket emits (send_message)  
   ↓  
Backend validates + stores in DB  
   ↓  
Server emits (receive_message)  
   ↓  
All workspace members receive instantly  

---

## 🔗 Invite System

Generate invite_code  
   ↓  
Frontend creates link  
   ↓  
User opens /join/:code  
   ↓  
Backend validates → adds member  

---

# 🗄️ Database Design

## Tables:

- users  
- workspaces  
- workspace_members  
- chats  
- notes  

---

## 🔑 Relationships

- One user → many workspaces  
- Workspace → many members  
- Workspace → many chats  
- Workspace → many notes  

---

# 🛠️ Tech Stack

## Frontend
- React (Hooks, Context API)  
- Axios  
- Socket.io Client  
- Vercel Deployment  

## Backend
- Node.js  
- Express.js  
- JWT Authentication  
- Socket.io (real-time communication)  
- REST API Architecture  

## Database
- PostgreSQL (Supabase)  
- Relational Schema Design  

## Deployment
- Frontend → Vercel  
- Backend → Render  
- Database → Supabase  

---

# 🔥 Features

-  JWT Authentication & Authorization  
-  Workspace creation & management  
-  Invite-based collaboration  
-  Real-time chat using WebSockets  
-  Notes system per workspace  
-  Secure API with middleware & error handling  
-  Production deployment (Vercel + Render + Supabase)  

---

# 🧪 API Overview

## Auth
- POST /api/users/register  
- POST /api/users/login  

## Workspace
- POST /api/workspaces  
- GET /api/workspaces  
- POST /api/workspaces/:id/invite_code  
- POST /api/workspaces/join/:invite_code  

## Chat
- GET /api/chats/:workspaceId  
- Real-time via Socket.io  

---

# 🔌 Socket Events

- join_workspace  
- send_message  
- receive_message  

---

# 🚀 Setup Instructions

## 1. Clone Repo
git clone https://github.com/diwyanshu6/Devcollab.git  
cd Devcollab  

---

## 2. Backend Setup
cd Backend  
npm install  
npm run dev  

---

## 3. Frontend Setup
cd frontend  
npm install  
npm run dev  

---

## 4. Environment Variables

### Backend
DATABASE_URL=your_supabase_url  
JWT_SECRET=your_secret  

### Frontend
VITE_API_URL=your_backend_url  
VITE_FRONTEND_URL=your_frontend_url  

---

# ⚠️ Challenges Solved

- Handling CORS between Vercel & Render  
- Fixing IPv6 connection issues with Supabase  
- Real-time socket connection in production  
- Environment-based configuration (local vs production)  
- Invite link system across devices  

---

# 📈 Future Improvements

- File sharing (S3 / Supabase storage)  
- Notifications system  
- Role-based permissions (admin/member)  
- Typing indicators & message status  

---

# 👨‍💻 Author

Diwyanshu  
📧 diwyanshusvnit@gmail.com  
🔗 https://github.com/diwyanshu6  

---

⭐ If you like this project, give it a star!
