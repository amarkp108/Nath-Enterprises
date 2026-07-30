# Nath Enterprises — Student Management System

Full-stack MERN coaching institute management system with Admin & Student portals.

## Features

### Admin
- Dashboard with daily / weekly / monthly fee collection
- Total students, admissions this month, pending fees
- Student list with course-wise & pending-fee filters
- Add / edit / delete students (phone, password, fee mandatory)
- Fee collection with receipt numbers
- Course management
- Profile & change password

### Student
- Login with mobile number + password
- View total / paid / pending fees & payment history
- Update profile & address (fee fields locked)
- Upload / manage documents
- Change password

## Setup

### Backend
```bash
cd backend
npm install
npm run dev
```
Runs on http://localhost:5001

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173

## Default Admin Login
- **Email:** admin@nathenterprises.com
- **Password:** Admin@123

Students login with the phone & password set when admin adds them.

## Tech Stack
- MongoDB Atlas + Express + React (Vite) + Node.js
- JWT auth, bcrypt, multer (file uploads), Recharts
