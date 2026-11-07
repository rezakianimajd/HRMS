"""Views برای Master Data خزانه، تنظیمات شماره‌گذاری و اعتبارسنجی سند (QR)."""
from rest_framework import filters, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.engines.permission_engine import require
from treasury.master_models import Bank, BankBranch, POSTerminal
from treasury.master_serializers import (
    BankBranchSerializer, BankSerializer, POSTerminalSerializer,
    TreasuryNumberingSettingSerializer,
)
from treasury.numbering import (
    DOC_KINDS, TreasuryNumberingSetting, get_setting, preview_numbers,
)
from treasury.vouchers import build_verification_payload, verify_voucher


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class BaseMasterViewSet(viewsets.ModelViewSet):
    """CRUD مشترک Master Data خزانه (محدود به شرکت + مجوز تنظیمات خزانه)."""

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

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

    def perform_destroy(self, instance):
        require(self.request.user, 'treasury_manage_config')
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class BankViewSet(BaseMasterViewSet):
    serializer_class = BankSerializer
    queryset = Bank.objects.all()
    search_fields = ['name', 'name_en', 'code', 'swift_code']
    ordering_fields = ['name', 'code', 'sort_order']
    ordering = ['sort_order', 'name']

    def get_queryset(self):
        from django.db.models import Count

        # شمارش شعبه با annotate (بدون کوئری به‌ازای هر ردیف)
        qs = super().get_queryset().annotate(branch_count=Count('branches'))
        if str(self.request.query_params.get('active') or '').lower() in ('1', 'true'):
            qs = qs.filter(is_active=True)
        return qs


class BankBranchViewSet(BaseMasterViewSet):
    serializer_class = BankBranchSerializer
    queryset = BankBranch.objects.select_related('bank')
    search_fields = ['name', 'code', 'city', 'province', 'bank__name']
    ordering_fields = ['name', 'city', 'code']
    ordering = ['bank__name', 'name']

    def get_queryset(self):
        qs = super().get_queryset()
        bank = self.request.query_params.get('bank')
        if bank:
            qs = qs.filter(bank_id=bank)
        return qs


class POSTerminalViewSet(BaseMasterViewSet):
    serializer_class = POSTerminalSerializer
    queryset = POSTerminal.objects.select_related('bank', 'entity')
    search_fields = ['terminal_number', 'merchant_number', 'serial_number', 'bank__name']
    ordering_fields = ['terminal_number', 'activated_on']
    ordering = ['bank__name', 'terminal_number']

    def get_queryset(self):
        qs = super().get_queryset()
        if str(self.request.query_params.get('active') or '').lower() in ('1', 'true'):
            qs = qs.filter(is_active=True)
        return qs


class TreasuryNumberingSettingView(APIView):
    """تنظیمات شماره‌گذاری اسناد خزانه (یک ردیف در هر شرکت) + پیش‌نمایش."""

    def get(self, request):
        company = _company(request)
        setting = get_setting(company)
        data = TreasuryNumberingSettingSerializer(setting).data
        data['preview'] = preview_numbers(company)
        data['doc_kinds'] = [{'key': key, 'label': label} for key, label in DOC_KINDS.items()]
        return Response(data)

    def put(self, request):
        require(request.user, 'treasury_manage_config')
        company = _company(request)
        setting = TreasuryNumberingSetting.objects.filter(company=company).first()
        serializer = TreasuryNumberingSettingSerializer(
            setting, data=request.data, partial=bool(setting),
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(company=company)
        data = serializer.data
        data['preview'] = preview_numbers(company)
        data['doc_kinds'] = [{'key': key, 'label': label} for key, label in DOC_KINDS.items()]
        return Response(data)


class VoucherVerifyView(APIView):
    """اعتبارسنجی عمومی سند از روی توکن QR (بدون اطلاعات محرمانه)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        token = (request.query_params.get('token') or '').strip()
        if not token:
            return Response({'valid': False, 'detail': 'توکن سند ارسال نشده است.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            payload = verify_voucher(token)
        except Exception:  # noqa: BLE001
            return Response({'valid': False, 'detail': 'این سند معتبر نیست یا منقضی شده است.'},
                            status=status.HTTP_400_BAD_REQUEST)

        kind = payload.get('k')
        object_id = payload.get('i')
        model = {
            'receipt': ('treasury.operation_models', 'Receipt'),
            'payment': ('treasury.payment_models', 'PaymentOrder'),
            'transfer': ('treasury.operation_models', 'TreasuryTransfer'),
        }.get(kind)
        if not model:
            return Response({'valid': False, 'detail': 'نوع سند نامشخص است.'},
                            status=status.HTTP_400_BAD_REQUEST)
        from django.apps import apps

        document_model = apps.get_model(*model)
        document = document_model.objects.filter(pk=object_id).first()
        if document is None:
            return Response({'valid': False, 'detail': 'سند یافت نشد.'},
                            status=status.HTTP_404_NOT_FOUND)
        data = build_verification_payload(kind, document)
        data['valid'] = True
        return Response(data)
