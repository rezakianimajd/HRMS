"""توکن امضاشده برای نمایش عکس پرسنلی در <img> (بدون هدر JWT)."""
from __future__ import annotations

from django.core import signing

SALT = 'employees.photo'
MAX_AGE = 7 * 24 * 3600


def sign_employee(employee_id) -> str:
    return signing.dumps({'e': int(employee_id)}, salt=SALT)


def verify_employee_token(token, employee_id) -> bool:
    if not token:
        return False
    try:
        payload = signing.loads(token, salt=SALT, max_age=MAX_AGE)
    except (signing.BadSignature, signing.SignatureExpired, TypeError, ValueError):
        return False
    return str(payload.get('e')) == str(employee_id)
