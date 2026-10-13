"""Views تعاریف اولیهٔ پروژه (نگاشت کل/معین/تفصیل) + تفصیل‌های پروژه."""
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from projects import audit
from projects.accounting_definitions import (
    SOURCE_LABELS, apply_template, auxiliaries_of_project, build_coding,
    effective_definitions, project_auxiliary, project_coding_usage, resolve_definition,
    suggested_rows,
)
from projects.definition_models import ProjectAccountDefinition
from projects.definition_serializers import ProjectAccountDefinitionSerializer
from projects.models import Project, ProjectType


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


class BaseProjectDefinitionViewSet(viewsets.ModelViewSet):
    """ViewSet پایه با محدودسازی به شرکت جاری و ثبت در دفترچهٔ فعالیت."""

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def _user(self):
        user = getattr(self.request, 'user', None)
        return user if getattr(user, 'is_authenticated', False) else None

    def perform_create(self, serializer):
        company = _company(self.request)
        user = self._user()
        instance = serializer.save(company=company)
        audit.log_object(user, instance, 'CREATE')

    def perform_update(self, serializer):
        user = self._user()
        instance = serializer.save()
        audit.log_object(user, instance, 'UPDATE')

    def perform_destroy(self, instance):
        user = self._user()
        audit.log_object(user, instance, 'DELETE',
                         description=f'حذف تعریف حسابداری پروژه {instance.code}')
        instance.delete()


