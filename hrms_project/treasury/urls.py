from django.urls import path, include
from rest_framework.routers import DefaultRouter
from treasury.views import (
    TreasuryEntityViewSet, TreasuryTransactionViewSet, PayableItemViewSet,
    CheckBookViewSet, ReceivedCheckViewSet, IssuedCheckViewSet,
)

router = DefaultRouter()
router.register(r'treasury-entities', TreasuryEntityViewSet, basename='treasury-entity')
router.register(r'treasury-transactions', TreasuryTransactionViewSet, basename='treasury-transaction')
router.register(r'payable-items', PayableItemViewSet, basename='payable-item')
router.register(r'check-books', CheckBookViewSet, basename='check-book')
router.register(r'received-checks', ReceivedCheckViewSet, basename='received-check')
router.register(r'issued-checks', IssuedCheckViewSet, basename='issued-check')

urlpatterns = [
    path('', include(router.urls)),
]