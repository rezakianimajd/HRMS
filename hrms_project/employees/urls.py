from django.urls import path, include
from rest_framework.routers import DefaultRouter
from employees.views import (
    EmployeeViewSet, DepartmentViewSet, WorkLocationViewSet,
    JobTitleViewSet, InsuranceListViewSet, ContractTypeViewSet,
    EmploymentChangeViewSet, ContractVersionViewSet, WorkExperienceViewSet,
    EmploymentChangeReadViewSet, ContractVersionReadViewSet,
)
from employees.phonebook_views import PhonebookViewSet
from employees import report_views
from employees import dashboard_views
from employees import assistant_views
from employees import scoring_views

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'work-locations', WorkLocationViewSet, basename='work-location')
router.register(r'job-titles', JobTitleViewSet, basename='job-title')
router.register(r'insurance-lists', InsuranceListViewSet, basename='insurance-list')
router.register(r'contract-types', ContractTypeViewSet, basename='contract-type')
router.register(r'phonebook', PhonebookViewSet, basename='phonebook')
router.register(r'employment-changes', EmploymentChangeViewSet, basename='employment-change')
router.register(r'contract-versions', ContractVersionViewSet, basename='contract-version')
router.register(r'work-experiences', WorkExperienceViewSet, basename='work-experience')

urlpatterns = [
    path('', include(router.urls)),

    # Search API
    path('search/', include('core.urls_search')),

    # Reports
    path('reports/employees-by-department/', report_views.employees_by_department),
    path('reports/employees-by-location/', report_views.employees_by_location),
    path('reports/employees-by-job-title/', report_views.employees_by_job_title),
    path('reports/employees-by-insurance/', report_views.employees_by_insurance),
    path('reports/employees-by-gender/', report_views.employees_by_gender),
    path('reports/employees-by-contract-type/', report_views.employees_by_contract_type),
    path('reports/employees-by-marital-status/', report_views.employees_by_marital_status),
    path('reports/employees-by-work-shift/', report_views.employees_by_work_shift),
    path('reports/employees-by-age-group/', report_views.employees_by_age_group),
    path('reports/monthly-hires-trend/', report_views.monthly_hires_trend),
    path('reports/turnover-rate/', report_views.turnover_rate),
    path('reports/salary-cost/', report_views.salary_cost),
    path('reports/average-age-experience/', report_views.average_age_experience),
    path('reports/contracts-expiring/', report_views.contracts_expiring),
    path('reports/leave-balance-summary/', report_views.leave_balance_summary),
    path('reports/upcoming-birthdays/', report_views.upcoming_birthdays),
    path('reports/correspondences-summary/', report_views.correspondences_summary),
    path('reports/salary-benefits-summary/', report_views.salary_and_benefits_summary),

    # Dashboard
    path('dashboard/stats/', dashboard_views.dashboard_stats),
    path('dashboard/recent-activities/', dashboard_views.dashboard_recent_activities),
    path('dashboard/alerts/', dashboard_views.dashboard_alerts),

    # Assistant data (consolidated, fresh from DB)
    path('assistant/data/', assistant_views.assistant_data),
    # Assistant query (hybrid: intent + entity + SQL + RAG + risk scoring)
    path('assistant/query/', assistant_views.assistant_query),
    # Assistant chart (SVG, offline)
    path('assistant/chart/', assistant_views.assistant_chart),

    # Employee scoring (weighted multi-criteria evaluation)
    path('scoring/employees/', scoring_views.employee_scores),
    path('scoring/employees/<int:employee_id>/', scoring_views.employee_score_detail),
]
