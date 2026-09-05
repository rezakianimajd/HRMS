"""
URL configuration for hrms_project project.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static

def root_view(request):
    return JsonResponse({
        'app': 'HRMS API',
        'version': '1.0.0',
        'frontend': 'http://localhost:3000',
        'endpoints': {
            'admin': '/admin/',
            'api': '/api/',
            'docs': '/api/',
        }
    })

urlpatterns = [
    path('', root_view, name='root'),
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('api/search/', include('core.urls_search')),
    path('api/', include('employees.urls')),
    path('api/', include('documents.urls')),
    path('api/', include('orgchart.urls')),
    path('api/', include('settings_app.urls')),
    path('api/', include('payroll.urls')),
    path('api/', include('correspondences.urls')),
    path('api/', include('attendance.urls')),
    path('api/', include('leaves.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)