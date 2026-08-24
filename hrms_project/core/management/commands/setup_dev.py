"""
One-command dev setup: creates superuser, company, and sample data.
Usage: python manage.py setup_dev
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from core.models import Company
from employees.models import Employee, Department, WorkLocation, JobTitle, InsuranceList, ContractType
from documents.models import DocumentType
from orgchart.models import Position
from settings_app.models import SystemSetting, CompanyProfile


class Command(BaseCommand):
    help = 'Create superuser, company, and sample data for development'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('=== HRMS Dev Setup ==='))

        # 1. Create superuser
        username, email, password = 'admin', 'admin@hrms.local', 'admin123'
        user, created = User.objects.get_or_create(username=username, defaults={'email': email, 'is_superuser': True, 'is_staff': True})
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'✓ Superuser created: {username} / {password}'))
        else:
            user.set_password(password)
            user.save()
            self.stdout.write(f'  Superuser already exists. Password reset to: {password}')

        # 2. Create default company
        company, created = Company.objects.get_or_create(
            code='DEMO',
            defaults={'name': 'شرکت نمونه', 'schema_name': 'demo', 'is_active': True}
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Company created: {company.name}'))
        else:
            self.stdout.write(f'  Company already exists: {company.name}')

        # 3. Create departments
        depts = {}
        for name, code in [('مدیریت', 'MGT'), ('فنی', 'ENG'), ('مالی', 'FIN'), ('فروش', 'SALES'), ('اداری', 'ADMIN')]:
            d, _ = Department.objects.get_or_create(company=company, code=code, defaults={'name': name})
            depts[code] = d
        self.stdout.write(f'✓ Departments: {len(depts)}')

        # 4. Create work locations
        for name, code in [('دفتر مرکزی', 'HQ'), ('شعبه شمال', 'BR1'), ('شعبه جنوب', 'BR2')]:
            WorkLocation.objects.get_or_create(company=company, code=code, defaults={'name': name})

        # 5. Create job titles
        for name, code, level in [
            ('مدیرعامل', 'CEO', 'executive'), ('مدیر فنی', 'CTO', 'executive'),
            ('برنامه‌نویس', 'DEV', 'expert'), ('حسابدار', 'ACCT', 'expert'),
            ('کارمند', 'CLERK', 'operational'),
        ]:
            JobTitle.objects.get_or_create(company=company, code=code, defaults={'name': name, 'level': level})

        # 6. Create insurance
        InsuranceList.objects.get_or_create(company=company, code='INS_MAIN', defaults={'name': 'بیمه اصلی', 'description': 'کد کارگاهی ۱۲۳۴۵۶'})

        # 6b. Create contract types
        for name, code in [('دائم', 'PERMANENT'), ('موقت', 'TEMPORARY'), ('پروژه‌ای', 'PROJECT'), ('پیمانی', 'CONTRACTOR')]:
            ContractType.objects.get_or_create(company=company, code=code, defaults={'name': name})
        self.stdout.write(f'✓ Contract types created')

        # 7. Create document types
        for name, code in [('کارت ملی', 'NID'), ('قرارداد', 'CONTRACT'), ('مدرک تحصیلی', 'DEGREE'), ('سایر', 'OTHER')]:
            DocumentType.objects.get_or_create(company=company, code=code, defaults={'name': name})

        # 8. System settings
        for d in SystemSetting.get_default_settings():
            SystemSetting.objects.get_or_create(company=company, key=d['key'], defaults={
                'value': d['value'], 'data_type': d['data_type'], 'description': d['description'], 'is_editable': d['is_editable']
            })

        # 9. Company profile
        CompanyProfile.objects.get_or_create(company=company, defaults={'legal_name': f'شرکت {company.name}', 'phone': '021-12345678'})

        # 10. Create Org Chart Positions
        self.stdout.write('Creating organizational chart positions...')
        pos_data = [
            {'title': 'مدیریت عامل', 'code': 'POS-CEO', 'level': 1, 'parent': None, 'dept': 'MGT'},
            {'title': 'معاونت فنی', 'code': 'POS-CTO', 'level': 2, 'parent': 'POS-CEO', 'dept': 'MGT'},
            {'title': 'معاونت مالی', 'code': 'POS-CFO', 'level': 2, 'parent': 'POS-CEO', 'dept': 'MGT'},
            {'title': 'مدیر توسعه نرم‌افزار', 'code': 'POS-DEV-MGR', 'level': 3, 'parent': 'POS-CTO', 'dept': 'ENG'},
            {'title': 'مدیر زیرساخت', 'code': 'POS-INFRA-MGR', 'level': 3, 'parent': 'POS-CTO', 'dept': 'ENG'},
            {'title': 'برنامه‌نویس ارشد', 'code': 'POS-SRDEV', 'level': 4, 'parent': 'POS-DEV-MGR', 'dept': 'ENG'},
            {'title': 'مدیر حسابداری', 'code': 'POS-ACCT-MGR', 'level': 3, 'parent': 'POS-CFO', 'dept': 'FIN'},
            {'title': 'مدیر فروش', 'code': 'POS-SALES-MGR', 'level': 2, 'parent': 'POS-CEO', 'dept': 'SALES'},
            {'title': 'مدیر اداری', 'code': 'POS-ADMIN-MGR', 'level': 2, 'parent': 'POS-CEO', 'dept': 'ADMIN'},
        ]
        positions = {}
        for p in pos_data:
            parent = positions.get(p['parent']) if p['parent'] else None
            pos, _ = Position.objects.get_or_create(
                company=company, code=p['code'],
                defaults={'title': p['title'], 'level': p['level'], 'parent': parent, 'department': depts[p['dept']]}
            )
            positions[p['code']] = pos

        # Link employees to positions
        emp_positions = {
            'EMP001': 'POS-CEO', 'EMP002': 'POS-CFO', 'EMP003': 'POS-CTO',
            'EMP004': 'POS-SRDEV', 'EMP005': 'POS-DEV-MGR',
            'EMP006': 'POS-ACCT-MGR', 'EMP007': 'POS-SALES-MGR', 'EMP009': 'POS-ADMIN-MGR',
        }
        for emp_id, pos_code in emp_positions.items():
            emp = Employee.objects.filter(company=company, employee_id=emp_id).first()
            pos = positions.get(pos_code)
            if emp and pos:
                emp.job_title = JobTitle.objects.filter(company=company, code=pos_code.replace('POS-', '')).first() or emp.job_title
                emp.save()
        self.stdout.write(f'✓ Positions: {len(positions)} with employee assignments')

        self.stdout.write(self.style.SUCCESS(f'\n✅ Setup complete!'))
        self.stdout.write(f'   Login: http://localhost:3000')
        self.stdout.write(f'   Username: {username}')
        self.stdout.write(f'   Password: {password}')
        self.stdout.write(f'   Admin: http://127.0.0.1:8000/admin/')