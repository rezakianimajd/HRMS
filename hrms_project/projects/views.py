"""Views for the Projects module."""
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from projects.models import (
    ProjectType, Project, ProjectPhase, WBSNode, WBSTemplate, WBSTemplateNode, CBSNode,
    ResourceCategory, Resource, CostSource, OBSNode,
    PriceList, PriceListVersion, PriceListChapter, PriceListItem,
    ContractItem, ContractWBS, ContractPriceBasis,
)
from projects.serializers import (
    ProjectTypeSerializer, ProjectSerializer, ProjectPhaseSerializer,
    WBSNodeSerializer, WBSTemplateSerializer, WBSTemplateNodeSerializer, CBSNodeSerializer,
    ResourceCategorySerializer, ResourceSerializer, CostSourceSerializer,
    OBSNodeSerializer,
    PriceListSerializer, PriceListVersionSerializer, PriceListChapterSerializer,
    PriceListItemSerializer, ContractItemSerializer, ContractWBSSerializer,
    ContractPriceBasisSerializer,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class BaseProjectViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        company = _company(self.request)
        serializer.save(company=company)


class ProjectTypeViewSet(BaseProjectViewSet):
    serializer_class = ProjectTypeSerializer
    queryset = ProjectType.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering = ['name']


class ProjectViewSet(BaseProjectViewSet):
    serializer_class = ProjectSerializer
    queryset = Project.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name', 'client']
    ordering = ['code']

    def get_queryset(self):
        qs = super().get_queryset().select_related('project_type', 'manager')
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        project_type = self.request.query_params.get('project_type')
        if project_type:
            qs = qs.filter(project_type_id=project_type)
        parent = self.request.query_params.get('parent')
        if parent:
            qs = qs.filter(parent_id=parent)
        if self.request.query_params.get('roots') in ('1', 'true', 'True'):
            qs = qs.filter(parent__isnull=True)
        if self.request.query_params.get('is_program') in ('1', 'true', 'True'):
            qs = qs.filter(is_program=True)
        return qs

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """رویدادهای تقویمی پروژه‌ها: شروع/پایان، فازها، هزینه، تعهد، درآمد،
        قراردادهای مرتبط (امضا/فاکتور/صورت‌وضعیت/پرداخت/الحاقیه/تضمین) و اسناد دفاتر."""
        from projects.calendar_service import build_calendar_events
        return Response(build_calendar_events(request))

    @action(detail=True, methods=['post'], url_path='apply-wbs-template')
    def apply_wbs_template(self, request, pk=None):
        """ساخت یا به‌روزرسانی درخت WBS پروژه از «قالب WBS» (Phase 0)."""
        from projects.models import WBSTemplate
        from projects.wbs_template_service import apply_template

        project = self.get_object()
        template_id = request.data.get('template') or request.data.get('template_id')
        if not template_id:
            return Response({'detail': 'شناسهٔ قالب (template) الزامی است.'}, status=400)
        mode = request.data.get('mode') or 'append'
        if mode not in ('append', 'replace'):
            return Response({'detail': "mode باید «append» یا «replace» باشد."}, status=400)
        try:
            result = apply_template(project, template_id, mode=mode)
        except WBSTemplate.DoesNotExist:
            return Response({'detail': 'قالب WBS یافت نشد.'}, status=404)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)
        return Response(result)

    # ------------------------------------------------------------------ فاز ۱
    @action(detail=True, methods=['post'], url_path='recalculate-schedule')
    def recalculate_schedule(self, request, pk=None):
        """اجرای CPM روی شبکهٔ فعالیت‌های پروژه و ذخیرهٔ زودترین/دیرترین/شناوری."""
        from django.utils.dateparse import parse_date
        from projects.scheduling.cpm import ScheduleCycleError, ScheduleValidationError
        from projects.scheduling.service import recalculate_schedule as run_schedule

        project = self.get_object()
        try:
            result = run_schedule(
                project,
                project_start=parse_date(request.data.get('project_start') or ''),
                project_finish=parse_date(request.data.get('project_finish') or ''),
            )
        except (ScheduleCycleError, ScheduleValidationError) as exc:
            return Response({'detail': str(exc)}, status=400)
        return Response(result)

    @action(detail=True, methods=['get', 'post'], url_path='baseline')
    def baseline(self, request, pk=None):
        """GET: بیس‌لاین جاری | POST: قفل برنامهٔ فعلی به‌عنوان بیس‌لاین نسخه‌دار."""
        from projects.schedule_serializers import BaselineSerializer
        from projects.scheduling.service import current_baseline, freeze_baseline

        project = self.get_object()
        if request.method == 'POST':
            try:
                baseline = freeze_baseline(
                    project,
                    name=request.data.get('name'),
                    note=request.data.get('note') or '',
                )
            except ValueError as exc:
                return Response({'detail': str(exc)}, status=400)
            return Response(BaselineSerializer(baseline).data, status=201)

        baseline = current_baseline(project)
        if not baseline:
            return Response({'detail': 'برای این پروژه بیس‌لاینی ثبت نشده است.'}, status=404)
        return Response(BaselineSerializer(baseline).data)

    @action(detail=True, methods=['get'], url_path='evm')
    def evm(self, request, pk=None):
        """شاخص‌های ارزش کسب‌شده (PV/EV/AC, SPI/CPI, EAC…) و منحنی S شمسی."""
        from django.utils.dateparse import parse_date
        from projects.scheduling.service import project_evm

        as_of = parse_date(request.query_params.get('as_of') or '')
        return Response(project_evm(self.get_object(), as_of=as_of))

    @action(detail=True, methods=['get'], url_path='gantt')
    def gantt(self, request, pk=None):
        """دادهٔ صفحهٔ گانت (فعالیت‌ها با برچسب شمسی + وابستگی‌ها + بیس‌لاین)."""
        from projects.scheduling.service import gantt_payload

        return Response(gantt_payload(self.get_object()))

    @action(detail=True, methods=['get'], url_path='resource-histogram')
    def resource_histogram(self, request, pk=None):
        """بار روزانهٔ منابع و هشدار بیش‌تخصیص."""
        from django.utils.dateparse import parse_date
        from projects.scheduling.service import resource_histogram as build_histogram

        return Response(build_histogram(
            self.get_object(),
            date_from=parse_date(request.query_params.get('date_from') or ''),
            date_to=parse_date(request.query_params.get('date_to') or ''),
        ))

    @action(detail=True, methods=['get'], url_path='cashflow')
    def cashflow(self, request, pk=None):
        """جریان نقدی پروژه: پیش‌بینی برنامه در برابر واقعی دفاتر/پرداخت‌ها (ماه شمسی)."""
        from projects.cashflow import project_cashflow

        rial_only = request.query_params.get('rial_only') not in ('0', 'false', 'False')
        return Response(project_cashflow(self.get_object(), rial_only=rial_only))

    @action(detail=True, methods=['get'])
    def profile(self, request, pk=None):
        """پروندهٔ کامل پروژه: قراردادها، اقلام و الحاقیه‌ها، هزینه/درآمد و پرداخت‌ها."""
        from projects.profile_views import build_project_profile
        return Response(build_project_profile(self.get_object()))


