"""تست‌های ساختاری نگاشت نام‌ها (بدون دیتابیس).

باگ واقعی که این تست‌ها را لازم کرد: در بستهٔ ``correspondences/views/`` نام
``Organization`` از واردات حذف شده بود و اندپوینت ``unmapped`` با 500 از کار
می‌افتاد (یعنی «نگاشت‌نشده‌ها» خالی می‌شد). تست زیر هر نام کلاس‌مانندِ تعریف‌نشده
در ماژول‌های بستهٔ views را می‌گیرد.
"""
import ast
import builtins
import pathlib

from django.test import SimpleTestCase

VIEWS_DIR = pathlib.Path(__file__).resolve().parent / 'views'


def _module_names(tree):
    names = set()
    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            for alias in node.names:
                names.add(alias.asname or alias.name.split('.')[0])
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            names.add(node.name)
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    names.add(target.id)
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            names.add(node.target.id)
        elif isinstance(node, (ast.If, ast.Try)):
            for child in ast.walk(node):
                if isinstance(child, (ast.Import, ast.ImportFrom)):
                    for alias in child.names:
                        names.add(alias.asname or alias.name.split('.')[0])
    return names


def _local_names(function_node):
    names = set()
    for node in ast.walk(function_node):
        if isinstance(node, ast.arg):
            names.add(node.arg)
        elif isinstance(node, ast.Name) and isinstance(node.ctx, (ast.Store, ast.Del)):
            names.add(node.id)
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            for alias in node.names:
                names.add(alias.asname or alias.name.split('.')[0])
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            names.add(node.name)
    return names


class ViewPackageNameTests(SimpleTestCase):
    """هیچ کلاس/ثابتِ استفاده‌شده نباید در ماژول تعریف‌نشده باشد."""

    def test_all_view_modules_import_what_they_use(self):
        problems = []
        for path in sorted(VIEWS_DIR.glob('*.py')):
            tree = ast.parse(path.read_text(encoding='utf-8'))
            module_names = _module_names(tree) | set(dir(builtins))
            for node in ast.walk(tree):
                if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                known = module_names | _local_names(node)
                for inner in ast.walk(node):
                    if isinstance(inner, ast.Name) and isinstance(inner.ctx, ast.Load):
                        name = inner.id
                        if not name[:1].isupper():
                            continue
                        if name in known:
                            continue
                        problems.append(f'{path.name}:{inner.lineno} → {name}')
        self.assertEqual(problems, [], 'نام‌های تعریف‌نشده: ' + ' | '.join(problems))

    def test_aliases_module_imports_organization(self):
        """رگرسیون مستقیم: ساخت کاندیدهای سازمان باید به مدل دسترسی داشته باشد."""
        source = (VIEWS_DIR / 'aliases.py').read_text(encoding='utf-8')
        self.assertIn('from correspondences.models import Organization', source)
        self.assertIn('Organization.objects.filter', source)
