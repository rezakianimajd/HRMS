"""
Authentication Engine - Handles user authentication with JWT and multi-tenant support.
"""
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from core.models import Company


class AuthenticationEngine:
    """
    Engine for handling authentication operations.
    Provides login, token generation, and company-aware authentication.
    """

    @staticmethod
    def login(request, username, password, company_id=None):
        """
        Authenticate a user and generate JWT tokens.
        Also validates company access if company_id is provided.
        Args:
            request: HTTP request object
            username: User's username
            password: User's password
            company_id: Optional company ID for multi-tenant validation
        Returns:
            dict with tokens and user data, or None on failure
        """
        user = authenticate(request=request, username=username, password=password)
        if user is None:
            return None

        if not user.is_active:
            return None

        # Validate company access
        company = None
        if company_id:
            company = Company.objects.filter(id=company_id, is_active=True).first()
            if company is None:
                return None

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        # Add custom claims
        refresh['username'] = user.username
        if company:
            refresh['company_id'] = company.id
            refresh['company_code'] = company.code
            refresh['schema_name'] = company.schema_name

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_superuser': user.is_superuser,
            },
            'company': {
                'id': company.id,
                'name': company.name,
                'code': company.code,
            } if company else None,
        }

    @staticmethod
    def get_user_from_token(token):
        """
        Extract user from a JWT token.
        Args:
            token: JWT access token string
        Returns:
            User instance or None
        """
        from rest_framework_simplejwt.tokens import AccessToken
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

        try:
            access_token = AccessToken(token)
            user_id = access_token.get('user_id')
            if user_id:
                return User.objects.filter(id=user_id, is_active=True).first()
        except (InvalidToken, TokenError):
            pass
        return None

    @staticmethod
    def get_company_from_token(token):
        """
        Extract company from a JWT token's payload.
        Args:
            token: JWT access token string
        Returns:
            Company instance or None
        """
        from rest_framework_simplejwt.tokens import AccessToken
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

        try:
            access_token = AccessToken(token)
            company_id = access_token.get('company_id')
            if company_id:
                return Company.objects.filter(id=company_id, is_active=True).first()
        except (InvalidToken, TokenError):
            pass
        return None

    @staticmethod
    def create_tokens_for_user(user, company=None):
        """
        Generate JWT tokens for a given user with optional company claim.
        Args:
            user: Django User instance
            company: Optional Company instance
        Returns:
            dict with refresh and access tokens
        """
        refresh = RefreshToken.for_user(user)
        refresh['username'] = user.username
        if company:
            refresh['company_id'] = company.id
            refresh['company_code'] = company.code
            refresh['schema_name'] = company.schema_name

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

    @staticmethod
    def validate_company_access(user, company_id):
        """
        Check if a user has access to a specific company.
        Args:
            user: Django User instance
            company_id: Company ID to check
        Returns:
            bool: True if user has access
        """
        # Superusers can access all companies
        if user.is_superuser:
            return Company.objects.filter(id=company_id, is_active=True).exists()

        # Check via profile
        if hasattr(user, 'profile') and hasattr(user.profile, 'companies'):
            return user.profile.companies.filter(id=company_id, is_active=True).exists()

        return False

    @staticmethod
    def get_user_companies(user):
        """
        Get all companies accessible by a given user.
        Args:
            user: Django User instance
        Returns:
            QuerySet of Company instances
        """
        if user.is_superuser:
            return Company.objects.filter(is_active=True)

        if hasattr(user, 'profile') and hasattr(user.profile, 'companies'):
            return user.profile.companies.filter(is_active=True)

        return Company.objects.none()