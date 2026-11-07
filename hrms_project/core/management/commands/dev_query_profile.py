"""پروفایل زمان و کوئری‌های یک اندپوینت DRF (ابزار توسعه).

هدف: تشخیص سریع N+1 و کوئری‌های کند در فهرست‌ها و داشبوردها.

نمونه:
    python manage.py dev_query_profile
    python manage.py dev_query_profile --schema kpsmi --params "page_size=20&search=بایگانی"
    python manage.py dev_query_profile --action stats --path /api/letters/stats/ --params ""
    python manage.py dev_query_profile --viewset documents.management_views.ManagedDocumentViewSet \
        --path /api/document-management/documents/ --params "page_size=20"

خروجی: زمان کل، تعداد کوئری (بدون SET search_path)، کوئری‌های کند و کوئری‌های تکراری.
"""
from __future__ import annotations

import time
from collections import Counter

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils.module_loading import import_string

DEFAULT_VIEWSET = 'correspondences.views.LetterViewSet'


class Command(BaseCommand):
    help = 'پروفایل کوئری/زمان یک اندپوینت DRF برای تشخیص N+1 و کندی'

    def add_arguments(self, parser):
        parser.add_argument('--schema', default='kpsmi', help='نام اسکیمای شرکت (پیش‌فرض kpsmi)')
        parser.add_argument('--viewset', default=DEFAULT_VIEWSET,
                            help='مسیر کلاس ویوسِت، مثل app.views.MyViewSet')
        parser.add_argument('--action', default='list', help='اکشن ویوسِت (list / retrieve / stats …)')
        parser.add_argument('--path', default='/api/letters/', help='مسیر برای ساخت request')
        parser.add_argument('--params', default='page_size=20&ordering=-letter_date',
                            help='querystring مثل page_size=20&search=test')
        parser.add_argument('--host', default='192.168.1.63',
                            help='HTTP_HOST (برای build_absolute_uri لازم است)')
        parser.add_argument('--slow', type=int, default=5, help='تعداد کوئری کند نمایش‌داده‌شده')
        parser.add_argument('--repeat', type=int, default=8,
                            help='حد آستانهٔ تکرار برای گزارش N+1')

    def _params(self, raw):
        params = {}
        for chunk in str(raw or '').split('&'):
            if not chunk:
                continue
            key, _, value = chunk.partition('=')
            if key:
                params[key] = value
        return params

    def handle(self, *args, **options):
        from django_tenants.utils import schema_context
        from rest_framework.test import APIRequestFactory, force_authenticate

        try:
            viewset_cls = import_string(options['viewset'])
        except Exception as exc:  # noqa: BLE001
            raise CommandError(f'ویوسِت پیدا نشد: {options["viewset"]} ({exc})') from exc

        factory = APIRequestFactory()
        user_model = get_user_model()
        view = viewset_cls.as_view({'get': options['action']})
        params = self._params(options['params'])

        with schema_context(options['schema']):
            user = user_model.objects.filter(is_superuser=True).first() or user_model.objects.first()
            if user is None:
                raise CommandError('هیچ کاربری برای احراز هویت تست پیدا نشد.')

            request = factory.get(options['path'], params, HTTP_HOST=options['host'])
            force_authenticate(request, user=user)

            view(request)  # گرم‌کردن اتصال/کش

            with CaptureQueriesContext(connection) as ctx:
                started = time.perf_counter()
                response = view(request)
                elapsed_ms = (time.perf_counter() - started) * 1000

        payload = getattr(response, 'data', b'')
        queries = ctx.captured_queries
        business = [q for q in queries if not q['sql'].lstrip().upper().startswith('SET ')]

        self.stdout.write(f'endpoint : {options["viewset"]}.{options["action"]}')
        self.stdout.write(f'params   : {options["params"] or "(none)"}')
        self.stdout.write(self.style.MIGRATE_HEADING(
            f'total    : {elapsed_ms:.0f} ms | {len(queries)} queries '
            f'({len(business)} business) | payload {len(str(payload)) / 1024:.0f} KB',
        ))
        if isinstance(payload, dict) and 'results' in payload:
            self.stdout.write(
                f'rows     : {len(payload.get("results") or [])} | count {payload.get("count")}',
            )

        for query in sorted(business, key=lambda row: row['time'], reverse=True)[:options['slow']]:
            sql = ' '.join(query['sql'].split())
            self.stdout.write(f'  slow {query["time"]}s  {sql[:150]}')

        counts = Counter(' '.join(q['sql'].split())[:120] for q in business)
        repeated = [(sql, count) for sql, count in counts.most_common() if count >= options['repeat']]
        if repeated:
            self.stdout.write(self.style.WARNING('repeated queries (possible N+1):'))
            for sql, count in repeated[:6]:
                self.stdout.write(self.style.WARNING(f'  {count}x  {sql}'))
        else:
            self.stdout.write(self.style.SUCCESS('repeated queries: none'))
