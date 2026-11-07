"""Views قالب‌های چاپ، تنظیمات خزانه و قواعد تأیید پرداخت."""
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from core.engines.permission_engine import require
from treasury.approval_models import TreasuryApprovalRule, TreasurySettings, get_settings
from treasury.config_serializers import (
    TreasuryApprovalRuleSerializer, TreasuryPrintTemplateSerializer,
    TreasurySettingsSerializer,
)
from treasury.print_templates import (
    TreasuryPrintTemplate, build_context, placeholders_for, render_template,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class TreasuryPrintTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = TreasuryPrintTemplateSerializer
    queryset = TreasuryPrintTemplate.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'note']
    ordering = ['kind', '-is_default', 'name']

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        if self.request.query_params.get('kind'):
            qs = qs.filter(kind=self.request.query_params['kind'])
        return qs

    def perform_create(self, serializer):
        require(self.request.user, 'treasury_manage_config')
        serializer.save(company=_company(self.request))

    def perform_update(self, serializer):
        require(self.request.user, 'treasury_manage_config')
        serializer.save()

    @action(detail=False, methods=['get'])
    def placeholders(self, request):
        """فهرست جای‌نگهدارهای هر نوع سند (برای پنل ویرایش)."""
        kind = request.query_params.get('kind') or 'receipt'
        return Response({'kind': kind, 'placeholders': placeholders_for(kind)})

    @action(detail=False, methods=['post'])
    def preview(self, request):
        """پیش‌نمایش قالب با دادهٔ نمونه (قبل از ذخیره)."""
        kind = request.data.get('kind') or 'receipt'
        body = request.data.get('body') or ''
        fake = TreasuryPrintTemplate(kind=kind, body=body or '{{number}}')
        sample = {row['key']: row['sample'] for row in placeholders_for(kind)}
        sample.setdefault('barcode', '')
        html = render_template(fake, build_context({
            'number': sample.get('number', 'RC-1405-000001'),
            'amount': sample.get('amount', ''),
            'amount_words': sample.get('amount_words', ''),
            'verification': {'code': 'RC-1405-000001', 'url': '/treasury/verify'},
            **sample,
        }))
        return Response({'html': html})


class TreasurySettingsView(APIView):
    """تنظیمات خزانه (تفکیک وظایف، الزام تأیید، سقف پیش‌فرض)."""

    def get(self, request):
        settings_obj = get_settings(_company(request))
        return Response(TreasurySettingsSerializer(settings_obj).data)

    def put(self, request):
        require(request.user, 'treasury_manage_config')
        company = _company(request)
        instance = TreasurySettings.objects.filter(company=company).first()
        serializer = TreasurySettingsSerializer(
            instance, data=request.data, partial=bool(instance),
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(company=company)
        return Response(serializer.data)


class TreasuryApprovalRuleViewSet(viewsets.ModelViewSet):
    serializer_class = TreasuryApprovalRuleSerializer
    queryset = TreasuryApprovalRule.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'required_permission', 'notes']
    ordering = ['min_amount', 'name']

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        require(self.request.user, 'treasury_manage_config')
        serializer.save(company=_company(self.request))

    def perform_update(self, serializer):
        require(self.request.user, 'treasury_manage_config')
        serializer.save()

