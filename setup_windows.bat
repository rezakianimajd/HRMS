@echo off
REM =============================================================================
REM HRMS Windows Dev Setup (SQLite Edition - No PostgreSQL needed!)
REM Run as: setup_windows.bat
REM =============================================================================
echo ============================================================
echo   HRMS - Windows Dev Setup ^(SQLite Edition^)
echo   No PostgreSQL or Redis required!
echo ============================================================
echo.

REM --- 1. Check Prerequisites ---
echo [1/6] Checking prerequisites...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python 3.10+ required. Download from python.org
    pause & exit /b 1
)
echo   Python OK: 
python --version

node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (echo WARNING: Node.js not found. Frontend needs it.)
echo.

REM --- 2. Virtual Environment ---
echo [2/6] Setting up Python venv...
cd hrms_project
if not exist "venv" (python -m venv venv)
echo   Activating...
call venv\Scripts\activate.bat
echo.

REM --- 3. Install Dependencies ---
echo [3/6] Installing Python packages...
python -m pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt
echo   Done.
echo.

REM --- 4. SQLite Database Migrations ---
echo [4/6] Setting up SQLite database...
if exist "db.sqlite3" (
    echo   Removing old database...
    del db.sqlite3
)
echo   Running migrations...
python manage.py migrate
echo   Database ready.
echo.

REM --- 5. Create Superuser and Sample Data ---
echo [5/6] Creating admin user and sample data...
python -c "from django.contrib.auth.models import User; u=User.objects.create_superuser('admin','admin@hrms.local','admin123'); print('  Created: admin / admin123')" 2>nul
if %ERRORLEVEL% NEQ 0 (echo   Superuser may already exist.)
python manage.py load_sample_data 2>nul
if %ERRORLEVEL% NEQ 0 (echo   Sample data may already exist.) else (echo   Sample data loaded!)
echo.

REM --- 6. Frontend ---
echo [6/6] Frontend setup...
cd ..\frontend
if not exist "node_modules" (echo   Installing npm packages... & call npm install) else (echo   Node modules OK.)
cd ..\hrms_project
echo.

echo ============================================================
echo   SETUP COMPLETE!
echo ============================================================
echo   Start Backend ^(this window^):
echo     cd hrms_project ^& venv\Scripts\activate ^& python manage.py runserver
echo.
echo   Start Frontend ^(NEW terminal^):
echo     cd frontend ^& npm start
echo.
echo   Login:  http://localhost:3000
echo   User:   admin
echo   Pass:   admin123
echo ============================================================
call venv\Scripts\deactivate.bat 2>nul
pause
