"""Serializers for the Projects module."""
from rest_framework import serializers
from projects.models import (
    ProjectType, Project, ProjectPhase, WBSNode, WBSTemplate, CBSNode,
    ResourceCategory, Resource, CostSource, OBSNode,
    PriceList, PriceListVersion, PriceListChapter, PriceListItem,
    ContractItem, ContractWBS, ContractPriceBasis,
)


class ProjectTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectType
        fields = ['id', 'name', 'code']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ProjectSerializer(serializers.ModelSerializer):
    project_type_name = serializers.CharField(source='project_type.name', read_only=True)
    manager_name = serializers.CharField(source='manager.full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'code', 'name', 'project_type', 'project_type_name', 'manager',
            'manager_name', 'client', 'location', 'start_date', 'end_date',
            'status', 'status_display', 'description', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ProjectPhaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectPhase
        fields = ['id', 'project', 'name', 'sequence', 'start_date', 'end_date']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class WBSNodeSerializer(serializers.ModelSerializer):
    node_type_display = serializers.CharField(source='get_node_type_display', read_only=True)
    children = serializers.SerializerMethodField()

    class Meta:
        model = WBSNode
        fields = [
            'id', 'project', 'code', 'name', 'parent', 'node_type',
            'node_type_display', 'sequence', 'description', 'is_active',
            'children', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def get_children(self, obj):
        return WBSNodeSerializer(obj.children.all(), many=True).data


class WBSTemplateSerializer(serializers.ModelSerializer):
    project_type_name = serializers.CharField(source='project_type.name', read_only=True)

    class Meta:
        model = WBSTemplate
        fields = ['id', 'name', 'project_type', 'project_type_name', 'is_active']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class CBSNodeSerializer(serializers.ModelSerializer):
    node_type_display = serializers.CharField(source='get_node_type_display', read_only=True)
    children = serializers.SerializerMethodField()

    class Meta:
        model = CBSNode
        fields = [
            'id', 'code', 'name', 'parent', 'node_type', 'node_type_display',
            'sequence', 'is_active', 'children',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def get_children(self, obj):
        return CBSNodeSerializer(obj.children.all(), many=True).data


class ResourceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceCategory
        fields = ['id', 'name', 'code']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ResourceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Resource
        fields = ['id', 'code', 'name', 'category', 'category_name', 'unit', 'is_active']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class CostSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostSource
        fields = ['id', 'code', 'name', 'is_active']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class OBSNodeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = OBSNode
        fields = [
            'id', 'code', 'name', 'parent', 'project', 'department', 'position',
            'employee', 'sequence', 'is_active', 'children',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def get_children(self, obj):
        return OBSNodeSerializer(obj.children.all(), many=True).data


# =============================================================================
# Phase 1 — Commercial structure serializers
# =============================================================================

class PriceListItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceListItem
        fields = ['id', 'chapter', 'code', 'description', 'unit', 'price', 'is_active']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class PriceListChapterSerializer(serializers.ModelSerializer):
    items = PriceListItemSerializer(many=True, read_only=True)

    class Meta:
        model = PriceListChapter
        fields = ['id', 'version', 'code', 'name', 'items']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class PriceListVersionSerializer(serializers.ModelSerializer):
    chapters = PriceListChapterSerializer(many=True, read_only=True)

    class Meta:
        model = PriceListVersion
        fields = ['id', 'price_list', 'version', 'year', 'is_active', 'chapters']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class PriceListSerializer(serializers.ModelSerializer):
    versions = PriceListVersionSerializer(many=True, read_only=True)

    class Meta:
        model = PriceList
        fields = ['id', 'name', 'code', 'discipline', 'is_active', 'versions']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ContractItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractItem
        fields = ['id', 'contract', 'code', 'description', 'unit', 'quantity', 'unit_price', 'amount']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ContractWBSSerializer(serializers.ModelSerializer):
    wbs_name = serializers.CharField(source='wbs.name', read_only=True)

    class Meta:
        model = ContractWBS
        fields = ['id', 'contract', 'wbs', 'wbs_name']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ContractPriceBasisSerializer(serializers.ModelSerializer):
    price_list_name = serializers.CharField(source='price_list.name', read_only=True)
    version_label = serializers.CharField(source='price_list_version.version', read_only=True)

    class Meta:
        model = ContractPriceBasis
        fields = ['id', 'contract', 'price_list', 'price_list_name', 'price_list_version', 'version_label', 'pricing_method']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']
