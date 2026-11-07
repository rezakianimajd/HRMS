# پیوست‌های نامه‌های وارده (اکسل هایپرلینک‌دار)

این سند روش انتقال فایل‌های اسکن‌شده‌ای را توضیح می‌دهد که در فایل
`اندیکاتور مالی.xlsx` (شیت «نام های وارده») با هایپرلینک به فایل‌های شبکه
(`Z:\Group\Accounting\...`) وصل شده‌اند.

دو مرحله دارد و هر مرحله روی ماشین متفاوتی اجرا می‌شود:

1. **برون‌بری (Export) — روی ویندوزی که به درایو `Z:` دسترسی دارد.**
   اسکریپت `scripts/export_letter_attachments.py` همهٔ هایپرلینک‌ها را باز
   می‌کند، فایل‌ها را با نام اسکی پیکربندی‌شده در پوشهٔ `files/` کپی می‌کند و
   `manifest.json` را می‌سازد.

   ```powershell
   C:\HRMS\venv\Scripts\python.exe -X utf8 scripts\export_letter_attachments.py `
     --excel "Z:\Group\Accounting\اندیکاتور مالی.xlsx" `
     --sheet "نام های وارده" `
     --out C:\HRMS\_letters_pack_full `
     --fallback-dir "Z:\Everyone"
   ```

   نکته‌ها:

   - `--limit N` برای اجرای آزمایشی روی چند ردیف اول.
   - `--rows 95,319,320` فقط ردیف‌های مشخص را می‌خواند (برای جبران فایل‌های
     گم‌شده پس از اجرای اصلی).
   - `--dry-run` فقط گزارش می‌دهد و هیچ فایلی کپی نمی‌کند.
   - `--fallback-dir` را می‌توان چند بار داد؛ برای لینک‌های شکسته، فایل با
     «دنبالهٔ مسیر» زیر هر پوشهٔ جانشین جست‌وجو می‌شود (مثلاً لینک
     `skan mali new\a.pdf` با `--fallback-dir "Z:\Group\Accounting\scan mali"`
     پیدا می‌شود).
   - اگر اجرا نیمه‌کاره بماند، اجرای دوباره فایل‌های موجود و سالم را دوباره
     کپی نمی‌کند (بر اساس نام و اندازه).
   - شناسهٔ منبع هر نامه به شکل `<sheet_code>:<row>` ساخته می‌شود
     (`incoming:157` یعنی شیت وارده، ردیف ۱۵۷) و همان کلید تطبیق در سرور است.

2. **درون‌بری (Import) — روی سرور، در اسکیمای شرکت.**

   ```bash
   # انتقال بسته (به /var/tmp بریزید؛ /tmp روی این سرور tmpfs است)
   scp _letters_full.tar hradmin@192.168.1.63:/var/tmp/letters-full.tar

   sudo mkdir -p /opt/hrms/import/letters-full
   sudo tar -xf /var/tmp/letters-full.tar -C /opt/hrms/import/letters-full
   sudo chown -R hrms:hrms /opt/hrms/import

   sudo -u hrms bash -lc 'cd /opt/hrms/hrms_project && set -a && . ./.env && set +a && \
     DJANGO_SETTINGS_MODULE=hrms_project.settings.production ../venv/bin/python manage.py \
     import_letter_attachments --manifest /opt/hrms/import/letters-full/manifest.json \
     --schema kpsmi --dry-run'
   ```

   وقتی گزارش آزمایشی درست بود، همان دستور را بدون `--dry-run` اجرا کنید.

## نکات فنی دستور `import_letter_attachments`

- دو حالت دارد: `--manifest file.json` (پیشنهادی، خروجی اسکریپت بالا) یا
  `--file book.xlsx` (خواندن مستقیم اکسل روی سرور؛ فقط وقتی سرور به مسیر
  فایل‌ها دسترسی دارد).
- تطبیق نامه به ترتیب با `source_ref`، `indicator_no`، `number`،
  `external_number` و در آخر «موضوع» انجام می‌شود.
- `--schema` یک شرکت را هدف می‌گیرد؛ بدون آن روی همهٔ اسکیماها اجرا می‌شود.
  خودِ شرکت (tenant) در اسکیمای `public` خوانده می‌شود و بقیهٔ کار داخل
  `schema_context` انجام می‌شود.
- اجرای دوباره بی‌خطر است: پیوست‌های موجود (هم‌نام یا هم‌عنوان) شمرده و
  رد می‌شوند (`تکراری`).
- `--kind` نوع پیش‌فرض پیوست (`letter`)، `--skip-missing` و `--limit` هم
  هستند.

## گزارش اجرای واقعی (۵ نوامبر ۲۰۲۶)

- اجرای آزمایشی روی ۱۵۰ ردیف اول: ۱۴۹ نامه، ۱۵۱ فایل، بدون خطا؛ سپس درون‌بری
  واقعی روی اسکیمای `kpsmi` انجام شد و `media/correspondences/letters/...`
  ساخته شد؛ اجرای دوباره ۱۵۱ مورد را «تکراری» شمرد.
- اجرای کامل شیت: ۳٬۹۲۵ ردیف دارای لینک، ۵٬۹۵۶ فایل (۸٬۸۲۸ مگابایت)، ۳٬۸۸۳
  نامه در فهرست؛ نتیجهٔ درون‌بری: ۳٬۸۵۸ نامه شناسایی شد، ۵٬۷۰۰ پیوست ثبت شد،
  ۲۵ ردیف نامه‌اش در سامانه نبود، ۰ خطا.
- پاس دوم برای ۶۶ ردیفی که فایل‌شان پیدا نشده بود (با
  `--rows … --fallback-dir "Z:\Group\Accounting\scan mali"`): ۷۵ فایل و ۵۲
  نامه بازیابی شد و ۳۳ پیوست تازه اضافه شد.
- جمع نهایی در اسکیمای `kpsmi`: **۵٬۸۸۴ پیوست** روی **۳٬۸۸۶ نامهٔ وارده**
  (حدود ۸٫۶ گیگابایت). ۱۲۳ نامهٔ وارده هنوز فایل اسکن‌شده ندارد.
