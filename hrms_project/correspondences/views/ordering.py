"""مرتب‌سازی عددی فیلدهای متنی نامه — «شماره ثبت ورود به واحد».

مقادیر این فیلد متنی‌اند و ممکن است به شکل «1404/457» ثبت شوند؛ برای اینکه
«آخرین شماره اول» بیاید، رقم‌ها استخراج و به عدد تبدیل می‌شوند. مقدار خالی یا
بدون رقم به NULL تبدیل می‌شود تا همیشه ته فهرست بیفتد (``nulls_last``).
"""
from django.db.models import BigIntegerField, CharField, F, Func, Value
from django.db.models.functions import Cast, NullIf

from correspondences.views.base import filters

REG_NO_ORDERING_FIELDS = ('reg_no', 'unit_reg_no')
REG_NO_SORT_ANNOTATION = '_unit_reg_no_sort'


def reg_no_sort_expression():
    """عبارت عددی «شمارهٔ ثبت» برای مرتب‌سازی (PostgreSQL)."""
    digits = Func(
        F('unit_reg_no'),
        Value('[^0-9]'),
        Value(''),
        Value('g'),
        function='regexp_replace',
        output_field=CharField(),
    )
    return Cast(NullIf(digits, Value('')), output_field=BigIntegerField())


class LetterOrderingFilter(filters.OrderingFilter):
    """``OrderingFilter`` با پشتیبانی از مرتب‌سازی عددی «شمارهٔ ثبت».

    ``?ordering=-reg_no`` آخرین شمارهٔ ثبت را اول می‌آورد و نامه‌های بدون
    شماره را ته فهرست می‌گذارد؛ بقیهٔ فیلدها مثل قبل متنی مرتب می‌شوند.
    """

    def filter_queryset(self, request, queryset, view):
        ordering = self.get_ordering(request, queryset, view) or []
        reg_terms = [term for term in ordering if str(term).lstrip('-') in REG_NO_ORDERING_FIELDS]
        if not reg_terms:
            return queryset.order_by(*ordering) if ordering else queryset

        others = [term for term in ordering if term not in reg_terms]
        descending = str(reg_terms[0]).startswith('-')
        annotated = queryset.annotate(**{REG_NO_SORT_ANNOTATION: reg_no_sort_expression()})
        key = F(REG_NO_SORT_ANNOTATION)
        primary = key.desc(nulls_last=True) if descending else key.asc(nulls_last=True)
        return annotated.order_by(primary, *(others or ['-id']))
