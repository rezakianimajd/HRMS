"""
Import Engine - Excel bulk import for HR data (2026).
Supports importing employees, departments, job titles, locations, insurance, and document types.
"""
import io
from datetime import datetime
from django.db import transaction


# Persian labels for Excel headers (used for template generation and reverse mapping)
PERSIAN_FIELD_LABELS = {
    'name': 'نام',
    'code': 'کد',
    'level': 'سطح',
    'description': 'توضیحات',
    'first_name': 'نام',
    'last_name': 'نام خانوادگی',
    'national_id': 'کد ملی',
    'birth_date': 'تاریخ تولد',
    'gender': 'جنسیت',
    'marital_status': 'وضعیت تأهل',
    'mobile': 'موبایل',
    'employee_id': 'کد پرسنلی',
    'employee_code': 'کد پرسنلی',
    'hire_date': 'تاریخ استخدام',
    'department_code': 'کد دپارتمان',
    'job_title_code': 'کد عنوان شغلی',
    'work_location_code': 'کد محل استقرار',
    'contract_type': 'نوع قرارداد',
    'year': 'سال',
    'month': 'ماه',
    'work_days': 'کارکرد (روز)',
    'overtime_hours': 'ساعت اضافه‌کار',
    'base_salary': 'حقوق پایه',
    'overtime_pay': 'اضافه‌کاری',
    'night_shift': 'شب‌کاری',
    'shift_work': 'نوبت‌کاری',
    'attraction_allowance': 'حق جذب',
    'supervision_allowance': 'حق سرپرستی',
    'workshop_mission': 'ماموریت کارگاهی',
    'seniority_base': 'پایه سنوات',
    'job_allowance': 'فوق‌العاده شغل',
    'hardship_allowance': 'سختی کار',
    'travel_cost': 'هزینه سفر',
    'housing_allowance': 'حق مسکن',
    'marriage_allowance': 'حق تأهل',
    'children_allowance': 'حق اولاد',
    'meal_voucher': 'بن کارکنان',
    'deferred_salary_1': 'حقوق معوقه ۱',
    'deferred_salary_2': 'حقوق معوقه ۲',
    'bonus_reserve': 'عیدی و ذخیره',
    'other_benefits': 'سایر مزایا',
    'mission_days': 'روز مأموریت',
    'mission_allowance': 'حق مأموریت',
    'insurance_subject': 'مشمول بیمه',
    'employer_insurance': 'حق بیمه سهم کارفرما',
    'employee_insurance': 'حق بیمه سهم پرسنل',
    'tax': 'مالیات',
    'advance': 'مساعده',
    'supplementary_insurance': 'بیمه تکمیلی',
    'employee_loan': 'وام کارکنان',
    'work_deduction': 'کسر کار',
    'total_benefits': 'جمع حقوق و مزایا',
    'total_deductions': 'جمع کسور',
    'net_payable': 'قابل پرداخت',
    'benefit_type': 'نوع مزایا',
    'gross_amount': 'مبلغ ناخالص',
    'reserved_tax': 'مالیات ذخیره شده',
    'paid_amount': 'مبلغ پرداخت شده',
}


