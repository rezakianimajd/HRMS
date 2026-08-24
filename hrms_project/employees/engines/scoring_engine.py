"""
Employee scoring engine — weighted multi-criteria evaluation.

Computes a 0-100 total score per employee from the parameters:
  performance, satisfaction, education, distance, leaves, absences,
  work_days, overtime, penalties, salary raises, tenure, mission, etc.
"""
from datetime import date, timedelta
from decimal import Decimal


class ScoringEngine:
    """Weighted scoring for employees."""

    # Weights (sum ~= 100)
    WEIGHTS = {
        'performance': 20,
        'satisfaction': 10,
        'education': 7,
        'attendance': 15,       # work_days + overtime - leaves - absences
        'discipline': 10,       # penalties (inverse)
        'distance': 4,
        'experience': 8,        # tenure / seniority
        'salary_growth': 6,
        'benefits': 5,
        'mission': 5,
        'contract': 5,
        'shift': 5,
    }

    # Education level scores (0-7)
    EDU_SCORES = {
        'phd': 7,
        'master': 6,
        'bachelor': 5,
        'associate': 3.5,
        'diploma': 2,
        'under_diploma': 1,
    }

    def score_employee(self, emp, company=None):
        """
        Return dict with:
          total (0-100), breakdown (per-criterion), reasons (text list)
        """
        from employees.models import EmployeePenalty
        from payroll.models import SalaryRecord, BenefitRecord

        breakdown = {}
        reasons = []

        # 0) performance (0-20)
        perf = float(emp.performance_score or 0)
        breakdown['performance'] = min(20, perf * 0.2)   # 100% -> 20
        if perf >= 80:
            reasons.append(f'عملکرد عالی ({perf:.0f}٪)')
        elif perf < 50 and emp.performance_score is not None:
            reasons.append(f'عملکرد پایین ({perf:.0f}٪)')

        # 1) satisfaction (0-10)
        sat = float(emp.satisfaction_score or 0)
        breakdown['satisfaction'] = min(10, sat * 0.1)
        if sat < 50 and emp.satisfaction_score is not None:
            reasons.append(f'رضایت شغلی پایین ({sat:.0f}٪)')

        # 2) education (0-7)
        edu = self.EDU_SCORES.get(emp.education_level, 0)
        breakdown['education'] = edu
        if emp.education_level:
            reasons.append(f'تحصیلات {emp.get_education_level_display()}')

        # payroll data (current Jalali month) for attendance/salary/benefits
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
        benefits = sum(float(b.paid_amount or 0) for b in br)

        # 3) attendance (0-15): work_days + overtime, minus leaves/absences
        att_score = 0
        if rec:
            work_days = float(rec.work_days or 0)
            overtime = float(rec.overtime_hours or 0)
            # work_days ideal 30 → 10, overtime ideal 30h → 5
            att_score += min(10, work_days / 3)          # 30 روز => 10
            att_score += min(5, overtime / 6)            # 30 ساعت => 5
            if overtime > 20:
                reasons.append(f'اضافه‌کاری بالا ({overtime:.0f} ساعت)')
        # leaves / absences reduce attendance
        from payroll.models import EmployeeTransaction
        tx = EmployeeTransaction.objects.filter(employee=emp, date__year=date.today().year)
        if company:
            tx = tx.filter(company=company)
        leave_days = sum(float(t.quantity or 0) for t in tx if t.transaction_type in ('leave', 'absence'))
        att_score = max(0, att_score - min(5, leave_days * 0.2))
        breakdown['attendance'] = round(att_score, 1)

        # 4) discipline (0-10): penalties inverse
        pen = EmployeePenalty.objects.filter(employee=emp)
        if company:
            pen = pen.filter(company=company)
        penalty_count = pen.count()
        discipline = max(0, 10 - penalty_count * 2.5)
        breakdown['discipline'] = round(min(10, discipline), 1)
        if penalty_count:
            reasons.append(f'{penalty_count} مورد جریمه ثبت شده')

        # 5) distance (0-4): nearer is better.
        #    طبق سیستم‌های بزرگ منابع انسانی، مسافت زیاد با داشتن خودروی شخصی
        #    قابل جبران است و تأثیر منفی کمتری دارد.
        dist = int(emp.distance_to_work_km or 0)
        if dist == 0:
            dist_score = 4
        elif dist <= 10:
            dist_score = 3.2
        elif dist <= 25:
            dist_score = 2.6
        elif dist <= 50:
            dist_score = 1.6
        else:
            dist_score = 0.6

        # اگر خودروی شخصی دارد، مسافت کمتر مشکل‌ساز است → امتیاز بالاتر
        if emp.has_car and dist > 25:
            # یک طبقه بهبود: به‌جای بدترین حالت، سطح بالاتر را بگیر
            dist_score = max(dist_score, 2.0)
            reasons.append('بدون مشکل مسافت (دارای خودروی شخصی)')
        elif dist > 50:
            reasons.append(f'مسافت زیاد ({dist} کیلومتر)')

        # نوع مسکن: شخصی (owned) پایداری بیشتری نشان می‌دهد
        if emp.housing_type == 'owned':
            dist_score = min(4.0, dist_score + 0.4)
            reasons.append('مسکن شخصی (ثبات مالی)')

        breakdown['distance'] = round(min(4.0, dist_score), 1)

        # 6) experience (0-8): tenure + prior work experience
        tenure_years = 0
        if emp.hire_date:
            tenure_years = date.today().year - emp.hire_date.year

        from employees.models import WorkExperience
        we = WorkExperience.objects.filter(employee=emp)
        if company:
            we = we.filter(company=company)
        # duration_years already caps prior experience at hire_date
        prior_years = sum(w.duration_years or 0 for w in we)
        total_years = tenure_years + prior_years
        breakdown['experience'] = round(min(8, total_years * 0.8), 1)
        if tenure_years >= 5:
            reasons.append(f'سابقه {tenure_years} سال در این سازمان')
        if prior_years > 0:
            reasons.append(f'{round(prior_years, 1)} سال سابقه کاری پیشین')

        # 7) salary growth (0-6): recent salary_increase changes
        from employees.models import EmploymentChange
        ch = EmploymentChange.objects.filter(employee=emp)
        if company:
            ch = ch.filter(company=company)
        salary_incs = ch.filter(change_type='salary_increase').count()
        salary_decs = ch.filter(change_type='salary_decrease').count()
        growth = min(6, salary_incs * 3) - min(3, salary_decs * 1.5)
        breakdown['salary_growth'] = round(max(0, growth), 1)
        if salary_incs:
            reasons.append(f'{salary_incs} افزایش حقوق')

        # 8) benefits (0-5): higher received welfare benefits -> satisfaction proxy
        breakdown['benefits'] = min(5, benefits / 5_000_000) if benefits else 0

        # 9) mission (0-5): mission days/allowance in salary record
        mission = 0
        if rec and rec.mission_days:
            mission = min(5, float(rec.mission_days) * 0.5)
        breakdown['mission'] = round(mission, 1)
        if rec and rec.mission_days:
            reasons.append(f'{rec.mission_days} روز مأموریت')

        # 10) contract (0-5): permanent + not expiring soon = full
        contract_score = 0
        if emp.contract_type:
            name = emp.contract_type.name or ''
            if 'دائم' in name or 'permanent' in name.lower():
                contract_score = 5
            else:
                contract_score = 3
        if emp.contract_end_date:
            days = (emp.contract_end_date - date.today()).days
            if days < 30:
                contract_score = min(contract_score, 1)
        breakdown['contract'] = contract_score

        # 11) shift (0-5): regular morning shift = full; rotating/irregular lower
        shift = emp.work_shift or 'morning'
        shift_score = {'morning': 5, 'evening': 4, 'rotating': 3, 'irregular': 2}.get(shift, 3)
        breakdown['shift'] = shift_score

        total = round(sum(breakdown.values()), 1)
        total = max(0, min(100, total))

        return {
            'employee_id': emp.id,
            'full_name': emp.full_name,
            'employee_code': emp.employee_id,
            'department': emp.department.name if emp.department else '',
            'job_title': emp.job_title.name if emp.job_title else '',
            'total_score': total,
            'performance_score': perf,
            'satisfaction_score': sat,
            'breakdown': {k: round(v, 1) for k, v in breakdown.items()},
            'reasons': reasons,
            'grade': self._grade(total),
        }

    @staticmethod
    def _grade(score):
        if score >= 85:
            return {'label': 'عالی', 'color': '#10b981'}
        if score >= 70:
            return {'label': 'خوب', 'color': '#3b82f6'}
        if score >= 50:
            return {'label': 'متوسط', 'color': '#f59e0b'}
        return {'label': 'نیازمند بهبود', 'color': '#ef4444'}

    def score_all(self, employees, company=None):
        """Score a list of employees and return sorted by total desc."""
        scored = []
        for emp in employees:
            s = self.score_employee(emp, company)
            scored.append(s)
        scored.sort(key=lambda x: -x['total_score'])
        return scored