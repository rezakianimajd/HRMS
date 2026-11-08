from django.apps import AppConfig


class CorrespondencesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'correspondences'
    verbose_name = 'مکاتبات'

    def ready(self):
        """گرم‌کردن مسیر دانلود پیوست در استارتاپ.

        اولین ``reverse`` برای مسیر ``letter-attachment-download`` در هر worker
        حدود نیم‌ثانیه طول می‌کشد (ساخت درخت URLconf بزرگ پروژه)؛ با این کار
        این هزینه یک‌بار در بالا آمدن سرویس پرداخت می‌شود، نه در اولین درخواست.
        """
        try:
            from correspondences.serializers import _download_path_template

            _download_path_template()
        except Exception:                              # noqa: BLE001 — نبود URLconf نباید بوت را بشکند
            pass