class ImportEngine:
    """
    Handles Excel import with validation, preview, and error reporting.
    """

    # Import type definitions: headers, required fields, sample row, description
    IMPORT_TYPES = {
        'employees': {
            'label': 'پرسنل',
            'description': 'اطلاعات کامل کارکنان (اطلاعات فردی، تماس، و شغلی)',
            'headers': [
                'first_name', 'last_name', 'national_id', 'birth_date',
                'gender', 'marital_status', 'mobile', 'employee_id',
                'hire_date', 'department_code', 'job_title_code',
                'work_location_code', 'contract_type',
            ],
            'required': ['first_name', 'last_name', 'national_id', 'birth_date', 'gender', 'marital_status', 'mobile', 'employee_id', 'hire_date'],
            'sample': [
                'علی', 'محمدی', '0012345678', '1985-03-15',
                'male', 'married', '09120000001', 'EMP100',
                '2010-01-01', 'MGT', 'CEO', 'HQ', 'permanent',
            ],
        },
        'departments': {
            'label': 'دپارتمان‌ها',
            'description': 'ساختار واحدهای سازمانی',
            'headers': ['name', 'code'],
            'required': ['name', 'code'],
            'sample': ['فنی و مهندسی', 'ENG'],
        },
        'job_titles': {
            'label': 'عناوین شغلی',
            'description': 'سمت‌های سازمانی با سطح',
            'headers': ['name', 'code', 'level'],
            'required': ['name', 'code'],
            'sample': ['برنامه‌نویس', 'DEV', 'expert'],
        },
        'work_locations': {
            'label': 'محل‌های استقرار',
            'description': 'شعب و محل‌های کاری',
            'headers': ['name', 'code', 'description'],
            'required': ['name', 'code'],
            'sample': ['دفتر مرکزی', 'HQ', 'تهران'],
        },
        'insurance_lists': {
            'label': 'لیست‌های بیمه',
            'description': 'کدهای کارگاهی تأمین اجتماعی',
            'headers': ['name', 'code', 'description'],
            'required': ['name', 'code'],
            'sample': ['بیمه اصلی', 'INS_MAIN', 'کد کارگاهی ۱۲۳۴۵۶'],
        },
        'document_types': {
            'label': 'انواع مدارک',
            'description': 'دسته‌بندی مدارک پرسنلی',
            'headers': ['name', 'code'],
            'required': ['name', 'code'],
            'sample': ['کارت ملی', 'NATIONAL_ID'],
        },
        'salary_records': {
            'label': 'فیش حقوقی',
            'description': 'فیش حقوقی ماهانه پرسنل (سال/ماه به تفکیک)',
            'headers': [
                'employee_code', 'year', 'month', 'work_days', 'overtime_hours',
                'base_salary', 'overtime_pay', 'night_shift', 'shift_work',
                'attraction_allowance', 'supervision_allowance', 'workshop_mission',
                'seniority_base', 'job_allowance', 'hardship_allowance', 'travel_cost',
                'housing_allowance', 'marriage_allowance', 'children_allowance',
                'meal_voucher', 'deferred_salary_1', 'deferred_salary_2',
                'bonus_reserve', 'other_benefits', 'mission_days', 'mission_allowance',
                'insurance_subject', 'employer_insurance', 'employee_insurance',
                'tax', 'advance', 'supplementary_insurance', 'employee_loan', 'work_deduction',
                'total_benefits', 'total_deductions', 'net_payable',
            ],
            'required': ['employee_code', 'year', 'month'],
            'sample': [
                'EMP100', '1404', '6', '30', '10',
                '50000000', '0', '0', '0',
                '0', '0', '0', '0', '0', '0', '0',
                '0', '0', '0',
                '0', '0', '0',
                '0', '0', '0', '0',
                '50000000', '0', '3500000',
                '0', '0', '0', '0', '0',
                '50000000', '3500000', '46500000',
            ],
        },
        'salary_bulk': {
            'label': 'فیش حقوقی گروهی',
            'description': 'درون‌ریزی گروهی فیش حقوقی برای یک سال/ماه مشخص (سال/ماه از فرم انتخاب می‌شود)',
            'headers': [
                'employee_code', 'work_days', 'overtime_hours',
                'base_salary', 'overtime_pay', 'night_shift', 'shift_work',
                'attraction_allowance', 'supervision_allowance', 'workshop_mission',
                'seniority_base', 'job_allowance', 'hardship_allowance', 'travel_cost',
                'housing_allowance', 'marriage_allowance', 'children_allowance',
                'meal_voucher', 'deferred_salary_1', 'deferred_salary_2',
                'bonus_reserve', 'other_benefits', 'mission_days', 'mission_allowance',
                'insurance_subject', 'employer_insurance', 'employee_insurance',
                'tax', 'advance', 'supplementary_insurance', 'employee_loan', 'work_deduction',
                'total_benefits', 'total_deductions', 'net_payable',
            ],
            'required': ['employee_code'],
            'sample': [
                'EMP100', '30', '10',
                '50000000', '0', '0', '0',
                '0', '0', '0', '0', '0', '0', '0',
                '0', '0', '0',
                '0', '0', '0',
                '0', '0', '0', '0',
                '50000000', '0', '3500000',
                '0', '0', '0', '0', '0',
                '50000000', '3500000', '46500000',
            ],
        },
        'benefit_bulk': {
            'label': 'مزایا گروهی',
            'description': 'درون‌ریزی گروهی مزایا برای یک سال/ماه مشخص (نوع مزایا از فایل خوانده می‌شود)',
            'headers': [
                'employee_code', 'benefit_type', 'gross_amount', 'reserved_tax', 'paid_amount',
            ],
            'required': ['employee_code', 'benefit_type'],
            'sample': [
                'EMP100', 'performance', '3000000', '300000', '2700000',
            ],
        },
    }

    @staticmethod
    def get_persian_headers(import_type):
        """Return Persian headers for an import type."""
        cfg = ImportEngine.IMPORT_TYPES.get(import_type)
        if not cfg:
            return []
        return [PERSIAN_FIELD_LABELS.get(h, h) for h in cfg['headers']]

    @staticmethod
    def get_types():
        """Return import type metadata (without sample rows)."""
        return [
            {
                'key': key,
                'label': cfg['label'],
                'description': cfg['description'],
                'headers': cfg['headers'],
                'persian_headers': ImportEngine.get_persian_headers(key),
                'required': cfg['required'],
            }
            for key, cfg in ImportEngine.IMPORT_TYPES.items()
        ]

    @staticmethod
    def parse_excel(file, import_type=None):
        """Parse an uploaded Excel file into a list of row dicts.
        Persian headers are mapped back to English field keys.
        """
        import openpyxl
        wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return []
        headers = [str(h).strip() if h else '' for h in rows[0]]

        # Build Persian -> English mapping for the given type
        label_map = {}
        if import_type and import_type in ImportEngine.IMPORT_TYPES:
            cfg = ImportEngine.IMPORT_TYPES[import_type]
            persian = [PERSIAN_FIELD_LABELS.get(h, h) for h in cfg['headers']]
            label_map = dict(zip(persian, cfg['headers']))

        # Translate Persian headers to English keys
        translated_headers = [label_map.get(h, h) for h in headers]

        data = []
        for row in rows[1:]:
            if not any(row):
                continue
            entry = {}
            for i, header in enumerate(translated_headers):
                if header and i < len(row):
                    val = row[i]
                    if isinstance(val, datetime):
                        val = val.strftime('%Y-%m-%d')
                    entry[header] = val if val is not None else ''
            data.append(entry)
        return data

    @staticmethod
    def validate_rows(rows, import_type):
        """Validate rows and return (valid_rows, errors)."""
        cfg = ImportEngine.IMPORT_TYPES[import_type]
        required = cfg['required']
        headers = cfg['headers']
        valid = []
        errors = []
        for idx, row in enumerate(rows, start=2):  # start at 2 (Excel 1-indexed + header)
            row_errors = []
            for key in required:
                if key not in row or row.get(key) in (None, ''):
                    row_errors.append(f"ستون '{key}' الزامی است")
            # Only keep known headers
            clean = {k: v for k, v in row.items() if k in headers}
            if row_errors:
                errors.append({'row': idx, 'errors': row_errors})
            else:
                valid.append(clean)
        return valid, errors

    @staticmethod
    def import_employees(rows, company):
        """Import employee rows."""
        from employees.models import Employee, Department, JobTitle, WorkLocation, InsuranceList, ContractType

        gender_map = {'مرد': 'male', 'زن': 'female', 'male': 'male', 'female': 'female'}
        marital_map = {'مجرد': 'single', 'متأهل': 'married', 'مطلقه': 'divorced', 'همسر فوت‌شده': 'widowed',
                       'single': 'single', 'married': 'married', 'divorced': 'divorced', 'widowed': 'widowed'}

        created = 0
        skipped = []
        for row in rows:
            employee_id = str(row.get('employee_id', '')).strip()
            national_id = str(row.get('national_id', '')).strip()
            mobile = str(row.get('mobile', '')).strip()

            if Employee.objects.filter(company=company, employee_id=employee_id).exists():
                skipped.append(f'{employee_id}: کد پرسنلی تکراری')
                continue
            if national_id and Employee.objects.filter(company=company, national_id=national_id).exists():
                skipped.append(f'{employee_id}: کد ملی تکراری')
                continue

            department = Department.objects.filter(company=company, code=row.get('department_code')).first()
            job_title = JobTitle.objects.filter(company=company, code=row.get('job_title_code')).first()
            work_location = WorkLocation.objects.filter(company=company, code=row.get('work_location_code')).first()
            insurance = InsuranceList.objects.filter(company=company, code=row.get('insurance_code', 'INS_MAIN')).first() or InsuranceList.objects.filter(company=company).first()
            contract_type = ContractType.objects.filter(company=company, code=row.get('contract_type_code', 'PERMANENT')).first() or ContractType.objects.filter(company=company, code='PERMANENT').first()

            if not department:
                department, _ = Department.objects.get_or_create(company=company, code=row.get('department_code') or 'GEN', defaults={'name': row.get('department_code') or 'عمومی'})
            if not job_title:
                job_title, _ = JobTitle.objects.get_or_create(company=company, code=row.get('job_title_code') or 'GEN', defaults={'name': row.get('job_title_code') or 'عمومی', 'level': 'operational'})
            if not work_location:
                work_location = WorkLocation.objects.filter(company=company).first()
            if not insurance:
                insurance, _ = InsuranceList.objects.get_or_create(company=company, code='INS_MAIN', defaults={'name': 'بیمه اصلی'})

            try:
                Employee.objects.create(
                    company=company,
                    first_name=row.get('first_name', ''),
                    last_name=row.get('last_name', ''),
                    national_id=national_id or '',
                    birth_date=row.get('birth_date') or None,
                    gender=gender_map.get(row.get('gender', ''), 'male'),
                    marital_status=marital_map.get(row.get('marital_status', ''), 'single'),
                    mobile=mobile or '',
                    employee_id=employee_id,
                    hire_date=row.get('hire_date') or None,
                    department=department,
                    job_title=job_title,
                    work_location=work_location,
                    insurance_list=insurance,
                    contract_type=contract_type,
                )
                created += 1
            except Exception as e:
                skipped.append(f'{employee_id}: {str(e)[:80]}')

        return created, skipped

    @staticmethod
    def import_simple(rows, company, import_type):
        """Import simple list entries (departments, titles, etc.)."""
        from employees.models import Department, JobTitle, WorkLocation, InsuranceList
        from documents.models import DocumentType

        model_map = {
            'departments': Department,
            'job_titles': JobTitle,
            'work_locations': WorkLocation,
            'insurance_lists': InsuranceList,
            'document_types': DocumentType,
        }
        model = model_map[import_type]
        created = 0
        skipped = []
        for row in rows:
            code = str(row.get('code', '')).strip()
            if not code:
                skipped.append('کد خالی')
                continue
            if model.objects.filter(company=company, code=code).exists():
                skipped.append(f'{code}: تکراری')
                continue
            kwargs = {'company': company, 'name': row.get('name', ''), 'code': code}
            if 'level' in row and row.get('level'):
                kwargs['level'] = row.get('level')
            if 'description' in row and row.get('description'):
                kwargs['description'] = row.get('description')
            if 'level' in kwargs and kwargs['level'] not in ('executive', 'expert', 'operational'):
                kwargs['level'] = 'operational'
            model.objects.create(**kwargs)
            created += 1
        return created, skipped

    @staticmethod
    def import_salaries(rows, company, year=None, month=None):
        """Import monthly salary records by employee_code.
        If year/month is provided, it overrides the row values (bulk import for a specific month).
        """
        from employees.models import Employee
        from payroll.models import SalaryRecord

        numeric_fields = [
            'work_days', 'overtime_hours', 'base_salary', 'overtime_pay',
            'night_shift', 'shift_work', 'attraction_allowance', 'supervision_allowance',
            'workshop_mission', 'seniority_base', 'job_allowance', 'hardship_allowance',
            'travel_cost', 'housing_allowance', 'marriage_allowance', 'children_allowance',
            'meal_voucher', 'deferred_salary_1', 'deferred_salary_2', 'bonus_reserve',
            'other_benefits', 'mission_days', 'mission_allowance', 'insurance_subject',
            'employer_insurance', 'employee_insurance', 'tax', 'advance',
            'supplementary_insurance', 'employee_loan', 'work_deduction',
        ]
        created = 0
        skipped = []
        for row in rows:
            employee_code = str(row.get('employee_code', '')).strip()
            row_year = year if year is not None else int(row.get('year') or 0)
            row_month = month if month is not None else str(row.get('month', '')).strip()

            employee = Employee.objects.filter(company=company, employee_id=employee_code).first()
            if not employee:
                skipped.append(f'{employee_code}: پرسنل یافت نشد')
                continue

            if SalaryRecord.objects.filter(company=company, employee=employee, year=row_year, month=row_month).exists():
                skipped.append(f'{employee_code}: فیش {row_year}/{row_month} تکراری')
                continue

            kwargs = {'company': company, 'employee': employee, 'year': row_year, 'month': row_month}
            for f in numeric_fields:
                val = row.get(f)
                try:
                    kwargs[f] = float(val) if val not in (None, '') else 0
                except (ValueError, TypeError):
                    kwargs[f] = 0

            # Import totals directly if provided (instead of recalculating)
            for f in ['total_benefits', 'total_deductions', 'net_payable']:
                val = row.get(f)
                try:
                    kwargs[f] = float(val) if val not in (None, '') else 0
                except (ValueError, TypeError):
                    kwargs[f] = 0

            rec = SalaryRecord(**kwargs)
            # Only calculate locally if totals are not provided
            if not any(row.get(f) for f in ['total_benefits', 'total_deductions', 'net_payable']):
                rec.calculate_totals()
            rec.save()
            created += 1
        return created, skipped

    @staticmethod
    def import_benefits(rows, company, year=None, month=None):
        """Import welfare benefit records by employee_code."""
        from employees.models import Employee
        from payroll.models import BenefitRecord

        created = 0
        skipped = []
        for row in rows:
            employee_code = str(row.get('employee_code', '')).strip()
            benefit_type = str(row.get('benefit_type', '')).strip()
            row_year = year if year is not None else int(row.get('year') or 0)
            row_month = month if month is not None else str(row.get('month', '')).strip()

            employee = Employee.objects.filter(company=company, employee_id=employee_code).first()
            if not employee:
                skipped.append(f'{employee_code}: پرسنل یافت نشد')
                continue
            if not benefit_type:
                skipped.append(f'{employee_code}: نوع مزایا خالی')
                continue

            if BenefitRecord.objects.filter(company=company, employee=employee, year=row_year, month=row_month, benefit_type=benefit_type).exists():
                skipped.append(f'{employee_code}: مزایای {benefit_type} برای {row_year}/{row_month} تکراری')
                continue

            def _num(val):
                try:
                    return float(val) if val not in (None, '') else 0
                except (ValueError, TypeError):
                    return 0

            gross = _num(row.get('gross_amount'))
            tax = _num(row.get('reserved_tax'))
            paid = _num(row.get('paid_amount')) or (gross - tax)

            BenefitRecord.objects.create(
                company=company,
                employee=employee,
                year=row_year,
                month=row_month,
                benefit_type=benefit_type,
                gross_amount=gross,
                reserved_tax=tax,
                paid_amount=paid,
            )
            created += 1
        return created, skipped
