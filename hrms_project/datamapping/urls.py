from django.urls import path
from datamapping import views

urlpatterns = [
    path('sources/', views.sources, name='dm-sources'),
    path('options/', views.options, name='dm-options'),
    path('preview/', views.preview, name='dm-preview'),
    path('apply/', views.apply, name='dm-apply'),
    path('entries/', views.entries, name='dm-entries'),
    path('import-documents/', views.import_documents, name='dm-import-documents'),
    path('sync-auxiliaries/', views.sync_auxiliaries, name='dm-sync-auxiliaries'),
    path('auxiliary-sources/', views.auxiliary_sources, name='dm-auxiliary-sources'),
    path('clear-codings/', views.clear_codings, name='dm-clear-codings'),
    path('template/', views.template, name='dm-template'),
]
