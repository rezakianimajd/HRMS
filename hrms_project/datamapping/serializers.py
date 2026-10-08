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
    target_name = serializers.CharField(read_only=True)
    target_code = serializers.CharField(read_only=True)

    class Meta:
        model = MappingEntry
        fields = [
            'id', 'source', 'level', 'level_display', 'source_code', 'source_name',
            'target_group', 'target_account', 'target_auxiliary',
            'target_name', 'target_code', 'match_score', 'status', 'status_display', 'resolved',
        ]
        read_only_fields = ['id', 'company', 'match_score', 'resolved']