class ProjectPhaseViewSet(BaseProjectViewSet):
    serializer_class = ProjectPhaseSerializer
    queryset = ProjectPhase.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs


class WBSNodeViewSet(BaseProjectViewSet):
    serializer_class = WBSNodeSerializer
    queryset = WBSNode.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering = ['sequence', 'code']

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Full nested WBS for a project."""
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'error': 'project پارامتر الزامی است.'}, status=400)
        roots = self.get_queryset().filter(project_id=project_id, parent__isnull=True)
        return Response(WBSNodeSerializer(roots, many=True).data)


class WBSTemplateViewSet(BaseProjectViewSet):
    serializer_class = WBSTemplateSerializer
    queryset = WBSTemplate.objects.all()


class WBSTemplateNodeViewSet(BaseProjectViewSet):
    """گره‌های «قالب WBS» — مبنای ساخت خودکار ساختار پروژه‌های مشابه (Phase 0)."""
    serializer_class = WBSTemplateNodeSerializer
    queryset = WBSTemplateNode.objects.all()

    def get_queryset(self):
        qs = super().get_queryset().select_related('template', 'parent')
        template_id = self.request.query_params.get('template')
        if template_id:
            qs = qs.filter(template_id=template_id)
        return qs


class CBSNodeViewSet(BaseProjectViewSet):
    serializer_class = CBSNodeSerializer
    queryset = CBSNode.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering = ['sequence', 'code']

    @action(detail=False, methods=['get'])
    def tree(self, request):
        roots = self.get_queryset().filter(parent__isnull=True)
        return Response(CBSNodeSerializer(roots, many=True).data)


class ResourceCategoryViewSet(BaseProjectViewSet):
    serializer_class = ResourceCategorySerializer
    queryset = ResourceCategory.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering = ['name']


class ResourceViewSet(BaseProjectViewSet):
    serializer_class = ResourceSerializer
    queryset = Resource.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering = ['code']

    def get_queryset(self):
        qs = super().get_queryset().select_related('category')
        category_id = self.request.query_params.get('category')
        if category_id:
            qs = qs.filter(category_id=category_id)
        return qs


class CostSourceViewSet(BaseProjectViewSet):
    serializer_class = CostSourceSerializer
    queryset = CostSource.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering = ['code']


class OBSNodeViewSet(BaseProjectViewSet):
    serializer_class = OBSNodeSerializer
    queryset = OBSNode.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering = ['sequence', 'code']

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    @action(detail=False, methods=['get'])
    def tree(self, request):
        project_id = request.query_params.get('project')
        roots = self.get_queryset().filter(parent__isnull=True)
        if project_id:
            roots = roots.filter(project_id=project_id)
        return Response(OBSNodeSerializer(roots, many=True).data)


# =============================================================================
# Phase 1 — Commercial structure view sets
# =============================================================================

class PriceListViewSet(BaseProjectViewSet):
    serializer_class = PriceListSerializer
    queryset = PriceList.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name', 'discipline']
    ordering = ['code']


class PriceListVersionViewSet(BaseProjectViewSet):
    serializer_class = PriceListVersionSerializer
    queryset = PriceListVersion.objects.all()

    def get_queryset(self):
        qs = super().get_queryset().select_related('price_list')
        price_list_id = self.request.query_params.get('price_list')
        if price_list_id:
            qs = qs.filter(price_list_id=price_list_id)
        return qs


class PriceListChapterViewSet(BaseProjectViewSet):
    serializer_class = PriceListChapterSerializer
    queryset = PriceListChapter.objects.all()

    def get_queryset(self):
        qs = super().get_queryset().prefetch_related('items')
        version_id = self.request.query_params.get('version')
        if version_id:
            qs = qs.filter(version_id=version_id)
        return qs


class PriceListItemViewSet(BaseProjectViewSet):
    serializer_class = PriceListItemSerializer
    queryset = PriceListItem.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        chapter_id = self.request.query_params.get('chapter')
        if chapter_id:
            qs = qs.filter(chapter_id=chapter_id)
        return qs


class ContractItemViewSet(BaseProjectViewSet):
    serializer_class = ContractItemSerializer
    queryset = ContractItem.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'description']
    ordering = ['contract', 'code']

    def get_queryset(self):
        qs = super().get_queryset().select_related('contract')
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        return qs


class ContractWBSViewSet(BaseProjectViewSet):
    serializer_class = ContractWBSSerializer
    queryset = ContractWBS.objects.all()

    def get_queryset(self):
        qs = super().get_queryset().select_related('wbs')
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        return qs


class ContractPriceBasisViewSet(BaseProjectViewSet):
    serializer_class = ContractPriceBasisSerializer
    queryset = ContractPriceBasis.objects.all()

    def get_queryset(self):
        qs = super().get_queryset().select_related('price_list', 'price_list_version')
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        return qs
