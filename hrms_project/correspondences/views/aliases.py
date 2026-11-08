"""نگاشت نام‌های مکاتبات (مایزکار ستون‌محور)."""
from correspondences.views.base import (  # noqa: F401 — واردات مشترک

    AllowAny, Count, FileResponse, Http404, JWTAuthentication, PermissionDenied, Q, Response,
    Sum, action, date_cls, filters, http_status, parsers, serializers, timezone, timedelta,
    viewsets,
    CorrespondenceNameAlias, Correspondent, Letter, LetterAttachment, LetterCategory,
    LetterEvent, LetterReferral, LetterRequest, LetterRequestEvent, LetterRequestType,
    LetterSeries,
    allocate_number, preview_number, request_number,
    issue_token, read_token,
    REQUESTS_MENUS, CorrespondencePermissionMixin, DefinitionPermissionMixin,
    can_download_attachment, can_read_confidential, confidential_letter_filter,
    correspondence_has_permission, menus_for_direction, perm_READ_MENUS,
    referral_to_me_filter, require_correspondence,
    content_type_of, is_inline_safe, stored_filename, validate_attachment,
    CorrespondenceNameAliasListSerializer, CorrespondenceNameAliasSerializer,
    CorrespondentSerializer, LetterAttachmentSerializer, LetterCategorySerializer,
    LetterEventSerializer, LetterListSerializer, LetterReferralSerializer,
    LetterRequestSerializer, LetterRequestTypeSerializer, LetterSeriesSerializer,
    LetterSerializer,
    FINAL_STATUSES, OPEN_REFERRAL_STATUSES, JALALI_MONTHS, _jdate, BaseLetterViewSet,
    _company_scoped, _create_referral, _delete_media_file, _employee_of_user, _get_company,
    _log_event, _my_name_variants, _my_referral_filter, _raw_referral_names_for, _truthy,
    _user_employee, _user_name, _user_of_employee,
)