class ProjectAccountDefinitionViewSet(BaseProjectDefinitionViewSet):
    """CRUD تعاریف اولیه + تعریف مؤثر + آزمایش نگاشت + قالب پیشنهادی."""

    serializer_class = ProjectAccountDefinitionSerializer
    queryset = ProjectAccountDefinition.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'title', 'description']
    ordering = ['sort_order', 'code']
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset().select_related(
            'general_account', 'subsidiary_account', 'cost_center', 'project', 'project_type',
        ).prefetch_related('auxiliary_rules')
        params = self.request.query_params
        if params.get('project'):
            qs = qs.filter(project_id=params['project'])
        if params.get('project_type'):
            qs = qs.filter(project_type_id=params['project_type'])
        if params.get('kind'):
            qs = qs.filter(kind=params['kind'])
        scope = params.get('scope')
        if scope == 'project':
            qs = qs.filter(project__isnull=False)
        elif scope == 'project_type':
            qs = qs.filter(project_type__isnull=False)
        elif scope == 'all':
            qs = qs.filter(project__isnull=True, project_type__isnull=True)
        return qs

    @action(detail=False, methods=['get'])
    def meta(self, request):
        """انواع آیتم و منابع تفصیل برای ساخت فرم."""
        return Response({
            'kinds': [{'value': v, 'label': l} for v, l in ProjectAccountDefinition.Kind.choices],
            'sources': [{'value': v, 'label': l} for v, l in SOURCE_LABELS.items()],
        })

    @action(detail=False, methods=['get'])
    def effective(self, request):
        """تعریف‌های مؤثر یک پروژه (پروژه ← نوع پروژه ← همهٔ پروژه‌ها).

        اگر `project` فرستاده نشود، تعریف‌های «عمومی/همهٔ پروژه‌ها» برگردانده می‌شود.
        با پارامتر `kind` (مثلاً `kind=expense`) فقط همان نوع آیتم خوانده می‌شود.
        """
        company = _company(request)
        project_id = _int(request.query_params.get('project'))
        kind = request.query_params.get('kind') or None
        project = None
        if project_id:
            project = Project.objects.filter(pk=project_id, company=company).select_related(
                'project_type').first()
            if project is None:
                return Response({'detail': 'پروژه یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        rows = effective_definitions(company, project, kind=kind)
        return Response({
            'project': {
                'id': project.pk, 'code': project.code, 'name': project.name,
                'project_type': project.project_type_id,
                'project_type_name': getattr(project.project_type, 'name', ''),
            } if project else None,
            'kind': kind or '',
            'definitions': ProjectAccountDefinitionSerializer(rows, many=True).data,
        })

    @action(detail=False, methods=['get'])
    def suggested(self, request):
        """قالب پیشنهادی تعاریف (فقط پیشنهاد؛ ساخت با تأیید کاربر)."""
        existing = set(self.get_queryset().values_list('code', flat=True))
        return Response([
            {**row, 'already_exists': row['code'] in existing} for row in suggested_rows()
        ])

    @action(detail=False, methods=['post'], url_path='apply-template')
    def apply_template(self, request):
        """ساخت تعریف‌های انتخاب‌شدهٔ کاربر در حوزهٔ مشخص‌شده."""
        company = _company(request)
        project_id = _int(request.data.get('project'))
        project_type_id = _int(request.data.get('project_type'))
        if bool(project_id) == bool(project_type_id):
            return Response(
                {'detail': 'یکی از «پروژه» یا «نوع پروژه» را به‌عنوان حوزه انتخاب کنید.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        project = Project.objects.filter(pk=project_id, company=company).first() if project_id else None
        project_type = ProjectType.objects.filter(pk=project_type_id, company=company).first() \
            if project_type_id else None
        if (project_id and project is None) or (project_type_id and project_type is None):
            return Response({'detail': 'حوزهٔ انتخاب‌شده یافت نشد.'},
                            status=status.HTTP_404_NOT_FOUND)
        rows = request.data.get('rows') or suggested_rows()
        result = apply_template(company, rows, project=project, project_type=project_type)
        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def preview(self, request):
        """آزمایش نگاشت روی یک پروژه/طرف/قرارداد.

        پیش‌فرض: هیچ تفصیلی ساخته نمی‌شود (``create`` خالی) و فقط نتیجه گزارش می‌شود؛
        برای ساخت واقعی تفصیل‌ها ``create: true`` بفرستید.
        """
        company = _company(request)
        project_id = _int(request.data.get('project'))
        project = Project.objects.filter(pk=project_id, company=company).select_related(
            'project_type').first() if project_id else None
        if project is None:
            return Response({'detail': 'پروژه الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        definition_id = _int(request.data.get('definition') or request.data.get('definition_id'))
        if definition_id:
            definition = resolve_definition(company, project, definition_id=definition_id)
            if definition is None:
                definition = ProjectAccountDefinition.objects.filter(
                    pk=definition_id, company=company,
                ).select_related(
                    'general_account', 'subsidiary_account', 'cost_center', 'project', 'project_type',
                ).first()
        else:
            definition = resolve_definition(
                company, project,
                code=request.data.get('code'), kind=request.data.get('kind'),
            )
        if definition is None:
            return Response({'detail': 'تعریف نگاشت برای این پروژه/کد یافت نشد.'},
                            status=status.HTTP_404_NOT_FOUND)

        coding = build_coding(
            definition, project=project,
            party=_lookup(request.data.get('party'), 'contracts.ContractParty', company),
            supplier=_lookup(request.data.get('supplier'), 'procurement.Supplier', company),
            contract=_lookup(request.data.get('contract'), 'contracts.Contract', company),
            employee=_lookup(request.data.get('employee'), 'employees.Employee', company),
            create=request.data.get('create'),
        )
        return Response(coding)



def _lookup(identifier, model_label, company):
    """یافتن یک موجودیت مرتبط برای آزمایش نگاشت (ایمن در برابر مدل ناموجود)."""
    if not identifier:
        return None
    from django.apps import apps

    try:
        model = apps.get_model(model_label)
    except LookupError:
        return None
    return model.objects.filter(pk=_int(identifier), company=company).first()


class ProjectAuxiliaryViewSet(viewsets.ViewSet):
    """تفصیل‌های مرتبط با یک پروژه + ساخت تفصیل پروژه."""

    def list(self, request):
        company = _company(request)
        project_id = _int(request.query_params.get('project'))
        project = Project.objects.filter(pk=project_id, company=company).first() if project_id else None
        if project is None:
            return Response({'detail': 'پروژه یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        own = project_auxiliary(company, project, create=False)
        rows = auxiliaries_of_project(company, project)
        return Response({
            'project': {'id': project.pk, 'code': project.code, 'name': project.name},
            'project_auxiliary': {
                'id': own.pk, 'code': own.code, 'name': own.name,
                'aux_type': own.aux_type,
                'category_name': getattr(getattr(own, 'category', None), 'name', '') or '',
            } if own else None,
            'auxiliaries': [
                {
                    'id': row.pk, 'code': row.code, 'name': row.name,
                    'aux_type': row.aux_type,
                    'aux_type_display': row.get_aux_type_display(),
                    'category_name': getattr(getattr(row, 'category', None), 'name', '') or '',
                    'is_project': row.project_id == project.pk,
                    'contract': getattr(row.contract, 'number', '') or '',
                    'party': getattr(row.party, 'name', '') or '',
                    'supplier': getattr(row.supplier, 'name', '') or '',
                    'employee': getattr(row.employee, 'full_name', '') or '',
                }
                for row in rows
            ],
            'accounts_usage': project_coding_usage(company, project),
        })

    @action(detail=False, methods=['post'])
    def ensure(self, request):
        """ساخت (یا برگرداندن) تفصیل پروژه — عملیاتی و بی‌اثر در تکرار."""
        company = _company(request)
        project_id = _int(request.data.get('project'))
        project = Project.objects.filter(pk=project_id, company=company).first() if project_id else None
        if project is None:
            return Response({'detail': 'پروژه یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        before = project_auxiliary(company, project, create=False)
        auxiliary = project_auxiliary(company, project, create=True)
        if auxiliary is None:
            return Response({'detail': 'تفصیل پروژه ساخته نشد.'},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'created': before is None,
            'auxiliary': {
                'id': auxiliary.pk, 'code': auxiliary.code, 'name': auxiliary.name,
                'aux_type': auxiliary.aux_type,
            },
        }, status=status.HTTP_201_CREATED if before is None else status.HTTP_200_OK)

