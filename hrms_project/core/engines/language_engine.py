"""
Language Engine - Handles multi-language (i18n) operations.
Supports Persian (fa) and English (en) with RTL/LTR detection.
"""
from django.conf import settings
from django.utils import translation


class LanguageEngine:
    """
    Engine for managing multi-language support.
    Provides language detection, switching, and direction detection.
    """

    SUPPORTED_LANGUAGES = [
        ('fa', 'فارسی'),
        ('en', 'English'),
    ]

    # Language direction mapping
    LANGUAGE_DIRECTIONS = {
        'fa': 'rtl',
        'en': 'ltr',
        'ar': 'rtl',
    }

    @staticmethod
    def get_supported_languages():
        """
        Get the list of supported languages.
        Returns:
            list of (code, name) tuples
        """
        return LanguageEngine.SUPPORTED_LANGUAGES

    @staticmethod
    def is_language_supported(language_code):
        """
        Check if a language code is supported.
        Args:
            language_code: Two-letter language code (e.g., 'fa', 'en')
        Returns:
            bool
        """
        return language_code in dict(LanguageEngine.SUPPORTED_LANGUAGES)

    @staticmethod
    def get_current_language(request):
        """
        Detect the current language from the request.
        Priority:
        1. Session-stored language
        2. Browser's Accept-Language header
        3. Django's default LANGUAGE_CODE
        Args:
            request: HTTP request object
        Returns:
            language code string (e.g., 'fa')
        """
        # 1. Check session
        if hasattr(request, 'session'):
            session_lang = request.session.get('language')
            if session_lang and LanguageEngine.is_language_supported(session_lang):
                return session_lang

        # 2. Check browser's Accept-Language header
        if hasattr(request, 'META'):
            accept_lang = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
            if accept_lang:
                # Parse the first language from the header
                # Format: "fa-IR,fa;q=0.9,en;q=0.8"
                primary_lang = accept_lang.split(',')[0].split('-')[0].strip()
                if LanguageEngine.is_language_supported(primary_lang):
                    return primary_lang

        # 3. Fallback to Django's default
        return settings.LANGUAGE_CODE

    @staticmethod
    def set_language(request, language_code):
        """
        Set the user's language and store in session.
        Args:
            request: HTTP request object
            language_code: Two-letter language code (e.g., 'fa', 'en')
        Returns:
            bool: True if successful, False otherwise
        """
        if not LanguageEngine.is_language_supported(language_code):
            return False

        # Activate the language for the current thread
        translation.activate(language_code)

        # Store in session
        if hasattr(request, 'session'):
            request.session['language'] = language_code
            request.session['language_dir'] = LanguageEngine.get_language_direction(language_code)

        return True

    @staticmethod
    def get_language_direction(language_code):
        """
        Get the text direction (RTL/LTR) for a given language.
        Args:
            language_code: Two-letter language code
        Returns:
            'rtl' or 'ltr'
        """
        return LanguageEngine.LANGUAGE_DIRECTIONS.get(language_code, 'ltr')

    @staticmethod
    def get_language_name(language_code):
        """
        Get the display name of a language.
        Args:
            language_code: Two-letter language code
        Returns:
            Language name string or None
        """
        lang_dict = dict(LanguageEngine.SUPPORTED_LANGUAGES)
        return lang_dict.get(language_code)

    @staticmethod
    def get_current_direction(request):
        """
        Get the current language direction from session.
        Args:
            request: HTTP request object
        Returns:
            'rtl' or 'ltr'
        """
        if hasattr(request, 'session'):
            return request.session.get('language_dir', 'rtl')
        lang = settings.LANGUAGE_CODE
        return LanguageEngine.get_language_direction(lang)