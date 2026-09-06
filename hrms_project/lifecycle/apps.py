from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class LifecycleConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'lifecycle'
    verbose_name = _('چرخه عمر کارمند')