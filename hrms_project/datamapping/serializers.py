from rest_framework import serializers
from datamapping.models import MappingSource, MappingEntry


class MappingSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MappingSource
        fields = ['id', 'name', 'description', 'is_active']
        read_only_fields = ['id', 'company']


class MappingEntrySerializer(serializers.ModelSerializer):
    level_display = serializers.CharField(source='get_level_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    source_label = serializers.CharField(source='source.name', read_only=True, default='')
    target_name = serializers.CharField(read_only=True)
    target_code = serializers.CharField(read_only=True)
    target_category = serializers.CharField(source='target_auxiliary.category.name', read_only=True, default='')

    class Meta:
        model = MappingEntry
        fields = [
            'id', 'source', 'source_label', 'level', 'level_display', 'kind',
            'source_code', 'source_name', 'target_group', 'target_account', 'target_auxiliary',
            'target_name', 'target_code', 'target_category', 'match_score',
            'status', 'status_display', 'resolved',
        ]
        read_only_fields = ['id', 'company', 'match_score', 'resolved']
