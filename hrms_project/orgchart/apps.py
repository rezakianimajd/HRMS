from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class OrgchartConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'orgchart'
    verbose_name = _('چارت سازمانی')