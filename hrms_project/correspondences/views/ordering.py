"""مرتب‌سازی عددی فیلدهای متنی نامه — «شماره ثبت ورود به واحد».

مقادیر این فیلد متنی‌اند و ممکن است به شکل «1404/457» ثبت شوند؛ برای اینکه
«آخرین شماره اول» بیاید، رقم‌ها استخراج و به عدد تبدیل می‌شوند. مقدار خالی یا
بدون رقم به NULL تبدیل می‌شود تا همیشه ته فهرست بیفتد (``nulls_last``).
"""
from django.db.models import BigIntegerField, CharField, F, Func, IntegerField, Value
from django.db.models.functions import Cast, NullIf

from correspondences.views.base import filters

REG_NO_ORDERING_FIELDS = ('reg_no', 'unit_reg_no')
REG_NO_SORT_ANNOTATION = '_unit_reg_no_sort'

# مرتب‌سازی «شمارهٔ صادره»: سال دو رقمی و شمارهٔ سری از انتهای/ابتدا استخراج می‌شوند
OUT_NO_ORDERING_FIELDS = ('out_no', 'number_year')
OUT_NO_SEQ_ANNOTATION = '_out_no_seq'
OUT_NO_YEAR_ANNOTATION = '_out_no_year'


def _out_no_annotations():
    """حاشیه‌نویسی سال و شمارهٔ سری برای مرتب‌سازی «آخرین سری اول».

    فقط شماره‌های قالب‌دار (``SEQ/PREFIX/YY``) مقدار می‌گیرند؛ شماره‌های ساده
    (مثل شمارهٔ سری دانشگاه) ``NULL`` می‌شوند تا ته فهرست بیایند.
    """
    year_text = Func(F('number'), Value(r'/(\d{2})$'), function='substring',
                     output_field=CharField())
    seq_text = Func(F('number'), Value(r'^(\d+)/'), function='substring',
                    output_field=CharField())
    return {
        OUT_NO_YEAR_ANNOTATION: Cast(year_text, output_field=IntegerField()),
        OUT_NO_SEQ_ANNOTATION: Cast(seq_text, output_field=BigIntegerField()),
    }

# فیلدهای تاریخ: در حالت مرتب‌سازی، ردیف‌های بدون تاریخ همیشه ته فهرست می‌آیند
DATE_ORDER_FIELDS = (
    'letter_date', 'received_date', 'sent_date', 'due_date', 'effective_date',
    'created_at', 'updated_at',
)


def _ordering_expression(term):
    """ترتیب فیلدهای تاریخ را با ``nulls_last`` می‌سازد (نامهٔ بدون تاریخ ته فهرست)."""
    text = str(term)
    descending = text.startswith('-')
    name = text.lstrip('-')
    if name not in DATE_ORDER_FIELDS:
        return term
    key = F(name)
    return key.desc(nulls_last=True) if descending else key.asc(nulls_last=True)


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

        out_terms = [term for term in ordering if str(term).lstrip('-') in OUT_NO_ORDERING_FIELDS]
        if out_terms:
            others = [term for term in ordering if term not in out_terms]
            descending = str(out_terms[0]).startswith('-')
            annotated = queryset.annotate(**_out_no_annotations())
            year_key = F(OUT_NO_YEAR_ANNOTATION)
            seq_key = F(OUT_NO_SEQ_ANNOTATION)
            if descending:
                primary = (year_key.desc(nulls_last=True), seq_key.desc(nulls_last=True))
            else:
                primary = (year_key.asc(nulls_last=True), seq_key.asc(nulls_last=True))
            tail = [_ordering_expression(term) for term in others] if others else ['-id']
            return annotated.order_by(*primary, *tail)

        reg_terms = [term for term in ordering if str(term).lstrip('-') in REG_NO_ORDERING_FIELDS]
        if not reg_terms:
            return queryset.order_by(*[_ordering_expression(term) for term in ordering]) \
                if ordering else queryset

        others = [term for term in ordering if term not in reg_terms]
        descending = str(reg_terms[0]).startswith('-')
        annotated = queryset.annotate(**{REG_NO_SORT_ANNOTATION: reg_no_sort_expression()})
        key = F(REG_NO_SORT_ANNOTATION)
        primary = key.desc(nulls_last=True) if descending else key.asc(nulls_last=True)
        tail = [_ordering_expression(term) for term in others] if others else ['-id']
        return annotated.order_by(primary, *tail)
