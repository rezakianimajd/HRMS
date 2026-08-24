"""
Encryption Engine - AES-256 encryption/decryption for sensitive fields.
Uses the SECRET_KEY from Django settings or a dedicated ENCRYPTION_KEY from env.
"""
import base64
import hashlib
import os
from django.conf import settings
from cryptography.fernet import Fernet


class EncryptionEngine:
    """
    Engine for encrypting/decrypting sensitive field values.
    Uses Fernet (AES-128-CBC + HMAC) with a key derived from settings.
    """

    @staticmethod
    def _get_key():
        """Derive a 32-byte Fernet key from SECRET_KEY or ENCRYPTION_KEY."""
        raw_key = os.environ.get('ENCRYPTION_KEY', settings.SECRET_KEY)
        # Hash to 32 bytes, then base64 encode for Fernet
        hashed = hashlib.sha256(raw_key.encode()).digest()
        return base64.urlsafe_b64encode(hashed)

    @staticmethod
    def encrypt(text):
        """
        Encrypt a plaintext string.
        Returns a base64-encoded ciphertext string, or the original if empty.
        """
        if not text:
            return text
        try:
            key = EncryptionEngine._get_key()
            f = Fernet(key)
            encrypted = f.encrypt(text.encode('utf-8'))
            return encrypted.decode('utf-8')
        except Exception:
            return text  # Fail-safe: return original on encryption error

    @staticmethod
    def decrypt(encrypted_text):
        """
        Decrypt a base64-encoded ciphertext string.
        Returns the original plaintext, or the input if decryption fails.
        """
        if not encrypted_text:
            return encrypted_text
        try:
            key = EncryptionEngine._get_key()
            f = Fernet(key)
            decrypted = f.decrypt(encrypted_text.encode('utf-8'))
            return decrypted.decode('utf-8')
        except Exception:
            return encrypted_text  # Fail-safe: return as-is on decryption error

    @staticmethod
    def mask_national_id(national_id):
        """Mask national ID: show only last 3 digits."""
        if not national_id:
            return ''
        return '*' * 7 + national_id[-3:]

    @staticmethod
    def mask_phone(phone):
        """Mask phone number: show only last 3 digits."""
        if not phone:
            return ''
        return '*' * (len(phone) - 3) + phone[-3:]

    @staticmethod
    def mask_address(address):
        """Mask address to '***' for privacy."""
        return '***' if address else ''

    # List of fields that should be encrypted in Employee model
    SENSITIVE_EMPLOYEE_FIELDS = [
        'national_id', 'phone', 'mobile', 'address', 'emergency_contact_phone',
    ]

    # Fields to encrypt in CompanyProfile
    SENSITIVE_COMPANY_FIELDS = [
        'national_id', 'economic_code',
    ]