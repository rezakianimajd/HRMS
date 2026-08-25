# انتقال دیتابیس HRMS

راهنمای انتقال داده‌ها از محیط توسعه (SQLite روی ویندوز) به سرور Ubuntu 26.04
(PostgreSQL + django-tenants با schema جداگانه برای هر شرکت).

> این فایل **فقط محلی** است. هرگز آن را با اطلاعات واقعی به گیت ارسال نکنید.

---

## ۱. معماری و چالش اصلی

- **توسعه (ویندوز):** دیتابیس `hrms_project/db.sqlite3` با `Multi-tenancy` غیرفعال.
  همه جدول‌ها در یک دیتابیس ساده SQLite هستند.
- **تولید (Ubuntu):** PostgreSQL با `django_tenants`. هر شرکت یک schema جداگانه دارد.
- به همین دلیل نمی‌توان `db.sqlite3` را مستقیم کرد و باید داده‌ها را از طریق
  فایل JSON منتقل و شناسه‌ها را remap کرد.

---

## ۲. فایل‌های تولیدشده

| فایل | محل | توضیح |
|------|-----|-------|
| `hrms_tenant_data.json` | ریشه پروژه (محلی) | خروجی اکسپورت شامل ۹۴ شیء (تنها داده‌های tenant) |
| `export_tenant_data.py` | `core/management/commands/` | دستور اکسپورت |
| `import_tenant_data.py` | `core/management/commands/` | دستور ایمپورت |

فایل `hrms_tenant_data.json` **حساس** است (اطلاعات پرسنل) و نباید commit شود.
(در `.gitignore` افزوده شده است.)

> **هشدار:** برای انتقال چند شرکت، هر شرکت را جداگانه اکسپورت/ایمپورت کنید.

---

## ۳. گام به گام روی سرور

### گام ۰: انتقال فایل‌ها

```bash
# روی ویندوز / دستگاه محلی
scp hrms_tenant_data.json user@SERVER_IP:/tmp/hrms_tenant_data.json

# انتقال فایل‌های media (عکس پرسنل، فایل مکاتبات، لوگو و ...)
scp -r hrms_project/media/* user@SERVER_IP:/tmp/hrms_media/
```

### گام ۱: نصب و دیپلوی

```bash
# روی سرور
sudo bash deploy.sh
```

### گام ۲: ساخت tenant

```bash
cd /opt/hrms/hrms_project
source /opt/hrms/venv/bin/activate
export DJANGO_SETTINGS_MODULE=hrms_project.settings.production

# ساخت tenant (با کد و schema دلخواه)
python manage.py create_tenant \
    --name='شرکت شما' \
    --code='YOURCO' \
    --domain='your-domain.com'

python manage.py migrate_schemas
```

### گام ۳: ساخت سوپریوزر

```bash
python manage.py createsuperuser
```

### گام ۴: ایمپورت داده‌ها

```bash
python manage.py import_tenant_data /tmp/hrms_tenant_data.json \
    --schema=yourco \
    --company-code=YOURCO
```

### گام ۵: انتقال فایل‌های media

```bash
sudo cp -r /tmp/hrms_media/* /var/www/hrms/media/
sudo chown -R hrms:www-data /var/www/hrms/media/
```

### گام ۶: راه‌اندازی مجدد

```bash
sudo systemctl restart gunicorn celery-worker celery-beat
```

---

## ۴. لیست داده‌های منتقل‌شده

| مدل | تعداد (فعلی) | وضعیت انتقال |
|-----|-------------|-------------|
| Department | ۵ | ✓ |
| WorkLocation | ۳ | ✓ |
| JobTitle | ۱۰ | ✓ |
| ContractType | ۴ | ✓ |
| InsuranceList | ۲ | ✓ |
| Employee | ۱۷ | ✓ |
| WorkExperience | ۱ | ✓ |
| DocumentType | ۶ | ✓ |
| SalaryRecord | ۱ | ✓ |
| BenefitRecord | ۳ | ✓ |
| Position | ۲۸ | ✓ |
| Organization | ۱ | ✓ |
| IncomingLetter | ۱ | ✓ |
| OrganizationalLetter | ۱ | ✓ |
| SystemSetting | ۱۰ | ✓ |
| CompanyProfile | ۱ | ✓ |

**توجه:** مدل‌های Document و غیره در صورت داشتن رکورد نیز به صورت خودکار منتقل
می‌شوند (الگوریتم اکسپورت تمام مدل‌های tenant را پوشش می‌دهد).

---

## ۵. داده‌ای که منتقل **نمی‌شود**

این داده‌ها به دلیل shared بودن یا ماهیت سیستمی، باید به صورت دستی ساخته شوند:

| داده | دلیل | راه ساخت |
|------|------|---------|
| کاربران (auth_user) | جدا کردن امنیتی کاربران از دیتا | `createsuperuser` |
| Company / Domain | tenant مشترک | `create_tenant` |
| UserProfile | مربوط به کاربران | دستی پس از ساخت کاربر |
| AuditLog | لاگ عملیات | قابل صرف‌نظر |
| Session | موقتی | — |

---

## ۶. نکته مهم درباره schema در تولید

- `deploy.sh` دستور مهاجرت را اصلاح می‌کند:
  ```bash
  python manage.py migrate_schemas --shared   # ابتدا public
  python manage.py migrate_schemas            # سپس همه tenantها
  ```
- در تنظیمات `base.py` بارگذاری `.env` اضافه شده تا دستورات `manage.py` مستقیم
  مقادیر تولید (PostgreSQL) را از `.env` بخوانند.

---

## ۷. بازیابی (Restore) در مواقع لازم

```bash
# بکاپ دیتابیس (ساخته‌شده توسط backup.sh)
sudo -u postgres pg_restore -U hrms -d hrms_db --clean --if-exists \
    /var/backups/hrms/hrms_backup_XXXX.db.dump
```

---

## ۸. عیب‌یابی

| خطا | علت | راه‌حل |
|-----|------|--------|
| `CommandError: Company with code ... does not exist` | هنوز tenant ساخته نشده | `create_tenant` را اجرا کنید |
| `schema ... does not exist` | `migrate_schemas` اجرا نشده | `python manage.py migrate_schemas` |
| `psycopg2 ... not found` | Python 3.12 روی سرور نصب نیست | `sudo apt install python3.12 python3.12-venv python3.12-dev` |
| `charmap codec can't encode` | انکودینگ ویندوز | دستور اکسپورت را با `PYTHONUTF8=1` یا مستقیم در CMD اجرا کنید |

---

## ۹. چک‌لیست نهایی

- [ ] `.env` مثال ساخته شده (`.env.example`)
- [ ] `.env` واقعی از گیت حذف شده
- [ ] `db.sqlite3` از گیت حذف شده (ولی روی دیسک هست)
- [ ] `node_modules` از گیت حذف شده
- [ ] `hrms_tenant_data.json` ساخته شده (محلی)
- [ ] `deploy.sh` مسیرهای درست و SSL و فرانت‌اند build دارد
- [ ] `backup.sh` اشکال tar اصلاح شده
- [ ] فایل‌های media آماده انتقال هستند