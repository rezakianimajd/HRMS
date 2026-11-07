"""بارکد اعتبارسنجی اسناد خزانه — Code 39 خالص (بدون وابستگی خارجی).

سند توسعه (§۱۱) «QR Code یا بارکد اعتبارسنجی» را مجاز می‌داند؛ چون بستهٔ QR در
محیط بسته (بدون PyPI) قابل نصب نیست، بارکد استاندارد Code 39 تولید می‌شود که
هر اسکنر دستی/دوربین‌خوان آن را می‌خواند و کد متنی/لینک اعتبارسنجی نیز در کنار
آن چاپ می‌شود.
"""
from base64 import b64encode

# Code 39 — ۹ عنصر (میله/فاصله) و «پهن» با w مشخص می‌شود
_PATTERNS = {
    '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn',
    '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw',
    '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
    'A': 'wnnnnwnnw', 'B': 'nnwnnwnnw', 'C': 'wnwnnwnnn', 'D': 'nnnnwwnnw',
    'E': 'wnnnwwnnn', 'F': 'nnwnwwnnn', 'G': 'nnnnnwwnw', 'H': 'wnnnnwwnn',
    'I': 'nnwnnwwnn', 'J': 'nnnnwwwnn', 'K': 'wnnnnnnww', 'L': 'nnwnnnnww',
    'M': 'wnwnnnnwn', 'N': 'nnnnwnnww', 'O': 'wnnnwnnwn', 'P': 'nnwnwnnwn',
    'Q': 'nnnnnnwww', 'R': 'wnnnnnwwn', 'S': 'nnwnnnwwn', 'T': 'nnnnwnwwn',
    'U': 'wwnnnnnnw', 'V': 'nwwnnnnnw', 'W': 'wwwnnnnnn', 'X': 'nwnnwnnnw',
    'Y': 'wwnnwnnnn', 'Z': 'nwwnwnnnn',
    '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
    '$': 'nwnwnwnnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn',
}

NARROW = 1
WIDE = 2.6
QUIET = 10


def _clean(value):
    """نویسه‌های مجاز Code 39؛ سایر نویسه‌ها حذف می‌شوند."""
    text = str(value or '').upper()
    return ''.join(char for char in text if char in _PATTERNS and char != '*')


def is_encodable(value):
    return bool(_clean(value))


def barcode_svg(value, height=48, module=1.4, show_text=True):
    """SVG بارکد Code 39 با متن خوانا."""
    payload = _clean(value)
    if not payload:
        return ''
    chars = f'*{payload}*'
    x = QUIET
    bars = []
    for char in chars:
        pattern = _PATTERNS[char]
        for index, element in enumerate(pattern):
            width = (WIDE if element == 'w' else NARROW) * module
            if index % 2 == 0:  # میله
                bars.append(
                    f'<rect x="{x:.2f}" y="0" width="{width:.2f}" height="{height}" />'
                )
            x += width
        x += NARROW * module  # فاصلهٔ بین نویسه‌ها
    total = x + QUIET
    text_height = 14 if show_text else 0
    label = ''
    if show_text:
        label = (
            f'<text x="{total / 2:.2f}" y="{height + 12}" text-anchor="middle" '
            f'font-family="monospace" font-size="10" fill="#0f172a">{payload}</text>'
        )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{total:.2f}" '
        f'height="{height + text_height}" viewBox="0 0 {total:.2f} {height + text_height}">'
        f'<rect width="100%" height="100%" fill="#ffffff" />'
        f'<g fill="#0f172a">{"".join(bars)}</g>{label}</svg>'
    )


def barcode_data_uri(value, **kwargs):
    """data URI برای درج مستقیم در HTML/قالب چاپ."""
    svg = barcode_svg(value, **kwargs)
    if not svg:
        return ''
    encoded = b64encode(svg.encode('utf-8')).decode('ascii')
    return f'data:image/svg+xml;base64,{encoded}'
