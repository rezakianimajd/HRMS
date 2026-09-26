"""Application (product) access endpoints."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import Application
from core.models.user import UserProfile


def _profile(user):
    try:
        return user.profile
    except UserProfile.DoesNotExist:
        return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def applications_view(request):
    """List applications the current user is allowed to access.

    Returns the full catalogue (including coming-soon / not-yet-built apps) so the
    UI can render a complete grid. Each entry carries an ``accessible`` flag
    indicating whether the current user may actually switch to it.
    """
    profile = _profile(request.user)
    is_admin = request.user.is_superuser or (profile and profile.is_super_admin)

    if is_admin:
        allowed = Application.objects.filter(is_active=True)
    else:
        allowed = profile.applications.filter(is_active=True) if profile else Application.objects.none()

    allowed_ids = set(allowed.values_list('id', flat=True))
    # Full catalogue of active apps for display purposes.
    catalogue = Application.objects.filter(is_active=True).order_by('order', 'title')

    data = [{
        'id': a.id,
        'slug': a.slug,
        'title': a.title,
        'description': a.description,
        'icon': a.icon,
        'color': a.color,
        'order': a.order,
        'is_coming_soon': a.is_coming_soon,
        'accessible': a.id in allowed_ids,
    } for a in catalogue]

    current = getattr(profile, 'current_application', None) if profile else None
    return Response({
        'applications': data,
        'current_application_id': current.id if current else None,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def switch_application_view(request):
    """Set the current application for the user."""
    profile = _profile(request.user)
    if not profile:
        return Response({'error': 'پروفایل کاربر یافت نشد.'}, status=404)

    app_id = request.data.get('application_id')
    if not app_id:
        return Response({'error': 'application_id الزامی است.'}, status=400)

    # Superusers can switch to any active app; otherwise only allowed apps.
    qs = Application.objects.filter(id=app_id, is_active=True)
    if not (request.user.is_superuser or (profile and profile.is_super_admin)):
        qs = qs.filter(users=profile)

    app = qs.first()
    if not app:
        return Response({'error': 'دسترسی به این سامانه مجاز نیست.'}, status=403)

    profile.current_application = app
    profile.save(update_fields=['current_application', 'updated_at'])

    return Response({
        'slug': app.slug,
        'title': app.title,
        'icon': app.icon,
        'color': app.color,
    })