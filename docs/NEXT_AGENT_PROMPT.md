# پرامپت آمادهٔ ایجنت بعدی (کپی کنید و بدهید)

> این فایل را همراه `AGENTS.md` استفاده کنید. متن زیر را کامل کپی و به ایجنت بدهید (بخش «وظیفه» را پر کنید).

---

You are continuing work on **Kian ERP / HRMS** at `C:\HRMS` (Windows, VS Code, git branch `main`, remote `origin`).

**Before doing anything:**
1. Read `C:\HRMS\AGENTS.md` end-to-end. It contains the stack, multi-tenancy rules, module map, Theme‑Studio spec, recipes, performance rules, server/deploy steps and recorded pitfalls.
2. Skim the files relevant to the task before editing (never guess APIs).

**Golden rules (from AGENTS.md §0):**
- Backend: `C:\HRMS\venv\Scripts\python.exe manage.py check --settings=hrms_project.settings.development` must stay clean; tests must be DB‑free (`SimpleTestCase`) because local PostgreSQL is usually down.
- Frontend: `cd frontend; $env:CI='true'; npx react-scripts test --watchAll=false --testPathPattern=<smoke>` must pass.
- Every UI element must follow the Theme Studio tokens (`useDesignTokens`, `useModulePalette`); no hard‑coded colors/radii/shadows.
- Every list/table = light serializer + targeted `select_related`/`Prefetch`; verify with `python manage.py dev_query_profile --schema kpsmi --params "page_size=20"`.
- Search must work in **two layers**: the endpoint (`?search=` / `?q=`) and `core/module_search.py` providers (sidebar / command palette).
- Never commit scratch files (`_*`). Never write server passwords into code or docs — **ask the user** for the `sudo` password when needed.
- Tenant data lives inside `schema_context('kpsmi')`; `core.Company` lives in the public schema.

**Task:**
<شرح وظیفه را اینجا بنویسید — صفحه/اندپوینت/رفتار مورد انتظار و مسیر فایل‌های مرتبط>

**Acceptance criteria:**
1. Feature works on the live server after deployment; UI is RTL/Persian and follows the theme studio.
2. Related backend + frontend tests pass; `manage.py check` clean; migration created/applied if a model changed.
3. If a list/search was touched: `manage.py dev_query_profile` numbers before/after reported and no N+1 (≤ ~10 queries per page).
4. Deployment verified live (frontend bundle hash + HTTP 200, `systemctl is-active gunicorn nginx`).
5. `git status` clean, temp files removed, commit message explains the change; ask before pushing if unsure.

**Do NOT:**
- Do not change `.env` or secrets; do not run `migrate` against production without a backup (`deploy-backend.ps1` does it).
- Do not use `powershell -File script.ps1` in this environment (silently does nothing) — use `powershell -Command "& 'C:\HRMS\script.ps1'"` and detached launchers for long builds/tests.
- Do not add new dependencies without asking; do not restyle unrelated pages.

**When finished:** report a short summary (files changed, tests run, before/after metrics, live verification) and any follow-up you recommend.

---

## نکات فارسی برای خودتان (اختیاری، حذف کنید)
- اگر کار به «استقرار» رسید: `.\deploy-frontend.ps1` یا `.\deploy-backend.ps1 -Migrate` یا `.\update-server.ps1`.
- اگر رمز `sudo` لازم شد، از کاربر بخواهید؛ الگو: `printf '%s\n' '<PW>' | sudo -S bash /tmp/x.sh`.
- اگر تست‌های نامرتبط شکست خوردند، سوئیت‌های همان‌ها را جدا اجرا کنید (زیر بار سنگین timeout می‌دهند).
