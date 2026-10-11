"""تست سرویس «قالب WBS» — ساخت خودکار ساختار پروژه (Phase 0)."""
from django.test import TestCase

from projects.models import WBSNode, WBSTemplate, WBSTemplateNode
from projects.tests.base import ProjectTestMixin
from projects.wbs_template_service import apply_template


class WBSTemplateServiceTests(ProjectTestMixin, TestCase):

    def setUp(self):
        self.make_project()
        self.template = WBSTemplate.objects.create(
            company=self.company, name='قالب پایه', project_type=self.project_type,
        )
        root = WBSTemplateNode.objects.create(
            company=self.company, template=self.template, code='1', name='فاز نخست',
            node_type='phase', sequence=1,
        )
        WBSTemplateNode.objects.create(
            company=self.company, template=self.template, parent=root, code='1.1',
            name='تحویل‌دادنی', node_type='deliverable', sequence=1,
        )
        WBSTemplateNode.objects.create(
            company=self.company, template=self.template, parent=root, code='1.2',
            name='بسته کاری', node_type='work_package', sequence=2,
        )

    def test_apply_creates_tree_with_parents(self):
        result = apply_template(self.project, self.template.id)
        self.assertEqual(result['created'], 3)
        nodes = {n.code: n for n in WBSNode.objects.filter(project=self.project)}
        self.assertEqual(set(nodes), {'1', '1.1', '1.2'})
        self.assertIsNone(nodes['1'].parent_id)
        self.assertEqual(nodes['1.1'].parent_id, nodes['1'].id)
        self.assertEqual(nodes['1.2'].parent_id, nodes['1'].id)
        self.assertEqual(nodes['1'].node_type, 'phase')
        self.assertEqual(nodes['1.1'].node_type, 'deliverable')

    def test_append_is_idempotent(self):
        apply_template(self.project, self.template.id)
        result = apply_template(self.project, self.template.id)
        self.assertEqual(result['created'], 0)
        self.assertEqual(result['updated'], 3)
        self.assertEqual(WBSNode.objects.filter(project=self.project).count(), 3)

    def test_replace_rebuilds_structure(self):
        apply_template(self.project, self.template.id)
        result = apply_template(self.project, self.template.id, mode='replace')
        self.assertEqual(result['mode'], 'replace')
        self.assertEqual(WBSNode.objects.filter(project=self.project).count(), 3)

    def test_empty_template_reports_message(self):
        empty = WBSTemplate.objects.create(
            company=self.company, name='قالب خالی', project_type=self.project_type,
        )
        result = apply_template(self.project, empty.id)
        self.assertEqual(result['created'], 0)
        self.assertIn('message', result)
