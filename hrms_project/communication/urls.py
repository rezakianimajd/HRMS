"""URLs ماژول گفتگوی سازمانی (زیر ``/api/chat/``)."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from communication.views import (
    AttachmentViewSet, ConversationViewSet, DirectoryAPIView, EntitySearchAPIView,
    EventsAPIView, MessageViewSet, SearchAPIView, UnreadAPIView,
)

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='chat-conversation')
router.register(r'messages', MessageViewSet, basename='chat-message')
router.register(r'attachments', AttachmentViewSet, basename='chat-attachment')

urlpatterns = [
    path('events/', EventsAPIView.as_view(), name='chat-events'),
    path('unread/', UnreadAPIView.as_view(), name='chat-unread'),
    path('directory/', DirectoryAPIView.as_view(), name='chat-directory'),
    path('entity-search/', EntitySearchAPIView.as_view(), name='chat-entity-search'),
    path('search/', SearchAPIView.as_view(), name='chat-search'),
    path('', include(router.urls)),
]