class CorrespondenceNameAliasViewSet(CorrespondencePermissionMixin, BaseLetterViewSet):
    """نگاشت نام‌های خام (اکسل) به پرسنل / طرف حساب / مخاطب / سازمان / نوع مکاتبه.

    - ``list``   فهرست سبک (سریالایزر بدون یادداشت) برای جدول
    - ``groups`` یک ردیف برای هر نام، همراه همهٔ مقصدها («نگاشت چند مقصده»)
    - ``meta``   فرادادهٔ کاربردهای تخصصی + شمارش‌ها (بدون اسکن سنگین)
    - ``summary``/``unmapped``/``suggestions``/``apply``/``apply-all`` مطابق قبل
    """

    permission_label = 'نگاشت نام‌های مکاتبات'
    permission_matrix = {
        'list': ('view', 'aliases'),
        'retrieve': ('view', 'aliases'),
        'create': ('edit', 'aliases'),
        'update': ('edit', 'aliases'),
        'partial_update': ('edit', 'aliases'),
        'destroy': ('delete', 'aliases'),
        'summary': ('view', 'aliases'),
        'meta': ('view', 'aliases'),
        'groups': ('view', 'aliases'),
        'columns': ('view', 'aliases'),
        'unmapped': ('view', 'aliases'),
        'suggestions': ('view', 'aliases'),
        'apply': ('edit', 'aliases'),
        'apply_all': ('edit', 'aliases'),
        'apply_batch': ('edit', 'aliases'),
    }

    serializer_class = CorrespondenceNameAliasSerializer
    queryset = CorrespondenceNameAlias.objects.all()

    # ترتیب ستون‌های صفحهٔ نگاشت (بدون «همهٔ فیلدها» که فقط fallback است)
    WORKSPACE_SCOPES = (
        'counterparty', 'sender', 'receiver', 'contact', 'organization',
        'delivery', 'referral', 'referral_target', 'subject',
    )
    search_fields = [
        'raw_name', 'normalized', 'note',
        'employee__first_name', 'employee__last_name', 'employee__employee_id',
        'party__name', 'correspondent__name', 'organization__name', 'category__name',
    ]
    ordering_fields = ['raw_name', 'scope', 'target_kind', 'applied_count',
                       'last_applied_at', 'created_at']
    ordering = ['-applied_count', 'raw_name']

    def get_serializer_class(self):
        if self.action == 'list':
            return CorrespondenceNameAliasListSerializer
        return CorrespondenceNameAliasSerializer

    def get_queryset(self):
        qs = super().get_queryset().select_related(
            'employee', 'party', 'correspondent', 'organization', 'category',
        )
        params = self.request.query_params
        # در ``groups`` فیلتر نوع مقصد باید روی «همهٔ مقصدهای یک نام» اعمال شود،
        # نه روی ردیف‌ها؛ وگرنه برچسب خط‌تیره‌ای ناقص می‌شود.
        if params.get('target_kind') and self.action != 'groups':
            qs = qs.filter(target_kind=params['target_kind'])
        if params.get('scope'):
            qs = qs.filter(scope=params['scope'])
        mode = params.get('mode')
        if mode == 'dual':
            qs = qs.filter(bidirectional=True)
        elif mode == 'single':
            qs = qs.filter(bidirectional=False)
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['company'] = _get_company(self.request)
        return context

    def filter_queryset(self, queryset):
        """جست‌وجوی DRF روی روابط، ردیف تکراری می‌سازد؛ در حالت جست‌وجو distinct می‌کنیم."""
        filtered = super().filter_queryset(queryset)
        if (self.request.query_params.get('search') or '').strip():
            return filtered.distinct()
        return filtered

    # ------------------------------------------------------------------ ابزار
    def _company(self):
        return _get_company(self.request)

    def _employee_candidates(self, company):
        from employees.models import Employee

        return list(
            Employee.objects.filter(company=company, is_active=True).select_related(
                'department', 'job_title',
            ),
        )

    def _party_candidates(self, company):
        from contracts.models import ContractParty

        return list(ContractParty.objects.filter(company=company, is_active=True))

    def _organization_candidates(self, company):
        return list(Organization.objects.filter(company=company, is_active=True))

    def _correspondent_candidates(self, company):
        return list(Correspondent.objects.filter(company=company, is_active=True))

    def _category_candidates(self, company):
        return list(LetterCategory.objects.filter(company=company, is_active=True))

    def _suggestions_for(self, raw, kind=None, employees=None, parties=None,
                         organizations=None, correspondents=None, categories=None,
                         limit=4):
        """کاندیدهای پیشنهادی برای یک نام خام."""
        from correspondences import matching

        company = self._company()
        rows = []
        if kind in (None, '', 'employee'):
            pool = employees if employees is not None else self._employee_candidates(company)
            for match in matching.best_matches(
                raw, pool, limit=limit, key=lambda emp: emp.full_name,
            ):
                employee = match['item']
                rows.append({
                    'kind': 'employee',
                    'id': employee.id,
                    'label': employee.full_name
                             + (f' ({employee.employee_id})' if employee.employee_id else ''),
                    'secondary': ' · '.join(filter(None, [
                        getattr(employee.department, 'name', ''),
                        getattr(employee.job_title, 'name', ''),
                    ])),
                    'score': match['score'],
                })
        if kind in (None, '', 'party'):
            pool = parties if parties is not None else self._party_candidates(company)
            for match in matching.best_matches(
                raw, pool, limit=limit, key=lambda party: party.name,
            ):
                party = match['item']
                rows.append({
                    'kind': 'party',
                    'id': party.id,
                    'label': party.name,
                    'secondary': party.get_party_type_display(),
                    'score': match['score'],
                })
        if kind in (None, '', 'organization'):
            pool = (organizations if organizations is not None
                    else self._organization_candidates(company))
            for match in matching.best_matches(
                raw, pool, limit=limit, key=lambda org: org.name,
            ):
                organization = match['item']
                rows.append({
                    'kind': 'organization',
                    'id': organization.id,
                    'label': organization.name,
                    'secondary': organization.get_type_display(),
                    'score': match['score'],
                })
        if kind in (None, '', 'correspondent'):
            pool = (correspondents if correspondents is not None
                    else self._correspondent_candidates(company))
            for match in matching.best_matches(
                raw, pool, limit=limit, key=lambda item: item.name,
            ):
                correspondent = match['item']
                rows.append({
                    'kind': 'correspondent',
                    'id': correspondent.id,
                    'label': correspondent.name,
                    'secondary': correspondent.get_kind_display(),
                    'score': match['score'],
                })
        if kind in (None, '', 'category'):
            pool = categories if categories is not None else self._category_candidates(company)
            for match in matching.best_matches(
                raw, pool, limit=limit, key=lambda item: item.name,
            ):
                category = match['item']
                rows.append({
                    'kind': 'category',
                    'id': category.id,
                    'label': category.name,
                    'secondary': category.get_direction_display(),
                    'score': match['score'],
                })
        rows.sort(key=lambda item: item['score'], reverse=True)
        return rows[:limit]

    # ------------------------------------------------------------------ خلاصه
    def _summary_payload(self, company, with_unmapped=False):
        """شمارش‌های سبک نگاشت‌ها (یک کوئری) + در صورت نیاز «نام‌های بدون نگاشت»."""
        empty = {
            'aliases': 0, 'names': 0, 'multi': 0, 'bidirectional': 0, 'applied': 0,
            'unmapped': 0, 'by_kind': {}, 'by_scope': {},
        }
        if not company:
            return empty
        rows = list(CorrespondenceNameAlias.objects.filter(
            company=company, is_active=True,
        ).values('target_kind', 'scope', 'normalized', 'applied_count', 'bidirectional'))

        groups = {}
        for row in rows:
            key = (row['normalized'], row['scope'])
            groups[key] = groups.get(key, 0) + 1
        by_kind = {}
        by_scope = {}
        for row in rows:
            by_kind[row['target_kind']] = by_kind.get(row['target_kind'], 0) + 1
            by_scope[row['scope']] = by_scope.get(row['scope'], 0) + 1

        payload = {
            'aliases': len(rows),
            'names': len(groups),
            'multi': sum(1 for count in groups.values() if count > 1),
            'bidirectional': sum(1 for row in rows if row['bidirectional']),
            'applied': sum(row['applied_count'] or 0 for row in rows),
            'unmapped': 0,
            'by_kind': by_kind,
            'by_scope': by_scope,
        }
        if with_unmapped:
            from correspondences import matching

            covered = {(row['scope'], row['normalized']) for row in rows}
            any_covered = {row['normalized'] for row in rows if row['scope'] == 'any'}
            keys = {
                (sample['scope'], sample['normalized'])
                for sample in matching.iter_name_samples(company)
            }
            payload['unmapped'] = len({
                key for key in keys
                if key not in covered and key[1] not in any_covered
            })
        return payload

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """خلاصهٔ وضعیت نگاشت: تعداد نگاشت‌ها و نام‌های باقی‌مانده."""
        return Response(self._summary_payload(self._company(), with_unmapped=True))

    @action(detail=False, methods=['get'])
    def meta(self, request):
        """فرادادهٔ کاربردهای تخصصی نگاشت + شمارش‌ها (صفحهٔ مستقل نگاشت نام‌ها)."""
        from correspondences import alias_purposes

        summary = self._summary_payload(self._company())
        scope_labels = dict(CorrespondenceNameAlias.SCOPES)
        return Response({
            'purposes': alias_purposes.purposes_payload(summary['by_scope'], scope_labels),
            'purpose_groups': alias_purposes.purpose_groups(),
            'target_kinds': [
                {'key': key, 'label': str(label)}
                for key, label in CorrespondenceNameAlias.TARGET_KINDS
            ],
            'paired_scopes': {
                scope: alias_purposes.paired_scope(scope)
                for scope in scope_labels
                if alias_purposes.paired_scope(scope)
            },
            'summary': summary,
        })
    @action(detail=False, methods=['get'])
    def groups(self, request):
        """یک ردیف برای هر نام، همراه همهٔ مقصدها (نمایش خط‌تیره‌ای مقصدهای چندگانه)."""
        from correspondences import alias_purposes

        params = request.query_params
        queryset = self.get_queryset()
        search = (params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(raw_name__icontains=search)
                | Q(normalized__icontains=search)
                | Q(employee__first_name__icontains=search)
                | Q(employee__last_name__icontains=search)
                | Q(employee__employee_id__icontains=search)
                | Q(party__name__icontains=search)
                | Q(correspondent__name__icontains=search)
                | Q(organization__name__icontains=search)
                | Q(category__name__icontains=search)
            )
        try:
            limit = min(500, max(1, int(params.get('limit') or 200)))
        except (TypeError, ValueError):
            limit = 200

        rows = list(
            queryset.order_by('normalized', 'scope', 'order', 'id')[: limit * 4],
        )
        grouped = {}
        for alias in rows:
            key = f'{alias.normalized}|{alias.scope}'
            entry = grouped.get(key)
            if entry is None:
                entry = {
                    'key': key,
                    'raw_name': alias.raw_name,
                    'normalized': alias.normalized,
                    'scope': alias.scope,
                    'scope_label': alias.get_scope_display(),
                    'bidirectional': bool(alias.bidirectional),
                    'applied_scopes': [],
                    'targets': [],
                    'applied_count': 0,
                    'last_applied_at': None,
                }
                grouped[key] = entry
            entry['targets'].append({
                'id': alias.id,
                'target_kind': alias.target_kind,
                'target_kind_display': alias.get_target_kind_display(),
                'target_id': alias.target_ids.get(alias.target_kind),
                'label': alias.target_label or alias_purposes.EMPTY_LABEL,
                'order': alias.order,
                'applied_count': alias.applied_count or 0,
                'last_applied_at': alias.last_applied_at,
            })
            entry['applied_count'] += alias.applied_count or 0
            entry['bidirectional'] = entry['bidirectional'] or bool(alias.bidirectional)
            for scope in alias.applied_scopes:
                if scope not in entry['applied_scopes']:
                    entry['applied_scopes'].append(scope)
            if alias.last_applied_at and (
                entry['last_applied_at'] is None
                or alias.last_applied_at > entry['last_applied_at']
            ):
                entry['last_applied_at'] = alias.last_applied_at

        results = []
        for entry in grouped.values():
            entry['targets'].sort(key=lambda item: (item['order'] or 0, item['id']))
            entry['target_count'] = len(entry['targets'])
            entry['targets_label'] = alias_purposes.join_target_labels(
                [item['label'] for item in entry['targets']],
            )
            entry['target_kinds'] = list(dict.fromkeys(
                item['target_kind'] for item in entry['targets']
            ))
            results.append(entry)

        scope = params.get('scope')
        if scope:
            results = [row for row in results if row['scope'] == scope]
        target_kind = params.get('target_kind')
        if target_kind:
            results = [row for row in results if target_kind in row['target_kinds']]
        if str(params.get('multi') or '').lower() in ('1', 'true', 'yes'):
            results = [row for row in results if row['target_count'] > 1]

        results.sort(key=lambda row: (-row['applied_count'], row['raw_name']))
        return Response({'count': len(results), 'results': results[:limit]})

    @action(detail=False, methods=['get'])
    def columns(self, request):
        """ستون‌های قابل نگاشت + شمارش نام‌ها/بدون‌نگاشت/ردیف‌ها (بازطراحی صفحهٔ نگاشت)."""
        from correspondences import alias_purposes, matching

        company = self._company()
        if not company:
            return Response([])
        labels = dict(CorrespondenceNameAlias.SCOPES)
        alias_rows = list(CorrespondenceNameAlias.objects.filter(
            company=company, is_active=True,
        ).values('scope', 'normalized'))
        covered = {(row['scope'], row['normalized']) for row in alias_rows}
        any_covered = {row['normalized'] for row in alias_rows if row['scope'] == 'any'}

        per_scope = {}
        for sample in matching.iter_name_samples(company):
            entry = per_scope.setdefault(sample['scope'], {
                'names': set(), 'unmapped': set(), 'rows': 0,
            })
            entry['names'].add(sample['normalized'])
            entry['rows'] += sample['count']
            if (sample['scope'], sample['normalized']) not in covered \
                    and sample['normalized'] not in any_covered:
                entry['unmapped'].add(sample['normalized'])

        alias_counts = {}
        for row in alias_rows:
            alias_counts[row['scope']] = alias_counts.get(row['scope'], 0) + 1

        rows = []
        for scope in self.WORKSPACE_SCOPES:
            purpose = alias_purposes.PURPOSE_BY_KEY.get(scope, {})
            data = per_scope.get(scope, {'names': set(), 'unmapped': set(), 'rows': 0})
            names = len(data['names'])
            unmapped = len(data['unmapped'])
            rows.append({
                'key': scope,
                'label': labels.get(scope, scope),
                'group': purpose.get('group') or '',
                'description': purpose.get('description') or '',
                'target_kinds': list(purpose.get('target_kinds') or ()),
                'paired': purpose.get('paired'),
                'names': names,
                'mapped': max(0, names - unmapped),
                'unmapped': unmapped,
                'rows': data['rows'],
                'aliases': alias_counts.get(scope, 0),
            })
        return Response(rows)

    @action(detail=False, methods=['get'])
    def unmapped(self, request):
        """نام‌های موجود در داده‌ها که هنوز نگاشت نشده‌اند + پیشنهاد."""
        from correspondences import matching

        company = self._company()
        if not company:
            return Response([])
        rows = list(CorrespondenceNameAlias.objects.filter(
            company=company, is_active=True,
        ).values('scope', 'normalized'))
        covered = {(row['scope'], row['normalized']) for row in rows}
        any_covered = {row['normalized'] for row in rows if row['scope'] == 'any'}
        scope_filter = (request.query_params.get('scope') or '').strip()
        kinds_param = [
            item.strip() for item in (request.query_params.get('kinds') or '').split(',')
            if item.strip()
        ]
        search = (request.query_params.get('search') or '').strip()
        try:
            limit = min(200, max(1, int(request.query_params.get('limit') or 60)))
        except (TypeError, ValueError):
            limit = 60

        employees = self._employee_candidates(company)
        parties = self._party_candidates(company)
        organizations = self._organization_candidates(company)
        correspondents = self._correspondent_candidates(company)
        categories = self._category_candidates(company)
        aggregated = {}
        for sample in matching.iter_name_samples(company):
            if scope_filter and sample['scope'] != scope_filter:
                continue
            if search and search not in sample['raw']:
                continue
            key = (sample['scope'], sample['normalized'])
            if key in covered or sample['normalized'] in any_covered:
                continue
            entry = aggregated.setdefault(sample['normalized'], {
                'raw_name': sample['raw'], 'normalized': sample['normalized'],
                'count': 0, 'scopes': [],
            })
            entry['count'] += sample['count']
            if sample['scope'] not in entry['scopes']:
                entry['scopes'].append(sample['scope'])
        ordered = sorted(aggregated.values(), key=lambda item: item['count'], reverse=True)
        for row in ordered[:limit]:
            if kinds_param:
                suggestions, seen = [], set()
                for kind in kinds_param:
                    for item in self._suggestions_for(
                        row['raw_name'], kind, employees=employees, parties=parties,
                        organizations=organizations, correspondents=correspondents,
                        categories=categories, limit=3,
                    ):
                        key = (item['kind'], item['id'])
                        if key in seen:
                            continue
                        seen.add(key)
                        suggestions.append(item)
                suggestions.sort(key=lambda item: item.get('score') or 0, reverse=True)
                row['suggestions'] = suggestions[:6]
            else:
                row['suggestions'] = self._suggestions_for(
                    row['raw_name'], None, employees=employees, parties=parties,
                    organizations=organizations, correspondents=correspondents,
                    categories=categories, limit=6,
                )
        return Response(ordered[:limit])

    @action(detail=False, methods=['get'])
    def suggestions(self, request):
        """پیشنهاد پرسنل/طرف حساب برای یک نام (اتوکامپلیت)."""
        from correspondences import matching

        company = self._company()
        raw = (request.query_params.get('q') or '').strip()
        kind = request.query_params.get('kind') or ''
        if not company or not raw:
            return Response([])
        query = matching.normalize_name(raw)
        employees = [
            emp for emp in self._employee_candidates(company)
            if not query or query in matching.normalize_name(emp.full_name)
            or any(query in matching.normalize_name(part)
                   for part in (emp.first_name, emp.last_name, emp.employee_id))
        ][:80]
        parties = [
            party for party in self._party_candidates(company)
            if not query or query in matching.normalize_name(party.name)
        ][:80]
        organizations = [
            org for org in self._organization_candidates(company)
            if not query or query in matching.normalize_name(org.name)
        ][:80]
        correspondents = [
            item for item in self._correspondent_candidates(company)
            if not query or query in matching.normalize_name(item.name)
        ][:80]
        categories = [
            item for item in self._category_candidates(company)
            if not query or query in matching.normalize_name(item.name)
        ][:80]
        return Response(self._suggestions_for(
            raw, kind or None, employees=employees, parties=parties,
            organizations=organizations, correspondents=correspondents,
            categories=categories, limit=8,
        ))

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """اعمال یک نگاشت روی داده‌های موجود (با پشتیبانی از dry-run)."""
        from correspondences import mapping

        alias = self.get_object()
        dry_run = str(request.data.get('dry_run') or '').lower() in ('1', 'true', 'yes')
        result = mapping.apply_alias(alias, dry_run=dry_run)
        alias.refresh_from_db()
        result['alias_data'] = CorrespondenceNameAliasSerializer(
            alias, context=self.get_serializer_context(),
        ).data
        return Response(result)

    @action(detail=False, methods=['post'], url_path='apply-batch')
    def apply_batch(self, request):
        """اعمال گروهی نگاشت‌ها (یک ستون یا چند شناسه) در **یک** درخواست."""
        from correspondences import mapping

        company = self._company()
        if not company:
            return Response({'detail': 'شرکت مشخص نیست.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        dry_run = str(request.data.get('dry_run') or '').lower() in ('1', 'true', 'yes')
        scope = (request.data.get('scope') or '').strip() or None
        alias_ids = request.data.get('ids') or []
        if isinstance(alias_ids, str):
            alias_ids = [item.strip() for item in alias_ids.split(',') if item.strip()]
        if not scope and not alias_ids:
            return Response({'detail': 'ستون یا شناسهٔ نگاشت را مشخص کنید.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        return Response(mapping.apply_batch(
            company, alias_ids=alias_ids, scope=scope, dry_run=dry_run,
        ))

    @action(detail=False, methods=['post'], url_path='apply-all')
    def apply_all(self, request):
        """اعمال همهٔ نگاشت‌ها روی داده‌های موجود."""
        from correspondences import mapping

        company = self._company()
        if not company:
            return Response({'detail': 'شرکت مشخص نیست.'},
                            status=http_status.HTTP_400_BAD_REQUEST)
        dry_run = str(request.data.get('dry_run') or '').lower() in ('1', 'true', 'yes')
        return Response(mapping.apply_all(company, dry_run=dry_run))


