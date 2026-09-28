from django.urls import path, include
from rest_framework.routers import DefaultRouter
from treasury.views import (
    TreasuryEntityViewSet, TreasuryTransactionViewSet, PayableItemViewSet,
)

router = DefaultRouter()
router.register(r'treasury-entities', TreasuryEntityViewSet, basename='treasury-entity')
router.register(r'treasury-transactions', TreasuryTransactionViewSet, basename='treasury-transaction')
router.register(r'payable-items', PayableItemViewSet, basename='payable-item')

urlpatterns = [
    path('', include(router.urls)),
]