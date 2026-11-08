"""بیلدرهای سروری اسناد رسمی موتور چاپ (فیش حقوقی، سند خزانه).

هر بیلدر دو بخش دارد:
- ``*_document(data)`` — خالص و قابل تست: دیکشنری داده → ساختار سند موتور چاپ
- ``load_*`` — خواندن داده از دیتابیس + بررسی مجوز (فقط در زمان درخواست)

نکته: شکل دیکشنری سند همان چیزی است که ``core.print_engine.layout.render_document``
انتظار دارد (`title`, `subtitle`, `badge`, `company`, `meta`, `sections`, `amount_box`,
`signatures`, `barcode`, `watermark`).
"""
