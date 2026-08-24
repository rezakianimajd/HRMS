# HRMS - Windows Development & Testing Guide

## 📋 Prerequisites for Windows

| Software | Minimum Version | Download Link | Notes |
|----------|----------------|---------------|-------|
| **Python** | 3.10+ | [python.org](https://www.python.org/downloads/) | Check "Add Python to PATH" |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) | npm comes bundled |

> **⚠️ No PostgreSQL or Redis needed!**  
> The development mode uses **SQLite** (built into Python/Django) and Celery tasks run synchronously.  
> PostgreSQL + Redis are only required for **production deployment** on Linux.

---

## 🚀 Quick Start (3 Steps)

### Step 1: Database Setup

```sql
-- Open pgAdmin or psql, then run:
CREATE USER hrms_user WITH PASSWORD 'hrms_password' CREATEDB;
CREATE DATABASE hrms_db OWNER hrms_user;
```

### Step 2: Backend Setup

```cmd
cd C:\HRMS\hrms_project

:: Create and activate virtual environment
python -m venv venv
venv\Scripts\activate

:: Install dependencies
pip install -r requirements.txt

:: Run migrations
python manage.py migrate_schemas --shared
python manage.py migrate_schemas

:: Create superuser
python manage.py createsuperuser

:: Create first company
python manage.py create_tenant --name="شرکت نمونه" --code="DEMO"

:: Load sample data
python manage.py load_sample_data

:: Start development server
python manage.py runserver
```

### Step 3: Frontend Setup

```cmd
cd C:\HRMS\frontend
npm install
npm start
```

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Admin Panel: http://localhost:8000/admin/

---

## 🧪 Testing Checklist

### Authentication
- [ ] Login with superuser at `/login`
- [ ] Verify JWT token is generated (check browser DevTools → LocalStorage)
- [ ] Logout and verify tokens are cleared

### Employees Module
- [ ] Navigate to `/employees` - list loads with pagination
- [ ] Search for an employee by name
- [ ] Apply filters (department, status, gender)
- [ ] Click "Add Employee" - form opens with all dropdowns populated
- [ ] Create a new employee with all required fields
- [ ] Click on an employee row - profile page opens with 3 tabs
- [ ] Verify Personal Info tab shows all data
- [ ] Verify Employment tab shows job details
- [ ] Edit an employee - verify form pre-fills data
- [ ] Soft-delete an employee - verify they disappear from list

### Documents Module
- [ ] Open an employee profile → Documents tab
- [ ] Upload a document (PDF or image)
- [ ] Verify Drag & Drop works in upload modal
- [ ] Preview a PDF document
- [ ] Preview an image document
- [ ] Download a document
- [ ] Delete a document
- [ ] Verify expiry warnings (red/yellow/green chips)

### Phonebook
- [ ] Navigate to `/phonebook`
- [ ] Search by name or employee ID
- [ ] Apply department filter
- [ ] Test Export to Excel

### Search
- [ ] Navigate to `/search`
- [ ] Search by employee name
- [ ] Switch to Documents tab
- [ ] Test combined filters

### Reports
- [ ] Navigate to `/reports`
- [ ] View Employees by Department
- [ ] View Employees by Gender (percentage chart)
- [ ] View Contracts Expiring
- [ ] View Turnover Rate

### Org Chart
- [ ] Navigate to `/org-chart`
- [ ] View organizational tree
- [ ] Click on a node to see employees

### Dashboard
- [ ] Navigate to `/dashboard`
- [ ] Verify stat cards show data
- [ ] Verify alerts section
- [ ] Verify recent activities

### Settings (Admin only)
- [ ] Navigate to `/settings`
- [ ] View company profile
- [ ] Update a system setting
- [ ] Upload company logo

### Multi-Language
- [ ] Switch to English - verify all labels change
- [ ] Switch back to Persian - verify RTL layout
- [ ] Verify document.dir changes

---

## 📦 Sample Data

After running `python manage.py load_sample_data`, the following data is created:

| Entity | Count | Details |
|--------|-------|---------|
| Departments | 5 | مدیریت, فنی, مالی, فروش, اداری |
| Job Titles | 10 | مدیرعامل, مدیر فنی, مدیر مالی, کارشناس, ... |
| Work Locations | 3 | مرکزی, شعبه ۱, شعبه ۲ |
| Insurance Lists | 2 | بیمه اصلی, بیمه تکمیلی |
| Document Types | 5 | کارت ملی, قرارداد, مدرک تحصیلی, گواهی, سایر |
| Employees | 20 | Mix of genders, departments, statuses |
| Documents | 10 | Sample documents for employees |

---

## ⚠️ Windows-Specific Notes

### Redis on Windows
Redis does not officially support Windows. Options:
1. **Memurai** (recommended): Free developer edition at [memurai.com](https://www.memurai.com/)
2. **WSL2**: Install Redis via `sudo apt install redis-server`
3. **Skip Redis**: Set `CELERY_TASK_ALWAYS_EAGER = True` in `settings/development.py` to run tasks synchronously

### PostgreSQL Trigram Extension
For fuzzy search to work, enable the `pg_trgm` extension:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### File Storage Path
Windows uses backslashes. In `.env`, use forward slashes or escaped backslashes:
```
BASE_FILE_STORAGE_PATH=C:/hr_data/
```

### Virtual Environment Activation
```cmd
:: Command Prompt
venv\Scripts\activate

:: PowerShell
venv\Scripts\Activate.ps1

:: If PowerShell blocks script execution:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🐛 Common Issues & Solutions

### Issue: `psycopg2` install fails
```cmd
pip install psycopg2-binary
```
Or install [PostgreSQL ODBC drivers](https://www.postgresql.org/ftp/odbc/versions/msi/).

### Issue: `django-tenants` migration fails
Ensure PostgreSQL user has `CREATEDB` permission:
```sql
ALTER USER hrms_user CREATEDB;
```

### Issue: Static files not loading (404)
```cmd
python manage.py collectstatic --noinput
```

### Issue: CORS errors from frontend
The backend runs on port 8000, frontend on 3000. Ensure CORS is configured:
```
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

---

## 📊 API Testing with Postman

### Login
```http
POST http://localhost:8000/api/auth/login/
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}
```

### Get Employees
```http
GET http://localhost:8000/api/employees/
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Get Dashboard Stats
```http
GET http://localhost:8000/api/dashboard/stats/
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## ✅ Pre-Deployment Verification

Before deploying to the Linux production server, verify:

1. [ ] All 8 modules tested and working
2. [ ] Multi-tenant isolation verified (data from Company A not visible in Company B)
3. [ ] JWT tokens working with refresh
4. [ ] File uploads working and stored correctly
5. [ ] Excel exports generating valid files
6. [ ] No hardcoded paths (all use settings or .env)
7. [ ] `DEBUG=False` works (static files served correctly)
8. [ ] Database migrations are clean
9. [ ] `.gitignore` excludes `.env`, `venv/`, `node_modules/`, `media/`, `__pycache__/`

---

**After completing this testing checklist, the system is ready for production deployment.**