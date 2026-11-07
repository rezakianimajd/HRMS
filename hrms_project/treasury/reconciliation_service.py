"""موتور تطبیق گردش بانک با تراکنش‌های خزانه (بدون دیتابیس — قابل تست).

امتیازدهی: مبلغ باید دقیقاً برابر باشد و جهت هم‌خوان؛ تطابق شماره پیگیری/مرجع
امتیاز بالا و نزدیکی تاریخ امتیاز بیشتر می‌دهد. ردیف‌های با اختلاف بیش از
``day_tolerance`` روز کاندید محسوب نمی‌شوند.
"""
from datetime import date


def _as_date(value):
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def _references(row):
    return {
        str(value).strip()
        for value in (
            getattr(row, 'reference', ''),
            getattr(row, 'reference_no', ''),
            getattr(row, 'tracking_no', ''),
        )
        if str(value or '').strip()
    }


def match_score(line, transaction, day_tolerance=3):
    """امتیاز تطبیق یک ردیف گردش با یک تراکنش؛ ``None`` یعنی کاندید نیست."""
    line_amount = getattr(line, 'amount', None)
    tx_amount = getattr(transaction, 'amount', None)
    if line_amount is None or tx_amount is None or line_amount != tx_amount:
        return None

    line_direction = getattr(line, 'direction', '')
    tx_direction = getattr(transaction, 'direction', '')
    expected = 'receipt' if line_direction == 'credit' else 'payment'
    if tx_direction != expected:
        return None

    line_date = _as_date(getattr(line, 'date', None))
    tx_date = _as_date(getattr(transaction, 'date', None))
    if line_date is None or tx_date is None:
        return None
    delta = abs((line_date - tx_date).days)
    if delta > day_tolerance:
        return None

    score = 0
    if _references(line) & _references(transaction):
        score += 50
    if delta == 0:
        score += 20
    else:
        score += max(1, 10 - delta * 3)
    if getattr(line, 'entity_id', None) and getattr(transaction, 'entity_id', None):
        if line.entity_id == transaction.entity_id:
            score += 5
    return score


def best_candidate(line, transactions, day_tolerance=3):
    """بهترین تراکنش کاندید برای یک ردیف گردش."""
    best = None
    best_score = 0
    for transaction in transactions:
        score = match_score(line, transaction, day_tolerance)
        if score is None:
            continue
        if score > best_score:
            best = transaction
            best_score = score
    return best, best_score


def auto_match(lines, transactions, day_tolerance=3, min_score=1):
    """تطبیق خودکار؛ خروجی: ``[(line, transaction, score), ...]``."""
    matches = []
    used = set()
    for line in lines:
        candidates = [
            tx for tx in transactions
            if getattr(tx, 'pk', None) not in used
        ]
        best, score = best_candidate(line, candidates, day_tolerance)
        if best is not None and score >= min_score:
            used.add(getattr(best, 'pk', None))
            matches.append((line, best, score))
    return matches
