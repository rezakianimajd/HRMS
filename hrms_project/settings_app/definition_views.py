"""CRUD viewsets for initial definitions: additions, deductions, currencies."""
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from settings_app.models import Addition, Deduction, Currency
from settings_app.serializers import (
    AdditionSerializer, DeductionSerializer, CurrencySerializer,
)

# ~24 major traded currencies (code, name(FA), symbol, country_code, exchange_rate to IRR).
DEFAULT_CURRENCIES = [
    ('IRR', 'ریال ایران', '﷼', 'IR', 1),
    ('USD', 'دلار آمریکا', '$', 'US', 420000),
    ('EUR', 'یورو', '€', 'EU', 450000),
    ('GBP', 'پوند بریتانیا', '£', 'GB', 530000),
    ('JPY', 'ین ژاپن', '¥', 'JP', 2800),
    ('CNY', 'یوآن چین', '¥', 'CN', 58000),
    ('CHF', 'فرانک سوئیس', 'CHF', 'CH', 470000),
    ('CAD', 'دلار کانادا', 'C$', 'CA', 310000),
    ('AUD', 'دلار استرالیا', 'A$', 'AU', 280000),
    ('NZD', 'دلار نیوزیلند', 'NZ$', 'NZ', 255000),
    ('AED', 'درهم امارات', 'د.إ', 'AE', 115000),
    ('SAR', 'ریال عربستان', '﷼', 'SA', 112000),
    ('TRY', 'لیر ترکیه', '₺', 'TR', 12000),
    ('RUB', 'روبل روسیه', '₽', 'RU', 4500),
    ('INR', 'روپیه هند', '₹', 'IN', 5000),
    ('PKR', 'روپیه پاکستان', '₨', 'PK', 1500),
    ('AFN', 'افغانی', '؋', 'AF', 5000),
    ('IQD', 'دینار عراق', 'ع.د', 'IQ', 320),
    ('KWD', 'دینار کویت', 'د.ك', 'KW', 1380000),
    ('QAR', 'ریال قطر', '﷼', 'QA', 115000),
    ('OMR', 'ریال عمان', '﷼', 'OM', 1090000),
    ('BHD', 'دینار بحرین', 'د.ب', 'BH', 1110000),
    ('MYR', 'رینگیت مالزی', 'RM', 'MY', 88000),
    ('SGD', 'دلار سنگاپور', 'S$', 'SG', 310000),
    ('KRW', 'وون کرهٔ جنوبی', '₩', 'KR', 300),
    ('HKD', 'دلار هنگ‌کنگ', 'HK$', 'HK', 54000),
    ('SEK', 'کرون سوئد', 'kr', 'SE', 39000),
    ('NOK', 'کرون نروژ', 'kr', 'NO', 39000),
]


class _CompanyScopedViewSet(viewsets.ModelViewSet):
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    def get_company(self):
        return getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)

    def get_queryset(self):
        qs = super().get_queryset()
        company = self.get_company()
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.get_company())


class AdditionViewSet(_CompanyScopedViewSet):
    serializer_class = AdditionSerializer
    queryset = Addition.objects.all()
    search_fields = ['code', 'description']
    ordering = ['code']


class DeductionViewSet(_CompanyScopedViewSet):
    serializer_class = DeductionSerializer
    queryset = Deduction.objects.all()
    search_fields = ['code', 'description']
    ordering = ['code']


class CurrencyViewSet(_CompanyScopedViewSet):
    serializer_class = CurrencySerializer
    queryset = Currency.objects.all()
    search_fields = ['code', 'name', 'symbol']
    ordering = ['code']

    @action(detail=False, methods=['post'])
    def seed_defaults(self, request):
        """Create the default 24 currencies for the current company (idempotent)."""
        company = self.get_company()
        if not company:
            return Response({'error': 'شرکت جاری یافت نشد'}, status=404)
        existing = set(Currency.objects.filter(company=company).values_list('code', flat=True))
        created = 0
        for code, name, symbol, cc, rate in DEFAULT_CURRENCIES:
            if code in existing:
                continue
            Currency.objects.create(
                company=company, code=code, name=name, symbol=symbol, country_code=cc,
                exchange_rate=rate,
            )
            created += 1
        return Response({'created': created, 'total': Currency.objects.filter(company=company).count()})
