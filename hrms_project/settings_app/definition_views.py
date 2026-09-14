"""CRUD viewsets for initial definitions: additions, deductions, currencies."""
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from settings_app.models import Addition, Deduction, Currency
from settings_app.serializers import (
    AdditionSerializer, DeductionSerializer, CurrencySerializer,
)

# ~24 major traded currencies (code, name(FA), symbol, country_code for flag).
DEFAULT_CURRENCIES = [
    ('IRR', 'ریال ایران', '﷼', 'IR'),
    ('USD', 'دلار آمریکا', '$', 'US'),
    ('EUR', 'یورو', '€', 'EU'),
    ('GBP', 'پوند بریتانیا', '£', 'GB'),
    ('JPY', 'ین ژاپن', '¥', 'JP'),
    ('CNY', 'یوآن چین', '¥', 'CN'),
    ('CHF', 'فرانک سوئیس', 'CHF', 'CH'),
    ('CAD', 'دلار کانادا', 'C$', 'CA'),
    ('AUD', 'دلار استرالیا', 'A$', 'AU'),
    ('NZD', 'دلار نیوزیلند', 'NZ$', 'NZ'),
    ('AED', 'درهم امارات', 'د.إ', 'AE'),
    ('SAR', 'ریال عربستان', '﷼', 'SA'),
    ('TRY', 'لیر ترکیه', '₺', 'TR'),
    ('RUB', 'روبل روسیه', '₽', 'RU'),
    ('INR', 'روپیه هند', '₹', 'IN'),
    ('PKR', 'روپیه پاکستان', '₨', 'PK'),
    ('AFN', 'افغانی', '؋', 'AF'),
    ('IQD', 'دینار عراق', 'ع.د', 'IQ'),
    ('KWD', 'دینار کویت', 'د.ك', 'KW'),
    ('QAR', 'ریال قطر', '﷼', 'QA'),
    ('OMR', 'ریال عمان', '﷼', 'OM'),
    ('BHD', 'دینار بحرین', 'د.ب', 'BH'),
    ('MYR', 'رینگیت مالزی', 'RM', 'MY'),
    ('SGD', 'دلار سنگاپور', 'S$', 'SG'),
    ('KRW', 'وون کرهٔ جنوبی', '₩', 'KR'),
    ('HKD', 'دلار هنگ‌کنگ', 'HK$', 'HK'),
    ('SEK', 'کرون سوئد', 'kr', 'SE'),
    ('NOK', 'کرون نروژ', 'kr', 'NO'),
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
        for code, name, symbol, cc in DEFAULT_CURRENCIES:
            if code in existing:
                continue
            Currency.objects.create(
                company=company, code=code, name=name, symbol=symbol, country_code=cc,
            )
            created += 1
        return Response({'created': created, 'total': Currency.objects.filter(company=company).count()})
