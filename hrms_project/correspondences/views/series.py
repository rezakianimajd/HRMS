"""گروه‌های شماره‌گذاری مکاتبات (تعاریف اولیه و شماره‌گذاری)."""
from correspondences.views.base import (  # noqa: F401 — واردات مشترک
    Count, Response, action, date_cls,
    DefinitionPermissionMixin, BaseLetterViewSet,
    LetterSeries, LetterSeriesSerializer,
    preview_payload,
)


class LetterSeriesViewSet(DefinitionPermissionMixin, BaseLetterViewSet):
    """گروه‌های شماره‌گذاری: ساخت انواع شماره‌گذاری + پیشنهاد شمارهٔ بعدی."""
    serializer_class = LetterSeriesSerializer
    queryset = LetterSeries.objects.all()
    search_fields = ['title', 'prefix', 'template', 'description']
    filterset_fields = ['direction', 'is_active']
    ordering_fields = ['title', 'direction', 'next_number', 'created_at']
    ordering = ['-is_default', 'title']

    def get_queryset(self):
        qs = super().get_queryset().annotate(letter_count=Count('letters'))
        direction = self.request.query_params.get('direction')
        if direction:
            qs = qs.filter(direction=direction)
        return qs

    def _make_single_default(self, series):
        """در هر جهت فقط یک گروه پیش‌فرض می‌ماند."""
        if not series.is_default:
            return
        LetterSeries.objects.filter(
            company_id=series.company_id, direction=series.direction,
        ).exclude(pk=series.pk).update(is_default=False)

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self._make_single_default(serializer.instance)

    def perform_update(self, serializer):
        serializer.save()
        self._make_single_default(serializer.instance)

    @action(detail=True, methods=['get'], url_path='preview')
    def preview(self, request, pk=None):
        """پیشنهاد شمارهٔ بعدی برای فرم نامه (بدون مصرف شمارنده)."""
        series = self.get_object()
        letter_date = request.query_params.get('letter_date')
        parsed = None
        if letter_date:
            try:
                parsed = date_cls.fromisoformat(letter_date[:10])
            except ValueError:
                parsed = None
        payload = preview_payload(series, parsed)
        payload['series'] = LetterSeriesSerializer(series).data
        return Response(payload)

    @action(detail=True, methods=['post'], url_path='set-default')
    def set_default(self, request, pk=None):
        """گروه را پیش‌فرض همان جهت می‌کند."""
        series = self.get_object()
        series.is_default = True
        series.save(update_fields=['is_default', 'updated_at'])
        self._make_single_default(series)
        return Response(LetterSeriesSerializer(self.get_queryset().get(pk=series.pk)).data)

    @action(detail=True, methods=['post'], url_path='reset-counter')
    def reset_counter(self, request, pk=None):
        """صفر کردن شمارنده روی «شماره شروع» گروه."""
        series = self.get_object()
        series.next_number = series.start_number or 1
        series.last_year = None
        series.save(update_fields=['next_number', 'last_year', 'updated_at'])
        return Response(LetterSeriesSerializer(self.get_queryset().get(pk=series.pk)).data)
