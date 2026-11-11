"""اتصال خودکار نامه‌ها به «طرف حساب» مدیریت قراردادها بر اساس نام یکسان.

در دیالوگ نامه، اگر شرکت از فهرست انتخاب نشود و فقط نامش تایپ شود، نام در
``Letter.party_name`` ذخیره می‌شود و پروندهٔ طرف حساب/قرارداد آن نامه را نمی‌بیند.
این ماژول (و دستور ``link_letter_parties``) همان نام را با ``ContractParty``
موجود تطبیق می‌دهد و FK را پر می‌کند.
"""
from __future__ import annotations


def normalize_party_name(value):
    """نام را برای تطبیق یکدست می‌کند (نیم‌فاصله/فاصله‌های تکراری/حروف کوچک)."""
    text = ' '.join(str(value or '').replace('\u200c', ' ').split())
    return text.lower()


def match_party(name, parties):
    """نخستین طرف حساب با نام یکسان (یا None)."""
    key = normalize_party_name(name)
    if not key:
        return None
    for party in parties:
        if normalize_party_name(getattr(party, 'name', '')) == key:
            return party
    return None


def company_parties(company=None):
    """طرف‌حساب‌های فعال شرکت (لیست سبک برای تطبیق)."""
    from contracts.models import ContractParty

    queryset = ContractParty.objects.filter(is_active=True)
    if company is not None:
        queryset = queryset.filter(company=company)
    return list(queryset.only('id', 'name'))


def link_letter_parties(letter, company=None):
    """FKهای خالی (party_account / sender_party) را با تطبیق نام پر می‌کند."""
    updates = {}
    parties = None
    if not getattr(letter, 'party_account_id', None) and getattr(letter, 'party_name', ''):
        parties = company_parties(company)
        party = match_party(letter.party_name, parties)
        if party is not None:
            updates['party_account'] = party
    if (
        not getattr(letter, 'sender_party_id', None)
        and getattr(letter, 'sender_kind', '') == 'party'
        and getattr(letter, 'sender_name', '')
    ):
        if parties is None:
            parties = company_parties(company)
        party = match_party(letter.sender_name, parties)
        if party is not None:
            updates['sender_party'] = party
    if updates:
        for field, value in updates.items():
            setattr(letter, field, value)
        letter.save(update_fields=list(updates.keys()))
    return list(updates.keys())
