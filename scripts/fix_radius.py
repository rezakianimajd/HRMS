import os, re

BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'src')
pat = re.compile(r'borderRadius:\s*(\d+(?:\.\d+)?)')

changed_files = 0
total_occurrences = 0

for dirpath, _dirs, files in os.walk(BASE):
    for fn in files:
        if not (fn.endswith('.jsx') or fn.endswith('.js')):
            continue
        path = os.path.join(dirpath, fn)
        with open(path, 'r', encoding='utf-8') as f:
            text = f.read()

        def repl(m):
            return m.group(0) if float(m.group(1)) == 0 else "borderRadius: '10px'"

        new_text = pat.sub(repl, text)

        # In App.jsx keep the theme multiplier at 1 so nothing gets scaled.
        if fn == 'App.jsx':
            new_text = re.sub(
                r'shape:\s*\{\s*borderRadius:\s*[^}]+?\}',
                'shape: { borderRadius: 1 }',
                new_text,
            )

        if new_text != text:
            with open(path, 'w', encoding='utf-8', newline='') as f:
                f.write(new_text)
            changed_files += 1
            total_occurrences += len(pat.findall(text))

print(f'changed_files={changed_files} occurrences={total_occurrences}')