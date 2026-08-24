"""
URL configuration for the core app.
"""
from django.urls import path
from core import views

urlpatterns = [
    # Authentication
    path('auth/login/', views.login_view, name='api-login'),
    path('auth/logout/', views.logout_view, name='api-logout'),
    path('auth/me/', views.me_view, name='api-me'),

    # Companies
    path('companies/', views.company_list_view, name='api-company-list'),
    path('companies/<int:company_id>/', views.company_detail_view, name='api-company-detail'),
    path('companies/current/', views.current_company_view, name='api-company-current'),
    path('companies/switch/', views.switch_company_view, name='api-company-switch'),

    # Languages
    path('languages/', views.language_list_view, name='api-language-list'),
    path('languages/current/', views.current_language_view, name='api-language-current'),
    path('languages/switch/', views.switch_language_view, name='api-language-switch'),

    # Audit Logs
    path('audit-logs/', views.audit_log_list_view, name='api-audit-logs'),
]