"""استخراج ساختار منوها از menuConfig.js برای کاتالوگ مجوزها (ابزار موقت)."""
import json
import re
from pathlib import Path

SRC = Path(r'C:\HRMS\frontend\src\core\config\menuConfig.js')
OUT = Path(r'C:\HRMS\_menu_catalog.json')

MODULES = {
    'menuConfig': ('hrms', 'منابع انسانی'),
    'settingsMenu': ('settings', 'تنظیمات و تعاریف'),
    'pettycashMenu': ('pettycash', 'تنخواه'),
    'accountingMenu': ('accounting', 'حسابداری و مالی'),
    'treasuryMenu': ('treasury', 'خزانه‌داری'),
    'procurementMenu': ('procurement', 'تدارکات و انبار'),
    'projectsMenu': ('projects', 'پروژه‌ها'),
    'contractsMenu': ('contracts', 'قراردادها'),
    'documentsMenu': ('documents', 'مدیریت اسناد'),
    'correspondenceMenu': ('correspondence', 'مکاتبات'),
}

text = SRC.read_text(encoding='utf-8')
lines = text.splitlines()

blocks = {}
current = None
for line in lines:
    match = re.match(r'^const (\w+) = \[', line)
    if match and match.group(1) in MODULES:
        current = match.group(1)
        blocks[current] = []
        continue
    if re.match(r'^const \w+ = ', line) and current:
        current = None
        continue
    if current:
        blocks[current].append(line)

ID_RE = re.compile(r"id:\s*'([^']+)'")
TITLE_RE = re.compile(r"title:\s*'([^']+)'")
PATH_RE = re.compile(r"path:\s*'([^']+)'")
HELPER_RE = re.compile(r"treasuryItem\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,[^,]+,\s*'([^']+)'")
GROUP_RE = re.compile(r"^\s{4}title:\s*'([^']+)'")

result = []
for func, (slug, name) in MODULES.items():
    groups = []
    current_group = None
    for line in blocks.get(func, []):
        has_title = TITLE_RE.search(line)
        has_path = PATH_RE.search(line)
        if has_title and not has_path:
            current_group = {'title': has_title.group(1), 'items': []}
            groups.append(current_group)
            continue
        if current_group is None:
            continue
        helper = HELPER_RE.search(line)
        if helper:
            current_group['items'].append({
                'id': helper.group(1), 'title': helper.group(2), 'path': helper.group(3),
            })
            continue
        item_id = ID_RE.search(line)
        if has_title and has_path and item_id:
            current_group['items'].append({
                'id': item_id.group(1), 'title': has_title.group(1), 'path': has_path.group(1),
            })
    result.append({'slug': slug, 'name': name, 'groups': groups})

total = sum(len(g['items']) for m in result for g in m['groups'])
print('modules', len(result), 'groups', sum(len(m['groups']) for m in result), 'items', total)
for module in result:
    print(module['slug'], len(module['groups']), sum(len(g['items']) for g in module['groups']))
OUT.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding='utf-8')
print('written', OUT)
