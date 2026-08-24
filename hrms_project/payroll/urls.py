from django.urls import path, include
from rest_framework.routers import DefaultRouter
from payroll.views import TransactionViewSet, SalaryRecordViewSet, BenefitRecordViewSet

router = DefaultRouter()
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'salaries', SalaryRecordViewSet, basename='salary')
router.register(r'benefits', BenefitRecordViewSet, basename='benefit')

urlpatterns = [
    path('', include(router.urls)),
]