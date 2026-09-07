"""API for Bale message templates (reusable saved messages)."""
from rest_framework import status, viewsets, filters
from rest_framework.response import Response
from notifications.models import BaleTemplate
from notifications.serializers import BaleTemplateSerializer

# Default templates seeded per-tenant on first read.
DEFAULT_TEMPLATES = [
    {
        'title': 'تبریک تولد',
        'event_type': 'birthday',
        'text': 'تولدتان مبارک! آرزوی بهترین‌ها را برای شما داریم. 🌸',
    },
    {
        'title': 'اطلاع‌رسانی مزایا',
        'event_type': 'benefits',
        'text': 'مزایای دورهٔ جدید برای شما در سامانه ثبت گردید. لطفاً فیش خود را بررسی کنید.',
    },
    {
        'title': 'صدور فیش حقوقی',
        'event_type': 'payslip',
        'text': 'فیش حقوقی ماه جاری صادر شد. برای مشاهده به سامانه مراجعه کنید.',
    },
    {
        'title': 'تبریک عید',
        'event_type': 'eid',
        'text': 'عیدتان مبارک! سالی پر از موفقیت و سلامتی برای شما آرزومندیم. 🌹',
    },
    {
        'title': 'اطلاعیه عمومی',
        'event_type': 'announcement',
        'text': 'اطلاعیهٔ جدیدی در سامانه منتشر شد. لطفاً مطالعه فرمایید.',
    },
]


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class BaleTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = BaleTemplateSerializer
    queryset = BaleTemplate.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'text']
    ordering = ['event_type', 'title']

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        event_type = self.request.query_params.get('event_type')
        if event_type:
            qs = qs.filter(event_type=event_type)
        return qs

    def list(self, request, *args, **kwargs):
        """Seed default templates for the tenant on first access."""
        company = _company(request)
        if company:
            existing = BaleTemplate.objects.filter(company=company)
            if not existing.exists():
                for tpl in DEFAULT_TEMPLATES:
                    BaleTemplate.objects.create(company=company, **tpl)
                existing = BaleTemplate.objects.filter(company=company)
            queryset = existing.filter(is_active=True).order_by('event_type', 'title')
        else:
            queryset = self.filter_queryset(self.get_queryset())

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        company = _company(self.request)
        serializer.save(company=company)
