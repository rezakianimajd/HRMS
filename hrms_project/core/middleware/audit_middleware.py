"""
Audit Middleware - Logs user operations for audit trail.
Tracks CRUD operations and stores them in the AuditLog model.
"""
import logging
import json
from core.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


class AuditMiddleware:
    """
    Middleware to capture and store audit logs for user operations.
    Currently provides the structure for logging; full implementation
    will be extended with signals in future phases.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Log the request if user is authenticated
        if hasattr(request, 'user') and request.user.is_authenticated:
            self._log_request(request, response)

        return response

    def _log_request(self, request, response):
        """
        Log the current request to the audit log.
        Args:
            request: HTTP request object
            response: HTTP response object
        """
        # Only log mutation operations (POST, PUT, PATCH, DELETE)
        audit_actions = {
            'POST': 'CREATE',
            'PUT': 'UPDATE',
            'PATCH': 'UPDATE',
            'DELETE': 'DELETE',
        }

        action = audit_actions.get(request.method)
        if not action:
            return  # Skip GET, HEAD, OPTIONS

        try:
            # Determine model name from URL path
            # Example: /api/employees/ -> 'employees'
            path_parts = request.path.strip('/').split('/')
            model_name = path_parts[1] if len(path_parts) > 1 else 'unknown'

            # Get company from request
            company = getattr(request, 'tenant', None) or getattr(request, 'company', None)

            # Get IP address
            ip_address = self._get_client_ip(request)

            # Create audit log entry
            AuditLog.objects.create(
                user=request.user,
                company=company,
                action=action,
                model_name=model_name,
                object_id=self._extract_object_id(request, response),
                changes=self._extract_request_body(request),
                description=f"{request.method} {request.path}",
                ip_address=ip_address,
            )

        except Exception as e:
            # Don't let audit logging break the main request
            logger.error(f"Audit logging failed: {e}")

    def _get_client_ip(self, request):
        """
        Extract the client IP address from the request.
        Args:
            request: HTTP request object
        Returns:
            str: IP address
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def _extract_object_id(self, request, response):
        """
        Extract the object ID from the request or response.
        Args:
            request: HTTP request object
            response: HTTP response object
        Returns:
            str: Object ID or None
        """
        # Try to extract from URL path
        # Example: /api/employees/123/ -> '123'
        path_parts = request.path.strip('/').split('/')
        if len(path_parts) > 2 and path_parts[2].isdigit():
            return path_parts[2]

        # Try to extract from response data
        if hasattr(response, 'data') and isinstance(response.data, dict):
            return str(response.data.get('id', ''))

        return None

    def _extract_request_body(self, request):
        """
        Extract and sanitize request body for logging.
        Args:
            request: HTTP request object
        Returns:
            dict or None: Sanitized request body
        """
        if hasattr(request, 'data') and request.data:
            # Clone and sanitize to remove sensitive data
            data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
            # Remove sensitive fields from log
            sensitive_fields = ['password', 'token', 'refresh', 'access']
            for field in sensitive_fields:
                data.pop(field, None)
            return data
        return None