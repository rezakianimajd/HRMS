"""
Employee scoring engine — weighted multi-criteria evaluation (2026).

Every criterion is normalized to a 0..100 score so it is visually consistent,
then the FINAL total is the weighted sum scaled back to 0..100.

Criteria (weights sum = 100):
  performance (20), satisfaction (8), education (6), experience (8),
  attendance (10), punctuality (5), discipline (8), financial_behavior (6),
  insurance (4), benefits (5), mission (4), contract (5), shift (4),
  distance (3), salary_growth (4).
"""
from datetime import date


class ScoringEngine:
    """Weighted scoring for employees — every criterion 0..100, total 0..100."""

    WEIGHTS = {
        'performance': 20,
        'satisfaction': 8,
        'education': 6,
        'experience': 8,
        'attendance': 10,
        'punctuality': 5,
        'discipline': 8,
        'financial_behavior': 6,
        'insurance': 4,
        'benefits': 5,
        'mission': 4,
        'contract': 5,
        'shift': 4,
        'distance': 3,
        'salary_growth': 4,
    }

    EDU_SCORES = {
        'phd': 100,
        'master': 90,
        'bachelor': 80,
        'associate': 65,
        'diploma': 55,
        'under_diploma': 40,
    }

    SHIFT_SCORES = {
        'morning': 100,
        'evening': 85,
        'rotating': 70,
        'irregular': 55,
    }

    @staticmethod
    def _clamp(v, lo=0.0, hi=100.0):
        try:
            return round(max(lo, min(hi, float(v))), 1)
        except (TypeError, ValueError):
            return 0.0

    def score_employee(self, emp, company=None):
        from employees.models import EmployeePenalty, WorkExperience, EmploymentChange, SupplementaryInsurance
        from payroll.models import SalaryRecord, BenefitRecord, EmployeeTransaction, EmployeeLoan
        from attendance.models import AttendanceRecord

        breakdown = {}
        reasons = []

        # --- performance (0..100) ---
        perf = float(emp.performance_score or 0)
        breakdown['performance'] = self._clamp(perf)
        if perf >= 80:
            reasons.append(f'عملکرد عالی ({perf:.0f}٪)')
        elif perf < 50 and emp.performance_score is not None:
            reasons.append(f'عملکرد پایین ({perf:.0f}٪)')

        # --- satisfaction (0..100) ---
        sat = float(emp.satisfaction_score or 0)
        breakdown['satisfaction'] = self._clamp(sat)
        if sat < 50 and emp.satisfaction_score is not None:
            reasons.append(f'رضایت شغلی پایین ({sat:.0f}٪)')

        # --- education (0..100) ---
        edu = self.EDU_SCORES.get(emp.education_level, 0)
        breakdown['education'] = self._clamp(edu)
        if emp.education_level:
            reasons.append(f'تحصیلات {emp.get_education_level_display()}')

        # --- experience (tenure + prior) 0..100, ideal 10y ---
        tenure_years = 0
        if emp.hire_date:
            tenure_years = date.today().year - emp.hire_date.year
        we = WorkExperience.objects.filter(employee=emp)
        if company:
            we = we.filter(company=company)
        prior_years = sum(w.duration_years or 0 for w in we)
        total_years = tenure_years + prior_years
        breakdown['experience'] = self._clamp(total_years * 10)  # 10y => 100
        if tenure_years >= 5:
            reasons.append(f'سابقه {tenure_years} سال در این سازمان')
        if prior_years > 0:
            reasons.append(f'{round(prior_years, 1)} سال سابقه کاری پیشین')

        # --- attendance + payroll (+/-) based on current Jalali month ---
        from jdatetime import date as jdate
        today_j = jdate.today()
        year, month = int(today_j.year), str(today_j.month)

        sr = SalaryRecord.objects.filter(employee=emp, year=year, month=month)
        if company:
            sr = sr.filter(company=company)
        rec = sr.first()

        br = BenefitRecord.objects.filter(employee=emp, year=year, month=month)
        if company:
            br = br.filter(company=company)
        benefits_paid = sum(float(b.paid_amount or 0) for b in br)

        # attendance: present ratio / work_days, minus leaves+absences
        work_days = float(rec.work_days or 0) if rec else 0
        overtime_hours = float(rec.overtime_hours or 0) if rec else 0

        tx = EmployeeTransaction.objects.filter(employee=emp, date__year=date.today().year)
        if company:
            tx = tx.filter(company=company)
        leave_days = sum(float(t.quantity or 0) for t in tx if t.transaction_type in ('leave', 'absence'))

        att_score = self._clamp(work_days / 30 * 100)  # 30d => 100
        att_score = self._clamp(att_score - leave_days * 2.5)
        # slight overtime boost (up to +10)
        att_score = self._clamp(att_score + min(10, overtime_hours / 3))
        breakdown['attendance'] = att_score
        if overtime_hours > 20:
            reasons.append(f'اضافه‌کاری بالا ({overtime_hours:.0f} ساعت)')

        # --- punctuality: late arrivals in current month vs. work_start_time ---
        late_count = 0
        present_count = 0
        att_records = AttendanceRecord.objects.filter(employee=emp, date__year=date.today().year, date__month=date.today().month)
        if company:
            att_records = att_records.filter(company=company)
        start_time = (emp.work_start_time or '').strip()
        for a in att_records:
            if a.status == 'present':
                present_count += 1
            check_in = a.check_in
            if start_time and check_in:
                try:
                    from datetime import time as dtime
                    hh, mm = start_time.split(':')
                    expected = dtime(int(hh), int(mm))
                    if check_in > expected:
                        late_count += 1
                except (ValueError, TypeError):
                    pass

        if present_count == 0:
            punctuality = 70.0  # neutral, no records
        else:
            punctuality = self._clamp(100 - (late_count / present_count) * 100)
        breakdown['punctuality'] = punctuality
        if late_count:
            reasons.append(f'{late_count} مورد تأخیر در ورود')

        # --- discipline (penalties inverse) 0..100 ---
        pen = EmployeePenalty.objects.filter(employee=emp)
        if company:
            pen = pen.filter(company=company)
        penalty_count = pen.count()
        discipline = self._clamp(100 - penalty_count * 30)
        breakdown['discipline'] = discipline
        if penalty_count:
            reasons.append(f'{penalty_count} مورد جریمهٔ انضباطی ثبت شده')

        # --- financial behavior: loans + regular repayment 0..100 ---
        loans = EmployeeLoan.objects.filter(employee=emp, is_active=True)
        if company:
            loans = loans.filter(company=company)
        active_loans = [l for l in loans if l.status == 'active']
        paid_loans = loans.filter(status='paid').count()
        outstanding = sum(float(l.amount or 0) for l in active_loans)

        fin = 70.0
        fin += min(15, paid_loans * 15)          # settled loans => good history
        fin -= min(15, len(active_loans) * 5)    # many concurrent active loans
        if outstanding > 100_000_000:
            fin -= 10
        breakdown['financial_behavior'] = self._clamp(fin)
        if paid_loans:
            reasons.append(f'{paid_loans} وام تسویه‌شدهٔ به‌موقع')
        if len(active_loans) > 2:
            reasons.append(f'{len(active_loans)} وام فعال هم‌زمان')

        # --- supplementary insurance (0..100) ---
        ins = SupplementaryInsurance.objects.filter(employee=emp)
        if company:
            ins = ins.filter(company=company)
        ins_active = [i for i in ins if (i.end_date is None or i.end_date >= date.today())]
        if ins_active:
            ins_score = 90.0
            dependents = sum(i.dependents.count() for i in ins_active)
            ins_score = self._clamp(ins_score + min(10, dependents * 5))
            reasons.append('بیمهٔ تکمیلی فعال')
        else:
            ins_score = 40.0
        breakdown['insurance'] = ins_score

        # --- benefits received (welfare proxy) 0..100 ---
        breakdown['benefits'] = self._clamp(benefits_paid / 5_000_000 * 100)

        # --- mission (0..100, ideal 10 days) ---
        mission_days = float(rec.mission_days or 0) if rec else 0
        breakdown['mission'] = self._clamp(mission_days * 10)
        if mission_days:
            reasons.append(f'{mission_days:.0f} روز مأموریت')

        # --- contract (0..100) ---
        contract_score = 50.0
        if emp.contract_type:
            name = (emp.contract_type.name or '').lower()
            if 'دائم' in name or 'permanent' in name:
                contract_score = 100.0
            else:
                contract_score = 70.0
        if emp.contract_end_date:
            days = (emp.contract_end_date - date.today()).days
            if days < 30:
                contract_score = 30.0
        breakdown['contract'] = self._clamp(contract_score)

        # --- shift (0..100) ---
        shift = (emp.work_shift or '').lower()
        breakdown['shift'] = self._clamp(self.SHIFT_SCORES.get(shift, 70))

        # --- distance (0..100) ---
        dist = int(emp.distance_to_work_km or 0)
        if dist <= 5:
            dist_score = 100.0
        elif dist <= 10:
            dist_score = 85.0
        elif dist <= 25:
            dist_score = 70.0
        elif dist <= 50:
            dist_score = 50.0
        else:
            dist_score = 30.0
        if emp.has_car:
            dist_score = min(100.0, dist_score + 15)
        if emp.housing_type == 'owned':
            dist_score = min(100.0, dist_score + 5)
        breakdown['distance'] = self._clamp(dist_score)
        if dist > 50:
            reasons.append(f'مسافت زیاد ({dist} کیلومتر)')

        # --- salary growth (0..100) ---
        ch = EmploymentChange.objects.filter(employee=emp)
        if company:
            ch = ch.filter(company=company)
        salary_incs = ch.filter(change_type='salary_increase').count()
        salary_decs = ch.filter(change_type='salary_decrease').count()
        growth = self._clamp(50 + salary_incs * 25 - salary_decs * 30)
        breakdown['salary_growth'] = growth
        if salary_incs:
            reasons.append(f'{salary_incs} افزایش حقوق')

        # --- weighted total (0..100) ---
        total = 0.0
        for key, score in breakdown.items():
            weight = self.WEIGHTS.get(key, 0)
            total += score * weight
        total = self._clamp(total / 100)

        return {
            'employee_id': emp.id,
            'full_name': emp.full_name,
            'employee_code': emp.employee_id,
            'department': emp.department.name if emp.department else '',
            'job_title': emp.job_title.name if emp.job_title else '',
            'total_score': total,
            'performance_score': perf,
            'satisfaction_score': sat,
            'breakdown': {k: self._clamp(v) for k, v in breakdown.items()},
            'weights': self.WEIGHTS,
            'reasons': reasons,
            'grade': self._grade(total),
        }

    @staticmethod
    def _grade(score):
        if score >= 90:
            return {'label': 'عالی', 'color': '#10b981'}
        if score >= 75:
            return {'label': 'خوب', 'color': '#3b82f6'}
        if score >= 60:
            return {'label': 'متوسط', 'color': '#f59e0b'}
        return {'label': 'نیازمند بهبود', 'color': '#ef4444'}

    def score_all(self, employees, company=None):
        scored = []
        for emp in employees:
            scored.append(self.score_employee(emp, company=company))
        scored.sort(key=lambda x: -x['total_score'])
        return scored