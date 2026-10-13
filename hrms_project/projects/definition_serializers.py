"""Serializers تعاریف اولیهٔ پروژه (نگاشت کل/معین/تفصیل)."""
from rest_framework import serializers

from projects.definition_models import (
    ProjectAccountDefinition, ProjectAccountDefinitionAux,
)


class ProjectAccountDefinitionAuxSerializer(serializers.ModelSerializer):
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_source = serializers.CharField(source='category.source', read_only=True)
    category_source_display = serializers.CharField(source='category.get_source_display', read_only=True)
    auxiliary_code = serializers.CharField(source='auxiliary.code', read_only=True)
    auxiliary_name = serializers.CharField(source='auxiliary.name', read_only=True)

    class Meta:
        model = ProjectAccountDefinitionAux
        fields = [
            'id', 'slot', 'source', 'source_display', 'category', 'category_name',
            'category_source', 'category_source_display',
            'auxiliary', 'auxiliary_code', 'auxiliary_name', 'auto_create',
        ]
        read_only_fields = ['id', 'source_display', 'category_name', 'category_source',
                            'category_source_display', 'auxiliary_code', 'auxiliary_name']

    def validate_slot(self, value):
        if value not in (1, 2, 3):
            raise serializers.ValidationError('شمارهٔ اسلات تفصیل باید ۱، ۲ یا ۳ باشد.')
        return value

    def validate(self, attrs):
        source = attrs.get('source', getattr(self.instance, 'source', None))
        auxiliary = attrs.get('auxiliary', getattr(self.instance, 'auxiliary', None))
        category = attrs.get('category', getattr(self.instance, 'category', None))
        if source == ProjectAccountDefinitionAux.Source.AUTO and not category:
            raise serializers.ValidationError({
                'category': 'در حالت «از دستهٔ تفصیلی» انتخاب دسته (پروژه، قرارداد، ریز هزینه‌ها و ...) الزامی است.',
            })
        if source == ProjectAccountDefinitionAux.Source.FIXED and not auxiliary:
            raise serializers.ValidationError(
                {'auxiliary': 'برای منبع «تفصیل ثابت» انتخاب تفصیل الزامی است.'}
            )
        return attrs


class ProjectAccountDefinitionSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    scope = serializers.CharField(read_only=True)
    scope_label = serializers.CharField(read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    project_type_name = serializers.CharField(source='project_type.name', read_only=True)
    general_account_code = serializers.CharField(source='general_account.code', read_only=True)
    general_account_name = serializers.CharField(source='general_account.name', read_only=True)
    subsidiary_account_code = serializers.CharField(source='subsidiary_account.code', read_only=True)
    subsidiary_account_name = serializers.CharField(source='subsidiary_account.name', read_only=True)
    cost_center_name = serializers.CharField(source='cost_center.name', read_only=True)
    subsidiary_under_general = serializers.SerializerMethodField()
    coding_warnings = serializers.SerializerMethodField()
    auxiliary_rules = ProjectAccountDefinitionAuxSerializer(many=True, required=False)

    class Meta:
        model = ProjectAccountDefinition
        fields = [
            'id', 'code', 'title', 'kind', 'kind_display', 'description',
            'project', 'project_name', 'project_type', 'project_type_name',
            'scope', 'scope_label',
            'general_account', 'general_account_code', 'general_account_name',
            'subsidiary_account', 'subsidiary_account_code', 'subsidiary_account_name',
            'subsidiary_under_general', 'cost_center', 'cost_center_name',
            'auto_create_auxiliaries', 'sort_order', 'is_active',
            'auxiliary_rules', 'coding_warnings', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'company', 'created_at', 'updated_at', 'kind_display', 'scope',
            'scope_label', 'project_name', 'project_type_name', 'general_account_code',
            'general_account_name', 'subsidiary_account_code', 'subsidiary_account_name',
            'cost_center_name', 'subsidiary_under_general', 'coding_warnings',
        ]

    def get_subsidiary_under_general(self, obj):
        return obj.subsidiary_is_under_general()

    def get_coding_warnings(self, obj):
        return obj.coding_problems()

    @staticmethod
    def _is_descendant(subsidiary, general):
        node = subsidiary
        for _ in range(20):
            if node is None:
                return False
            if node.pk == general.pk:
                return True
            node = node.parent
        return False

    def validate(self, attrs):
        project = attrs.get('project', getattr(self.instance, 'project', None))
        project_type = attrs.get('project_type', getattr(self.instance, 'project_type', None))
        if project and project_type:
            raise serializers.ValidationError({
                'project': 'فقط یکی از «پروژه» یا «نوع پروژه» را انتخاب کنید؛ '
                           'برای تعریف عمومی (همهٔ پروژه‌ها) هیچ‌کدام را انتخاب نکنید.',
            })
        general = attrs.get('general_account', getattr(self.instance, 'general_account', None))
        subsidiary = attrs.get('subsidiary_account', getattr(self.instance, 'subsidiary_account', None))
        if general is not None and subsidiary is not None and not self._is_descendant(subsidiary, general):
            raise serializers.ValidationError({
                'subsidiary_account': 'حساب معین انتخابی زیرمجموعهٔ حساب کل انتخاب‌شده نیست.',
            })
        rules = attrs.get('auxiliary_rules')
        if rules:
            slots = [rule.get('slot') for rule in rules if rule.get('slot')]
            if len(slots) != len(set(slots)):
                raise serializers.ValidationError({
                    'auxiliary_rules': 'هر اسلات تفصیل (۱..۳) فقط یک‌بار قابل تعریف است.',
                })
        return attrs

    def _save_rules(self, definition, rules):
        if rules is None:
            return
        existing = {rule.slot: rule for rule in definition.auxiliary_rules.all()}
        seen = set()
        for payload in rules:
            slot = payload.get('slot')
            if not slot:
                continue
            seen.add(slot)
            data = {key: value for key, value in payload.items() if key != 'id'}
            if slot in existing:
                rule = existing[slot]
                for key, value in data.items():
                    setattr(rule, key, value)
                rule.save()
            else:
                ProjectAccountDefinitionAux.objects.create(
                    company=definition.company, definition=definition, **data,
                )
        for slot, rule in existing.items():
            if slot not in seen:
                rule.delete()

    def create(self, validated_data):
        rules = validated_data.pop('auxiliary_rules', None)
        definition = ProjectAccountDefinition.objects.create(**validated_data)
        self._save_rules(definition, rules)
        return definition

    def update(self, instance, validated_data):
        rules = validated_data.pop('auxiliary_rules', None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        self._save_rules(instance, rules)
        return instance

