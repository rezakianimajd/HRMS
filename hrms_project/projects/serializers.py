"""Serializers for the Projects module."""
from rest_framework import serializers
from projects.models import (
    ProjectType, Project, ProjectPhase, WBSNode, WBSTemplate, CBSNode,
    ResourceCategory, Resource, CostSource, OBSNode,
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