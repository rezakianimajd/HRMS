"""
Language Middleware - Detects user language and activates it.
Sets the language based on session, browser preferences, or default settings.
"""
import logging
from django.utils import translation
from core.engines.language_engine import LanguageEngine

logger = logging.getLogger(__name__)


class LanguageMiddleware:
    """
    Middleware to detect and activate the user's preferred language.
    Sets the language for each request based on session or browser settings.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        language_code = self._detect_language(request)
        self._activate_language(request, language_code)

        response = self.get_response(request)

        # Set language header in response for frontend reference
        response['Content-Language'] = language_code
        response['X-Language-Direction'] = LanguageEngine.get_language_direction(language_code)

        return response

    def _detect_language(self, request):
        """
        Detect the appropriate language for the request.
        Priority:
        1. URL query parameter (?lang=fa)
        2. Session-stored language
        3. Browser's Accept-Language header
        4. Default language from settings
        """
        # 1. Check URL query parameter
        lang_param = request.GET.get('lang')
        if lang_param and LanguageEngine.is_language_supported(lang_param):
            return lang_param

        # 2-4. Use LanguageEngine's detection logic
        return LanguageEngine.get_current_language(request)

    def _activate_language(self, request, language_code):
        """
        Activate the detected language for the current request.
        Args:
            request: HTTP request object
            language_code: Language code to activate
        """
        if LanguageEngine.is_language_supported(language_code):
            translation.activate(language_code)
            request.LANGUAGE_CODE = language_code
            # Store in request for later use
            request.language_dir = LanguageEngine.get_language_direction(language_code)
        else:
            # Fallback to default
            translation.activate('fa')
            request.LANGUAGE_CODE = 'fa'
            request.language_dir = 'rtl'