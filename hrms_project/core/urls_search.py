"""URLs for the advanced search API."""
from django.urls import path
from core import search_views

urlpatterns = [
    path('', search_views.advanced_search_view, name='api-advanced-search'),
    path('employees/', search_views.search_employees_view, name='api-search-employees'),
    path('documents/', search_views.search_documents_view, name='api-search-documents'),
]