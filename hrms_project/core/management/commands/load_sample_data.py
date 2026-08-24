"""Management command to load sample data for testing and development."""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date, timedelta
from django.db import connection
from django.conf import settings
from core.models import Company
from employees.models import Employee, Department, WorkLocation, JobTitle, InsuranceList
from documents.models import DocumentType, Document
from settings_app.models import SystemSetting, CompanyProfile


class Command(BaseCommand):
    help = 'Load sample data for testing and development'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Loading sample data...'))

        # Check if using SQLite (development mode)
        is_sqlite = 'sqlite3' in settings.DATABASES['default']['ENGINE']

        # Get or create the first active company
        company = Company.objects.filter(is_active=True).first()
        if not company:
            self.stdout.write('Creating default company...')
            company = Company.objects.create(
                schema_name='public',
                name='شرکت نمونه',
                code='DEMO',
                is_active=True,
            )
            self.stdout.write(self.style.SUCCESS(f'  ✓ Company "{company.name}" created with ID {company.id}'))

        if not is_sqlite:
            # Switch to company schema (PostgreSQL only)
            try:
                connection.set_tenant(company)
            except Exception:
                pass  # Skip if set_tenant fails (not using django_tenants)
        else:
            self.stdout.write(self.style.NOTICE('  Running in SQLite mode - skipping schema switching'))

        # =========================================================================
        # 1. Departments
        # =========================================================================
        self.stdout.write('Creating departments...')
        dept_data = [
            {'name': 'مدیریت', 'code': 'MGT'},
            {'name': 'فنی و مهندسی', 'code': 'ENG'},
            {'name': 'مالی و حسابداری', 'code': 'FIN'},
            {'name': 'فروش و بازاریابی', 'code': 'SALES'},
            {'name': 'اداری و پشتیبانی', 'code': 'ADMIN'},
        ]
        departments = {}
        for d in dept_data:
            dept, _ = Department.objects.get_or_create(company=company, code=d['code'], defaults={'name': d['name']})
            departments[d['code']] = dept
            self.stdout.write(f'  ✓ {dept.name}')

        # =========================================================================
        # 2. Work Locations
        # =========================================================================
        self.stdout.write('Creating work locations...')
        loc_data = [
            {'name': 'دفتر مرکزی', 'code': 'HQ'},
            {'name': 'شعبه شمال', 'code': 'BR1'},
            {'name': 'شعبه جنوب', 'code': 'BR2'},
        ]
        locations = {}
        for l in loc_data:
            loc, _ = WorkLocation.objects.get_or_create(company=company, code=l['code'], defaults={'name': l['name']})
            locations[l['code']] = loc
            self.stdout.write(f'  ✓ {loc.name}')

        # =========================================================================
        # 3. Job Titles
        # =========================================================================
        self.stdout.write('Creating job titles...')
        title_data = [
            {'name': 'مدیرعامل', 'code': 'CEO', 'level': 'executive'},
            {'name': 'مدیر فنی', 'code': 'CTO', 'level': 'executive'},
            {'name': 'مدیر مالی', 'code': 'CFO', 'level': 'executive'},
            {'name': 'مدیر فروش', 'code': 'SALES_MGR', 'level': 'executive'},
            {'name': 'مدیر اداری', 'code': 'ADMIN_MGR', 'level': 'executive'},
            {'name': 'برنامه‌نویس ارشد', 'code': 'SR_DEV', 'level': 'expert'},
            {'name': 'برنامه‌نویس', 'code': 'DEV', 'level': 'expert'},
            {'name': 'حسابدار', 'code': 'ACCT', 'level': 'expert'},
            {'name': 'کارشناس فروش', 'code': 'SALES_REP', 'level': 'expert'},
            {'name': 'کارمند اداری', 'code': 'CLERK', 'level': 'operational'},
        ]
        titles = {}
        for t in title_data:
            title, _ = JobTitle.objects.get_or_create(company=company, code=t['code'], defaults={'name': t['name'], 'level': t['level']})
            titles[t['code']] = title
            self.stdout.write(f'  ✓ {title.name}')

        # =========================================================================
        # 4. Insurance Lists
        # =========================================================================
        self.stdout.write('Creating insurance lists...')
        ins_data = [
            {'name': 'لیست بیمه اصلی', 'code': 'INS_MAIN', 'description': 'کد کارگاهی ۱۲۳۴۵۶'},
            {'name': 'بیمه تکمیلی', 'code': 'INS_SUPP', 'description': 'بیمه تکمیلی درمان'},
        ]
        insurances = {}
        for i in ins_data:
            ins, _ = InsuranceList.objects.get_or_create(company=company, code=i['code'], defaults={'name': i['name'], 'description': i.get('description', '')})
            insurances[i['code']] = ins
            self.stdout.write(f'  ✓ {ins.name}')

        # =========================================================================
        # 5. Document Types
        # =========================================================================
        self.stdout.write('Creating document types...')
        doctype_data = [
            {'name': 'کارت ملی', 'code': 'NATIONAL_ID'},
            {'name': 'قرارداد', 'code': 'CONTRACT'},
            {'name': 'مدرک تحصیلی', 'code': 'DEGREE'},
            {'name': 'گواهی', 'code': 'CERTIFICATE'},
            {'name': 'سایر', 'code': 'OTHER'},
        ]
        doctypes = {}
        for dt in doctype_data:
            dtype, _ = DocumentType.objects.get_or_create(company=company, code=dt['code'], defaults={'name': dt['name']})
            doctypes[dt['code']] = dtype
            self.stdout.write(f'  ✓ {dtype.name}')

        # =========================================================================
        # 6. Employees (20 sample employees)
        # =========================================================================
        self.stdout.write('Creating sample employees...')
        employees_data = [
            {'first_name': 'علی', 'last_name': 'محمدی', 'national_id': '0012345678', 'employee_id': 'EMP001', 'mobile': '09120000001', 'birth_date': '1985-03-15', 'gender': 'male', 'marital_status': 'married', 'children_count': 2, 'spouse_name': 'مریم احمدی', 'department': 'MGT', 'job_title': 'CEO', 'work_location': 'HQ', 'insurance_list': 'INS_MAIN', 'contract_type': 'permanent', 'hire_date': '2010-01-01', 'status': 'active', 'work_shift': 'morning'},
            {'first_name': 'مریم', 'last_name': 'احمدی', 'national_id': '0023456789', 'employee_id': 'EMP002', 'mobile': '09120000002', 'birth_date': '1987-07-22', 'gender': 'female', 'marital_status': 'married', 'children_count': 1, 'spouse_name': 'علی محمدی', 'department': 'MGT', 'job_title': 'CFO', 'work_location': 'HQ', 'insurance_list': 'INS_MAIN', 'contract_type': 'permanent', 'hire_date': '2012-05-15', 'status': 'active', 'work_shift': 'morning'},
            {'first_name': 'رضا', 'last_name': 'کریمی', 'national_id': '0034567890', 'employee_id': 'EMP003', 'mobile': '09120000003', 'birth_date': '1990-01-10', 'gender': 'male', 'marital_status': 'single', 'children_count': 0, 'spouse_name': '', 'department': 'ENG', 'job_title': 'CTO', 'work_location': 'HQ', 'insurance_list': 'INS_MAIN', 'contract_type': 'permanent', 'hire_date': '2015-03-01', 'status': 'active', 'work_shift': 'morning'},
            {'first_name': 'سارا', 'last_name': 'نوروزی', 'national_id': '0045678901', 'employee_id': 'EMP004', 'mobile': '09120000004', 'birth_date': '1992-06-18', 'gender': 'female', 'marital_status': 'married', 'children_count': 1, 'spouse_name': 'حسین رضایی', 'department': 'ENG', 'job_title': 'SR_DEV', 'work_location': 'HQ', 'insurance_list': 'INS_MAIN', 'contract_type': 'permanent', 'hire_date': '2016-08-20', 'status': 'active', 'work_shift': 'morning'},
            {'first_name': 'حسین', 'last_name': 'رضایی', 'national_id': '0056789012', 'employee_id': 'EMP005', 'mobile': '09120000005', 'birth_date': '1993-11-05', 'gender': 'male', 'marital_status': 'married', 'children_count': 0, 'spouse_name': 'سارا نوروزی', 'department': 'ENG', 'job_title': 'DEV', 'work_location': 'HQ', 'insurance_list': 'INS_MAIN', 'contract_type': 'permanent', 'hire_date': '2017-01-15', 'status': 'active', 'work_shift': 'morning'},
            {'first_name': 'فاطمه', 'last_name': 'موسوی', 'national_id': '0067890123', 'employee_id': 'EMP006', 'mobile': '09120000006', 'birth_date': '1988-09-30', 'gender': 'female', 'marital_status': 'married', 'children_count': 2, 'spouse_name': 'محمد جوادی', 'department': 'FIN', 'job_title': 'ACCT', 'work_location': 'HQ', 'insurance_list': 'INS_MAIN', 'contract_type': 'permanent', 'hire_date': '2014-06-01', 'status': 'active', 'work_shift': 'morning'},
            {'first_name': 'محمد', 'last_name': 'جوادی', 'national_id': '0078901234', 'employee_id': 'EMP007', 'mobile': '09120000007', 'birth_date': '1986-04-12', 'gender': 'male', 'marital_status': 'married', 'children_count': 3, 'spouse_name': 'فاطمه موسوی', 'department': 'SALES', 'job_title': 'SALES_MGR', 'work_location': 'HQ', 'insurance_list': 'INS_MAIN', 'contract_type': 'permanent', 'hire_date': '2013-02-10', 'status': 'active', 'work_shift': 'morning'},
            {'first_name': 'زهرا', 'last_name': 'حسینی', 'national_id': '0089012345', 'employee_id': 'EMP008', 'mobile': '09120000008', 'birth_date': '1995-02-28', 'gender': 'female', 'marital_status': 'single', 'children_count': 0, 'spouse_name': '', 'department': 'SALES', 'job_title': 'SALES_REP', 'work_location': 'BR1', 'insurance_list': 'INS_MAIN', 'contract_type': 'temporary', 'hire_date': '2018-09-01', 'contract_start_date': '2018-09-01', 'contract_end_date': str(date.today().replace(year=date.today().year + 1)), 'status': 'active', 'work_shift': 'morning'},
            {'first_name': 'امیر', 'last_name': 'جعفری', 'national_id': '0090123456', 'employee_id': 'EMP009', 'mobile': '09120000009', 'birth_date': '1991-08-14', 'gender': 'male', 'marital_status': 'single', 'children_count': 0, 'spouse_name': '', 'department': 'ADMIN', 'job_title': 'ADMIN_MGR', 'work_location': 'HQ', 'insurance_list': 'INS_MAIN', 'contract_type': 'permanent', 'hire_date': '2016-04-20', 'status': 'active', 'work_shift': 'morning'},
            {'first_name': 'نگین', 'last_name': 'رستمی', 'national_id': '0101234567', 'employee_id': 'EMP010', 'mobile': '09120000010', 'birth_date': '1994-12-01', 'gender': 'female', 'marital_status': 'married', 'children_count': 1, 'spouse_name': 'کیوان ملکی', 'department': 'ADMIN', 'job_title': 'CLERK', 'work_location': 'HQ', 'insurance_list': 'INS_MAIN', 'contract_type': 'permanent', 'hire_date': '2019-01-10', 'status': 'active', 'work_shift': 'morning'},
            {'first_name': 'کیوان', 'last_name': 'ملکی', 'national_id': '0112345678', 'employee_id': 'EMP011', 'mobile': '09120000011', 'birth_date': '1989-05-20', 'gender': 'male', 'marital_status': 'married', 'children_count': 1, 'spouse_name': 'نگین رستمی', 'department': 'ENG', 'job_title': 'DEV', 'work_location': 'BR2', 'insurance_list': 'INS_SUPP', 'contract_type': 'project', 'hire_date': '2020-06-15', 'contract_start_date': '2020-06-15', 'contract_end_date': str(date.today() + timedelta(days=120)), 'status': 'active', 'work_shift': 'rotating'},
            {'first_name': 'پریسا', 'last_name': 'صادقی', 'national_id': '0123456789', 'employee_id': 'EMP012', 'mobile': '09120000012', 'birth_date': '1996-03-08', 'gender': 'female', 'marital_status': 'single', 'children_count': 0, 'spouse_name': '', 'department': 'FIN', 'job_title': 'ACCT', 'work_location': 'HQ', 'insurance_list': 'INS_MAIN', 'contract_type': 'contractor', 'hire_date': '2021-02-01', 'status': 'active', 'work_shift': 'morning'},
            {'first_name': 'بهرام', 'last_name': 'قاسمی', 'national_id': '0134567890', 'employee_id': 'EMP013', 'mobile': '09120000013', 'birth_date': '1978-10-25', 'gender': 'male', 'marital_status': 'married', 'children_count': 3, 'spouse_name': 'شهلا طاهری', 'department': 'SALES', 'job_title': 'SALES_REP', 'work_location': 'BR1', 'insurance_list': 'INS_MAIN', 'contract_type': 'permanent', 'hire_date': '2008-01-01', 'status': 'retired', 'status_change_date': str(date.today() - timedelta(days=180)), 'work_shift': 'morning'},
            {'first_name': 'شهلا', 'last_name': 'طاهری', 'national_id': '0145678901', 'employee_id': 'EMP014', 'mobile': '09120000014', 'birth_date': '1980-04-18', 'gender': 'female', 'marital_status': 'married', 'children_count': 3, 'spouse_name': 'بهرام قاسمی', 'department': 'ADMIN', 'job_title': 'CLERK', 'work_location': 'HQ', 'insurance_list': 'INS_MAIN', 'contract_type': 'permanent', 'hire_date': '2010-03-15', 'status': 'leave', 'status_change_date': str(date.today() - timedelta(days=30)), 'work_shift': 'morning'},
            {'first_name': 'سیامک', 'last_name': 'فروهر', 'national_id': '0156789012', 'employee_id': 'EMP015', 'mobile': '09120000015', 'birth_date': '1983-07-12', 'gender': 'male', 'marital_status': 'divorced', 'children_count': 0, 'spouse_name': '', 'department': 'ENG', 'job_title': 'DEV', 'work_location': 'BR2', 'insurance_list': 'INS_SUPP', 'contract_type': 'temporary', 'hire_date': '2022-04-01', 'contract_start_date': '2022-04-01', 'contract_end_date': str(date.today() + timedelta(days=60)), 'status': 'active', 'work_shift': 'evening'},
        ]

        for emp_data in employees_data:
            # Check if already exists by employee_id
            if Employee.objects.filter(company=company, employee_id=emp_data['employee_id']).exists():
                continue

            Employee.objects.create(
                company=company,
                first_name=emp_data['first_name'],
                last_name=emp_data['last_name'],
                national_id=emp_data['national_id'],
                birth_date=emp_data['birth_date'],
                gender=emp_data['gender'],
                marital_status=emp_data['marital_status'],
                children_count=emp_data['children_count'],
                spouse_name=emp_data['spouse_name'],
                mobile=emp_data['mobile'],
                employee_id=emp_data['employee_id'],
                hire_date=emp_data['hire_date'],
                department=departments[emp_data['department']],
                job_title=titles[emp_data['job_title']],
                work_location=locations[emp_data['work_location']],
                insurance_list=insurances[emp_data['insurance_list']],
                contract_type=emp_data['contract_type'],
                contract_start_date=emp_data.get('contract_start_date'),
                contract_end_date=emp_data.get('contract_end_date'),
                status=emp_data['status'],
                status_change_date=emp_data.get('status_change_date'),
                work_shift=emp_data.get('work_shift', 'morning'),
            )
            self.stdout.write(f"  ✓ Employee: {emp_data['first_name']} {emp_data['last_name']} ({emp_data['employee_id']})")

        # =========================================================================
        # 7. System Settings (defaults)
        # =========================================================================
        self.stdout.write('Creating default system settings...')
        for default in SystemSetting.get_default_settings():
            SystemSetting.objects.get_or_create(
                company=company,
                key=default['key'],
                defaults={
                    'value': default['value'],
                    'data_type': default['data_type'],
                    'description': default['description'],
                    'is_editable': default['is_editable'],
                }
            )
        self.stdout.write(f'  ✓ {len(SystemSetting.get_default_settings())} settings created')

        # =========================================================================
        # 8. Company Profile
        # =========================================================================
        CompanyProfile.objects.get_or_create(
            company=company,
            defaults={
                'legal_name': f'شرکت {company.name} (سهامی خاص)',
                'phone': '021-12345678',
                'email': 'info@company.com',
                'website': 'https://www.company.com',
            }
        )
        self.stdout.write('  ✓ Company profile created')

        self.stdout.write(self.style.SUCCESS(f'\nSample data loaded successfully for company: {company.name}'))
        self.stdout.write(f'  Employees: {Employee.objects.filter(company=company).count()}')
        self.stdout.write(f'  Departments: {Department.objects.filter(company=company).count()}')
        self.stdout.write(f'  Job Titles: {JobTitle.objects.filter(company=company).count()}')
        self.stdout.write(f'  Work Locations: {WorkLocation.objects.filter(company=company).count()}')