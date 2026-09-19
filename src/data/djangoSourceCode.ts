export interface CodeFile {
  filename: string;
  language: 'python' | 'sql' | 'markdown' | 'bash';
  title: string;
  category: 'models' | 'forms' | 'serializers' | 'views' | 'permissions' | 'admin' | 'mysql' | 'settings' | 'guide';
  description: string;
  code: string;
}

export const djangoSourceFiles: CodeFile[] = [
  {
    filename: 'pmo/models.py',
    language: 'python',
    title: 'مدل‌های پایگاه داده (Django ORM Models)',
    category: 'models',
    description: 'تعریف ساختار جداول Project، ProjectAssignment، WeeklyProgressReport، و سیستم RBAC با اعتبارسنجی ۰ تا ۱۰۰ درصد و محاسبات خودکار شاخص‌های ارزش کسب‌شده (EVM)',
    code: `"""
سامانه مدیریت و کنترل پروژه یکپارچه (PMO System)
فایل مدلهای پایگاه داده - pmo/models.py
فریمورک: Django 4.2+ / Django 5.0+
پایگاه داده: MySQL 8.0+

طراحی شده بر اساس متدولوژی مدیریت ارزش کسب‌شده (Earned Value Management - EVM)
شامل کنترل دسترسی نقش‌محور (RBAC)، روابط One-to-Many و Many-to-Many
"""

from decimal import Decimal
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


# ----------------------------------------------------------------------
# ۱. سیستم احراز هویت و سطوح دسترسی (RBAC User Model)
# ----------------------------------------------------------------------
class User(AbstractUser):
    """
    مدل سفارشی کاربر با ۳ نقش استاندارد PMO:
    - Admin: مدیر ارشد سامانه (دسترسی نامحدود به تمام پروژه‌ها و گزارش‌ها)
    - Project_Controller: کارشناس کنترل پروژه (فقط دسترسی ثبت و ویرایش دیتای پروژه‌های تخصیص‌یافته به خود)
    - Executive_Viewer: مدیران ارشد / هیئت مدیره (دسترسی فقط‌خواندنی به داشبوردها و گزارش‌های کلان)
    """
    class RoleChoices(models.TextChoices):
        ADMIN = 'Admin', _('مدیر سیستم (Admin)')
        PROJECT_CONTROLLER = 'Project_Controller', _('کارشناس کنترل پروژه (Project Controller)')
        EXECUTIVE_VIEWER = 'Executive_Viewer', _('مدیر ارشد (Executive Viewer)')

    role = models.CharField(
        max_length=30,
        choices=RoleChoices.choices,
        default=RoleChoices.PROJECT_CONTROLLER,
        verbose_name=_('نقش سیستمی (RBAC)'),
        help_text=_('تعیین‌کننده سطح دسترسی به ماژول‌های سامانه')
    )
    department = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        verbose_name=_('دپارتمان / واحد سازمانی')
    )
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_('شماره همراه')
    )

    class Meta:
        db_table = 'pmo_users'
        verbose_name = _('کاربر')
        verbose_name_plural = _('کاربران')
        indexes = [
            models.Index(fields=['role'], name='idx_user_role'),
        ]

    def is_admin_user(self):
        return self.role == self.RoleChoices.ADMIN or self.is_superuser

    def is_controller_user(self):
        return self.role == self.RoleChoices.PROJECT_CONTROLLER

    def is_executive_user(self):
        return self.role == self.RoleChoices.EXECUTIVE_VIEWER

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"


# ----------------------------------------------------------------------
# ۲. جدول اصلی پروژه‌ها (Project Model)
# ----------------------------------------------------------------------
class Project(models.Model):
    """
    موجودیت اصلی پروژه شامل اطلاعات هویتی، محدوده، زمان‌بندی مبنا و بودجه کل (BAC)
    """
    class StatusChoices(models.TextChoices):
        PLANNING = 'planning', _('در حال برنامه‌ریزی')
        ACTIVE = 'active', _('فعال و در دست اجرا')
        ON_HOLD = 'on_hold', _('متوقف شده')
        COMPLETED = 'completed', _('خاتمه‌یافته')
        CANCELLED = 'cancelled', _('لغو شده')

    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name=_('کد پروژه'),
        help_text=_('شناسه یکتای پروژه مانند PRJ-2026-01')
    )
    name = models.CharField(
        max_length=255,
        verbose_name=_('نام کامل پروژه')
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('شرح و اهداف پروژه')
    )
    manager_name = models.CharField(
        max_length=150,
        verbose_name=_('مدیر پروژه')
    )
    
    # تاریخ‌های خط مبنا (Baseline Dates)
    baseline_start_date = models.DateField(
        verbose_name=_('تاریخ شروع برنامه‌ای (Baseline Start)')
    )
    baseline_finish_date = models.DateField(
        verbose_name=_('تاریخ پایان برنامه‌ای (Baseline Finish)')
    )
    
    # تاریخ‌های واقعی (Actual Dates)
    actual_start_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_('تاریخ شروع واقعی')
    )
    actual_finish_date = models.DateField(
        blank=True,
        null=True,
        verbose_name=_('تاریخ پایان واقعی')
    )

    # بودجه کل در زمان تکمیل (Budget At Completion - BAC)
    budget_bac = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name=_('بودجه کل در اتمام - BAC (میلیون تومان)'),
        help_text=_('مجموع بودجه مصوب خط مبنا برای کل طول عمر پروژه')
    )

    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.ACTIVE,
        verbose_name=_('وضعیت کلی پروژه')
    )
    category = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_('دسته‌بندی / صنعت')
    )

    # ارتباط چند به چند با کاربران از طریق جدول واسط
    assigned_users = models.ManyToManyField(
        User,
        through='ProjectAssignment',
        related_name='assigned_projects',
        verbose_name=_('کاربران منتسب به پروژه')
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('تاریخ ایجاد رکورد'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('آخرین به‌روزرسانی'))

    class Meta:
        db_table = 'pmo_projects'
        verbose_name = _('پروژه')
        verbose_name_plural = _('پروژه‌ها')
        ordering = ['-created_at']

    def clean(self):
        """اعتبارسنجی منطق تقدم و تاخر تاریخ‌های مبنا"""
        if self.baseline_finish_date and self.baseline_start_date:
            if self.baseline_finish_date < self.baseline_start_date:
                raise ValidationError({
                    'baseline_finish_date': _('تاریخ پایان برنامه‌ای نمی‌تواند قبل از تاریخ شروع باشد.')
                })

    @property
    def latest_report(self):
        """آخرین گزارش پیشرفت هفتگی ثبت‌شده برای این پروژه"""
        return self.weekly_reports.order_by('-report_date', '-week_number').first()

    def __str__(self):
        return f"[{self.code}] {self.name}"


# ----------------------------------------------------------------------
# ۳. جدول واسط تخصیص کاربران به پروژه‌ها (Project Assignment)
# ----------------------------------------------------------------------
class ProjectAssignment(models.Model):
    """
    جدول واسط برای اتصال کاربران (کارشناسان کنترل پروژه و ناظران) به پروژه‌های مشخص.
    این جدول هسته اصلی کنترل دسترسی داده‌محور (Row-Level Security) است.
    """
    class ProjectRoleChoices(models.TextChoices):
        CONTROLLER = 'controller', _('کارشناس کنترل پروژه مسئول (Lead Controller)')
        LEAD_PMO = 'lead_pmo', _('کارشناس ارشد دفتر PMO')
        OBSERVER = 'observer', _('ناظر / ذی‌نفع')

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='assignments',
        verbose_name=_('پروژه')
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='project_assignments',
        verbose_name=_('کاربر')
    )
    role_in_project = models.CharField(
        max_length=30,
        choices=ProjectRoleChoices.choices,
        default=ProjectRoleChoices.CONTROLLER,
        verbose_name=_('نقش در پروژه')
    )
    assigned_at = models.DateField(
        default=timezone.now,
        verbose_name=_('تاریخ تخصیص')
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('وضعیت تخصیص فعال')
    )

    class Meta:
        db_table = 'pmo_project_assignments'
        verbose_name = _('تخصیص پروژه به کاربر')
        verbose_name_plural = _('تخصیص‌های پروژه‌ها')
        unique_together = ('project', 'user')
        indexes = [
            models.Index(fields=['project', 'user'], name='idx_proj_user_assignment'),
        ]

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} ↔ {self.project.name}"


# ----------------------------------------------------------------------
# ۴. جدول گزارش پیشرفت هفتگی (Weekly Progress Report Model)
# ----------------------------------------------------------------------
class WeeklyProgressReport(models.Model):
    """
    کلیدی‌ترین جدول برای ثبت عملکرد، درصد پیشرفت، هزینه‌های واقعی و شاخص‌های EVM.
    دارای اعتبارسنجی دقیق ۰ تا ۱۰۰ درصد برای PV و EV.
    """
    class TrafficLightChoices(models.TextChoices):
        GREEN = 'green', _('سبز (عادی - منطبق بر برنامه)')
        YELLOW = 'yellow', _('زرد (هشدار - انحراف جزئی)')
        RED = 'red', _('قرمز (بحرانی - نیازمند مداخله فوری)')

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='weekly_reports',
        verbose_name=_('پروژه مربوطه')
    )
    report_date = models.DateField(
        verbose_name=_('تاریخ ثبت گزارش')
    )
    week_number = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(150)],
        verbose_name=_('شماره هفته کاری'),
        help_text=_('شماره هفته از ابتدای سال یا پروژه (مثال: هفته ۴۱)')
    )
    reporting_period_start = models.DateField(
        verbose_name=_('ابتدای دوره گزارش')
    )
    reporting_period_end = models.DateField(
        verbose_name=_('انتهای دوره گزارش')
    )

    # ------------------------------------------------------------------
    # فیلدهای درصد پیشرفت با اعتبارسنجی سخت‌گیرانه بین ۰ تا ۱۰۰ درصد
    # ------------------------------------------------------------------
    planned_value_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal('0.00'), message=_('درصد پیشرفت برنامه‌ای نمی‌تواند کمتر از ۰ باشد.')),
            MaxValueValidator(Decimal('100.00'), message=_('درصد پیشرفت برنامه‌ای نمی‌تواند بیشتر از ۱۰۰ باشد.'))
        ],
        verbose_name=_('درصد پیشرفت برنامه‌ای - Planned Value % (PV)'),
        help_text=_('درصد پیشرفت تجمعی برنامه‌ریزی‌شده طبق بیس‌لاین (۰ تا ۱۰۰)')
    )

    earned_value_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal('0.00'), message=_('درصد پیشرفت واقعی نمی‌تواند کمتر از ۰ باشد.')),
            MaxValueValidator(Decimal('100.00'), message=_('درصد پیشرفت واقعی نمی‌تواند بیشتر از ۱۰۰ باشد.'))
        ],
        verbose_name=_('درصد پیشرفت واقعی - Earned Value % (EV)'),
        help_text=_('درصد پیشرفت فیزیکی تجمعی محقق‌شده واقعی (۰ تا ۱۰۰)')
    )

    # هزینه واقعی ثبت‌شده (Actual Cost)
    actual_cost = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name=_('هزینه واقعی تجمعی - Actual Cost / AC (میلیون تومان)'),
        help_text=_('مجموع کل مبالغ مالی هزینه یا تعهد شده تا تاریخ این گزارش')
    )

    # تحلیل متنی و وضعیت
    key_issues_and_delays = models.TextField(
        verbose_name=_('شرح مهم‌ترین موانع یا تاخیرات'),
        help_text=_('گلوگاه‌ها، ریسک‌ها، معارضین، کسری نقدینگی یا متریال')
    )
    corrective_actions = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('اقدامات اصلاحی پیشنهادی / انجام‌شده'),
        help_text=_('راهکارهای جبرانی مانند Fast-Tracking، Crashing یا افزایش شیفت کاری')
    )
    traffic_light_status = models.CharField(
        max_length=10,
        choices=TrafficLightChoices.choices,
        default=TrafficLightChoices.GREEN,
        verbose_name=_('وضعیت چراغ راهنمایی (RAG Status)')
    )

    submitted_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='submitted_weekly_reports',
        verbose_name=_('کارشناس ثبت‌کننده گزارش')
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('زمان ثبت'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('زمان ویرایش'))

    class Meta:
        db_table = 'pmo_weekly_progress_reports'
        verbose_name = _('گزارش پیشرفت هفتگی')
        verbose_name_plural = _('گزارش‌های پیشرفت هفتگی')
        unique_together = ('project', 'week_number', 'report_date')
        ordering = ['-report_date', '-week_number']
        indexes = [
            models.Index(fields=['project', 'report_date'], name='idx_report_proj_date'),
            models.Index(fields=['traffic_light_status'], name='idx_report_rag_status'),
        ]

    def clean(self):
        """اعتبارسنجی منطقی دوره‌های زمانی و بازه درصدها"""
        if self.reporting_period_end and self.reporting_period_start:
            if self.reporting_period_end < self.reporting_period_start:
                raise ValidationError({
                    'reporting_period_end': _('انتهای دوره گزارش نمی‌تواند قبل از ابتدای دوره باشد.')
                })

    # ------------------------------------------------------------------
    # متدهای محاسباتی متدولوژی مدیریت ارزش کسب‌شده (EVM Calculation Properties)
    # ------------------------------------------------------------------
    @property
    def planned_value_cost(self):
        """ارزش برنامه‌ای به واحد پول: PV = (PV% * BAC) / 100"""
        bac = self.project.budget_bac
        return (self.planned_value_pct / Decimal('100.00')) * bac

    @property
    def earned_value_cost(self):
        """ارزش کسب‌شده به واحد پول: EV = (EV% * BAC) / 100"""
        bac = self.project.budget_bac
        return (self.earned_value_pct / Decimal('100.00')) * bac

    @property
    def cost_variance(self):
        """انحراف هزینه: CV = EV - AC (اگر مثبت باشد یعنی زیر بودجه و مطلوب)"""
        return self.earned_value_cost - self.actual_cost

    @property
    def schedule_variance(self):
        """انحراف زمانی مالی: SV = EV - PV (اگر مثبت باشد جلوتر از برنامه)"""
        return self.earned_value_cost - self.planned_value_cost

    @property
    def cost_performance_index(self):
        """شاخص عملکرد هزینه: CPI = EV / AC (بزرگتر از ۱ یعنی بازدهی مالی مطلوب)"""
        if self.actual_cost > 0:
            return round(self.earned_value_cost / self.actual_cost, 3)
        return Decimal('1.000')

    @property
    def schedule_performance_index(self):
        """شاخص عملکرد زمان‌بندی: SPI = EV / PV (بزرگتر از ۱ یعنی سرعت مطلوب)"""
        if self.planned_value_cost > 0:
            return round(self.earned_value_cost / self.planned_value_cost, 3)
        return Decimal('1.000')

    @property
    def estimate_at_completion(self):
        """برآورد هزینه در هنگام تکمیل: EAC = BAC / CPI"""
        cpi = self.cost_performance_index
        if cpi > 0:
            return round(self.project.budget_bac / cpi, 2)
        return self.project.budget_bac

    @property
    def variance_at_completion(self):
        """انحراف نهایی در اتمام پروژه: VAC = BAC - EAC"""
        return self.project.budget_bac - self.estimate_at_completion

    def save(self, *args, **kwargs):
        # بررسی و ارزیابی خودکار چراغ راهنمایی در صورت نیاز
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.project.name} - هفته {self.week_number} ({self.report_date})"
`,
  },
  {
    filename: 'pmo/forms.py',
    language: 'python',
    title: 'فرم‌های ثبت داده (Django Forms & Validation)',
    category: 'forms',
    description: 'فرم‌های Django ModelForm برای ثبت گزارش پیشرفت هفتگی، فیلتر پروژه‌های مجاز بر اساس RBAC کاربر و اعتبارسنجی اعشاری و تاریخ‌ها',
    code: `"""
سامانه مدیریت و کنترل پروژه یکپارچه (PMO System)
فایل فرم‌های ورود و اعتبارسنجی داده - pmo/forms.py
"""

from decimal import Decimal
from django import forms
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from .models import Project, WeeklyProgressReport, ProjectAssignment


class WeeklyProgressReportForm(forms.ModelForm):
    """
    فرم ثبت و ویرایش گزارش پیشرفت هفتگی با اعتبارسنجی دقیق و شخصی‌سازی ابزارک‌های ورودی
    """
    class Meta:
        model = WeeklyProgressReport
        fields = [
            'project',
            'report_date',
            'week_number',
            'reporting_period_start',
            'reporting_period_end',
            'planned_value_pct',
            'earned_value_pct',
            'actual_cost',
            'key_issues_and_delays',
            'corrective_actions',
            'traffic_light_status'
        ]
        widgets = {
            'project': forms.Select(attrs={
                'class': 'form-select w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white',
            }),
            'report_date': forms.DateInput(attrs={
                'type': 'date',
                'class': 'form-input w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-left',
            }),
            'week_number': forms.NumberInput(attrs={
                'min': '1',
                'max': '150',
                'class': 'form-input w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white',
                'placeholder': 'مثال: ۴۱',
            }),
            'reporting_period_start': forms.DateInput(attrs={
                'type': 'date',
                'class': 'form-input w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-left',
            }),
            'reporting_period_end': forms.DateInput(attrs={
                'type': 'date',
                'class': 'form-input w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-left',
            }),
            'planned_value_pct': forms.NumberInput(attrs={
                'step': '0.01',
                'min': '0',
                'max': '100',
                'class': 'form-input w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono',
                'placeholder': '0.00 تا 100.00',
            }),
            'earned_value_pct': forms.NumberInput(attrs={
                'step': '0.01',
                'min': '0',
                'max': '100',
                'class': 'form-input w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono',
                'placeholder': '0.00 تا 100.00',
            }),
            'actual_cost': forms.NumberInput(attrs={
                'step': '0.01',
                'min': '0',
                'class': 'form-input w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono',
                'placeholder': 'مبلغ به میلیون تومان',
            }),
            'key_issues_and_delays': forms.Textarea(attrs={
                'rows': 4,
                'class': 'form-textarea w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white',
                'placeholder': 'مهم‌ترین موانع، علل انحراف و گلوگاه‌های اجرایی این هفته را شرح دهید...',
            }),
            'corrective_actions': forms.Textarea(attrs={
                'rows': 3,
                'class': 'form-textarea w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white',
                'placeholder': 'اقدامات اصلاحی و راهکارهای جبرانی زمان‌بندی یا هزینه...',
            }),
            'traffic_light_status': forms.Select(attrs={
                'class': 'form-select w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white',
            }),
        }

    def __init__(self, *args, **kwargs):
        """
        فیلتر کردن لیست پروژه‌ها بر اساس نقش کاربر وارد شده (RBAC Filtering):
        - اگر کاربر Admin باشد: تمام پروژه‌ها در لیست قرار می‌گیرد.
        - اگر کارشناس کنترل پروژه باشد: فقط پروژه‌هایی که به او تخصیص داده شده نمایش داده می‌شود.
        """
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)

        if user and not user.is_admin_user():
            # محدودسازی کوئری‌ست فقط به پروژه‌های مجاز کارشناس
            self.fields['project'].queryset = Project.objects.filter(
                assignments__user=user,
                assignments__is_active=True,
                status=Project.StatusChoices.ACTIVE
            ).distinct()

    def clean_planned_value_pct(self):
        pv = self.cleaned_data.get('planned_value_pct')
        if pv is not None and (pv < Decimal('0.00') or pv > Decimal('100.00')):
            raise ValidationError(_('درصد پیشرفت برنامه‌ای باید عددی در بازه ۰ تا ۱۰۰ باشد.'))
        return pv

    def clean_earned_value_pct(self):
        ev = self.cleaned_data.get('earned_value_pct')
        if ev is not None and (ev < Decimal('0.00') or ev > Decimal('100.00')):
            raise ValidationError(_('درصد پیشرفت واقعی باید عددی در بازه ۰ تا ۱۰۰ باشد.'))
        return ev

    def clean_actual_cost(self):
        ac = self.cleaned_data.get('actual_cost')
        if ac is not None and ac < Decimal('0.00'):
            raise ValidationError(_('هزینه واقعی نمی‌تواند مقدار منفی داشته باشد.'))
        return ac

    def clean(self):
        cleaned_data = super().clean()
        start = cleaned_data.get('reporting_period_start')
        end = cleaned_data.get('reporting_period_end')
        if start and end and end < start:
            self.add_error('reporting_period_end', _('انتهای دوره گزارش نمی‌تواند قبل از ابتدای دوره باشد.'))
        return cleaned_data


class ProjectForm(forms.ModelForm):
    """
    فرم تعریف و ویرایش پروژه جدید (مخصوص دسترسی Admin)
    """
    class Meta:
        model = Project
        fields = [
            'code',
            'name',
            'description',
            'manager_name',
            'baseline_start_date',
            'baseline_finish_date',
            'budget_bac',
            'status',
            'category'
        ]
        widgets = {
            'code': forms.TextInput(attrs={'class': 'w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono'}),
            'name': forms.TextInput(attrs={'class': 'w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white'}),
            'manager_name': forms.TextInput(attrs={'class': 'w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white'}),
            'baseline_start_date': forms.DateInput(attrs={'type': 'date', 'class': 'w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-left'}),
            'baseline_finish_date': forms.DateInput(attrs={'type': 'date', 'class': 'w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-left'}),
            'budget_bac': forms.NumberInput(attrs={'step': '0.01', 'class': 'w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono'}),
            'status': forms.Select(attrs={'class': 'w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white'}),
            'category': forms.TextInput(attrs={'class': 'w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white'}),
            'description': forms.Textarea(attrs={'rows': 3, 'class': 'w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white'}),
        }
`,
  },
  {
    filename: 'pmo/serializers.py',
    language: 'python',
    title: 'سریالایزرهای Rest Framework (DRF Serializers)',
    category: 'serializers',
    description: 'سریالایزرهای JSON برای API‌های سامانه با فیلدهای محاسباتی داینامیک EVM (CV, SV, CPI, SPI, EAC)',
    code: `"""
سامانه مدیریت و کنترل پروژه یکپارچه (PMO System)
فایل سریالایزرهای وب‌سرویس - pmo/serializers.py
Django REST Framework (DRF)
"""

from rest_framework import serializers
from .models import User, Project, ProjectAssignment, WeeklyProgressReport


class UserSerializer(serializers.ModelSerializer):
    """سریالایزر اطلاعات کاربر و نقش RBAC"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role', 'department', 'phone_number']
        read_only_fields = ['id']


class WeeklyProgressReportSerializer(serializers.ModelSerializer):
    """
    سریالایزر کامل گزارش پیشرفت با فیلدهای محاسباتی شاخص‌های EVM
    """
    submitted_by_name = serializers.CharField(source='submitted_by.get_full_name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    project_code = serializers.CharField(source='project.code', read_only=True)
    
    # فیلدهای محاسباتی ارزش کسب‌شده (Computed EVM Metrics)
    planned_value_cost = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    earned_value_cost = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    cost_variance = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    schedule_variance = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    cost_performance_index = serializers.DecimalField(max_digits=6, decimal_places=3, read_only=True)
    schedule_performance_index = serializers.DecimalField(max_digits=6, decimal_places=3, read_only=True)
    estimate_at_completion = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    variance_at_completion = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)

    class Meta:
        model = WeeklyProgressReport
        fields = [
            'id',
            'project',
            'project_name',
            'project_code',
            'report_date',
            'week_number',
            'reporting_period_start',
            'reporting_period_end',
            'planned_value_pct',
            'earned_value_pct',
            'actual_cost',
            'planned_value_cost',
            'earned_value_cost',
            'cost_variance',
            'schedule_variance',
            'cost_performance_index',
            'schedule_performance_index',
            'estimate_at_completion',
            'variance_at_completion',
            'key_issues_and_delays',
            'corrective_actions',
            'traffic_light_status',
            'submitted_by',
            'submitted_by_name',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'submitted_by', 'created_at', 'updated_at']

    def validate_planned_value_pct(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("درصد پیشرفت برنامه‌ای (PV) باید حتماً بین ۰ تا ۱۰۰ باشد.")
        return value

    def validate_earned_value_pct(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("درصد پیشرفت واقعی (EV) باید حتماً بین ۰ تا ۱۰۰ باشد.")
        return value

    def validate(self, data):
        start = data.get('reporting_period_start')
        end = data.get('reporting_period_end')
        if start and end and end < start:
            raise serializers.ValidationError({"reporting_period_end": "انتهای دوره گزارش نمی‌تواند قبل از ابتدای دوره باشد."})
        return data


class ProjectAssignmentSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)

    class Meta:
        model = ProjectAssignment
        fields = ['id', 'project', 'user', 'user_details', 'role_in_project', 'assigned_at', 'is_active']
        read_only_fields = ['id']


class ProjectSerializer(serializers.ModelSerializer):
    """سریالایزر پروژه به همراه آخرین وضعیت شاخص‌های EVM و کارشناسان منتسب"""
    assignments = ProjectAssignmentSerializer(many=True, read_only=True)
    latest_report = WeeklyProgressReportSerializer(read_only=True)

    class Meta:
        model = Project
        fields = [
            'id',
            'code',
            'name',
            'description',
            'manager_name',
            'baseline_start_date',
            'baseline_finish_date',
            'actual_start_date',
            'actual_finish_date',
            'budget_bac',
            'status',
            'category',
            'assignments',
            'latest_report',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
`,
  },
  {
    filename: 'pmo/permissions.py',
    language: 'python',
    title: 'کلاس‌های دسترسی RBAC (DRF Permissions)',
    category: 'permissions',
    description: 'پیاده‌سازی دقیق منطق احراز هویت و مجوزها برای نقش‌های Admin، Project_Controller و Executive_Viewer',
    code: `"""
سامانه مدیریت و کنترل پروژه یکپارچه (PMO System)
فایل کنترل سطوح دسترسی مبتنی بر نقش - pmo/permissions.py
"""

from rest_framework import permissions
from .models import User, ProjectAssignment


class IsPMOAdmin(permissions.BasePermission):
    """
    مجوز دسترسی کامل مخصوص مدیران سیستم (Admin / Superuser)
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == User.RoleChoices.ADMIN or request.user.is_superuser)
        )


class IsExecutiveViewer(permissions.BasePermission):
    """
    مجوز دسترسی فقط‌خواندنی (Read-Only) برای مدیران ارشد
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        # مدیران ارشد فقط متدهای امن (GET, HEAD, OPTIONS) را مجاز هستند
        if request.method in permissions.SAFE_METHODS:
            return True
        return False


class CanManageWeeklyReport(permissions.BasePermission):
    """
    قانون دسترسی پیشرفته برای ثبت و ویرایش گزارش پیشرفت هفتگی:
    ۱. مدیر سیستم (Admin): دسترسی نامحدود به ایجاد و ویرایش گزارش تمام پروژه‌ها.
    ۲. مدیران ارشد (Executive_Viewer): فقط دسترسی مشاهده (GET).
    ۳. کارشناس کنترل پروژه (Project_Controller):
       - فقط اجازه ثبت/ویرایش گزارش برای پروژه‌هایی را دارد که به وی تخصیص داده شده است (ProjectAssignment).
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        # مشاهده لیست مجاز برای همه کاربران تاییدشده
        if request.method in permissions.SAFE_METHODS:
            return True

        # مدیر سیستم اجازه ایجاد گزارش برای هر پروژه‌ای را دارد
        if request.user.role == User.RoleChoices.ADMIN:
            return True

        # کارشناس کنترل پروژه مجاز به ارسال درخواست POST/PUT است
        if request.user.role == User.RoleChoices.PROJECT_CONTROLLER:
            return True

        return False

    def has_object_permission(self, request, view, obj):
        # خواندن آبجکت برای همه آزاد است
        if request.method in permissions.SAFE_METHODS:
            return True

        # مدیر سیستم دسترسی کامل دارد
        if request.user.role == User.RoleChoices.ADMIN:
            return True

        # کارشناس کنترل پروژه فقط می‌تواند گزارش پروژه خودش را ویرایش کند
        if request.user.role == User.RoleChoices.PROJECT_CONTROLLER:
            is_assigned = ProjectAssignment.objects.filter(
                project=obj.project,
                user=request.user,
                is_active=True
            ).exists()
            return is_assigned

        return False
`,
  },
  {
    filename: 'pmo/views.py',
    language: 'python',
    title: 'ویوها و کنترلرها (Views & ViewSets)',
    category: 'views',
    description: 'کنترلرهای جنگو برای ذخیره‌سازی داده‌های فرم، فیلتر کوئری‌ست بر اساس دسترسی کاربر و محاسبه خلاصه‌های داشبورد',
    code: `"""
سامانه مدیریت و کنترل پروژه یکپارچه (PMO System)
فایل ویوها و کنترلرهای تجاری - pmo/views.py
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Avg, Count, Q
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required

from .models import Project, WeeklyProgressReport, ProjectAssignment, User
from .serializers import ProjectSerializer, WeeklyProgressReportSerializer, ProjectAssignmentSerializer
from .permissions import CanManageWeeklyReport, IsPMOAdmin
from .forms import WeeklyProgressReportForm, ProjectForm


# ----------------------------------------------------------------------
# ۱. کنترلرهای REST API برای فرانت‌اند مدرن
# ----------------------------------------------------------------------
class ProjectViewSet(viewsets.ModelViewSet):
    """
    کنترلر API پروژه‌ها با فیلتر هوشمند بر مبنای نقش کاربر (RBAC)
    """
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # ادمین و مدیران ارشد تمام پروژه‌ها را می‌بینند
        if user.role in [User.RoleChoices.ADMIN, User.RoleChoices.EXECUTIVE_VIEWER] or user.is_superuser:
            return Project.objects.all().prefetch_related('assignments__user', 'weekly_reports')
        
        # کارشناس کنترل پروژه فقط پروژه‌های تخصیص‌یافته به خود را می‌بیند
        return Project.objects.filter(
            assignments__user=user,
            assignments__is_active=True
        ).prefetch_related('assignments__user', 'weekly_reports').distinct()

    @action(detail=False, methods=['get'])
    def portfolio_kpis(self, request):
        """محاسبه شاخص‌های تجمیعی پورتفولیو برای داشبورد کلان"""
        queryset = self.get_queryset()
        total_projects = queryset.count()
        total_bac = queryset.aggregate(total=Sum('budget_bac'))['total'] or 0

        # شمارش وضعیت چراغ راهنمایی
        green_count = 0
        yellow_count = 0
        red_count = 0

        for proj in queryset:
            latest = proj.latest_report
            if latest:
                if latest.traffic_light_status == 'green':
                    green_count += 1
                elif latest.traffic_light_status == 'yellow':
                    yellow_count += 1
                elif latest.traffic_light_status == 'red':
                    red_count += 1

        return Response({
            'total_projects': total_projects,
            'total_budget_bac': total_bac,
            'rag_distribution': {
                'green': green_count,
                'yellow': yellow_count,
                'red': red_count
            }
        })


class WeeklyProgressReportViewSet(viewsets.ModelViewSet):
    """
    کنترلر ثبت و مدیریت گزارش‌های پیشرفت هفتگی
    """
    serializer_class = WeeklyProgressReportSerializer
    permission_classes = [IsAuthenticated, CanManageWeeklyReport]

    def get_queryset(self):
        user = self.request.user
        queryset = WeeklyProgressReport.objects.select_related('project', 'submitted_by')

        if user.role in [User.RoleChoices.ADMIN, User.RoleChoices.EXECUTIVE_VIEWER] or user.is_superuser:
            return queryset

        # کارشناس فقط گزارش‌های پروژه‌های خودش را می‌بیند
        return queryset.filter(
            project__assignments__user=user,
            project__assignments__is_active=True
        ).distinct()

    def perform_create(self, serializer):
        """ثبت خودکار کاربر جاری به عنوان ثبت‌کننده گزارش و اعتبارسنجی تخصیص پروژه"""
        user = self.request.user
        project = serializer.validated_data.get('project')

        # بررسی اینکه اگر کارشناس است، آیا مجاز به ثبت دیتا برای این پروژه است؟
        if user.role == User.RoleChoices.PROJECT_CONTROLLER:
            is_assigned = ProjectAssignment.objects.filter(
                project=project,
                user=user,
                is_active=True
            ).exists()
            if not is_assigned:
                raise serializers.ValidationError({
                    'project': 'شما به عنوان کارشناس به این پروژه تخصیص داده نشده‌اید و اجازه ثبت گزارش ندارید.'
                })

        serializer.save(submitted_by=user)


# ----------------------------------------------------------------------
# ۲. ویوهای سنتی قالب‌های جنگو (Django Template Views)
# ----------------------------------------------------------------------
@login_required
def submit_weekly_report_view(request, project_id=None):
    """
    ویوی ذخیره‌سازی داده‌های فرم گزارش هفتگی با کنترل خطا و بازخورد کاربر
    """
    initial_data = {}
    if project_id:
        initial_data['project'] = get_object_or_404(Project, pk=project_id)

    if request.method == 'POST':
        form = WeeklyProgressReportForm(request.POST, user=request.user)
        if form.is_valid():
            report = form.save(commit=False)
            report.submitted_by = request.user
            report.save()
            messages.success(request, f"گزارش هفته {report.week_number} پروژه «{report.project.name}» با موفقیت ذخیره شد.")
            return redirect('pmo:report_detail', pk=report.pk)
        else:
            messages.error(request, "خطا در اعتبارسنجی فرم. لطفاً فیلدهای ورودی (مخصوصاً درصدهای پیشرفت ۰ تا ۱۰۰) را بررسی کنید.")
    else:
        form = WeeklyProgressReportForm(initial=initial_data, user=request.user)

    return render(request, 'pmo/weekly_report_form.html', {'form': form})
`,
  },
  {
    filename: 'pmo/admin.py',
    language: 'python',
    title: 'شخصی‌سازی ادمین جنگو (Django Admin)',
    category: 'admin',
    description: 'شخصی‌سازی حرفه‌ای پنل مدیریت با نشان‌های رنگی وضعیت چراغ راهنمایی، ستون‌های محاسباتی EVM، فیلترها و جستجو',
    code: `"""
سامانه مدیریت و کنترل پروژه یکپارچه (PMO System)
فایل شخصی‌سازی پنل ادمین - pmo/admin.py
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from .models import User, Project, ProjectAssignment, WeeklyProgressReport


@admin.register(User)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ['username', 'get_full_name', 'role_badge', 'department', 'email', 'is_active']
    list_filter = ['role', 'is_active', 'department']
    search_fields = ['username', 'first_name', 'last_name', 'email']

    def role_badge(self, obj):
        colors = {
            'Admin': '#dc2626',
            'Project_Controller': '#2563eb',
            'Executive_Viewer': '#059669',
        }
        color = colors.get(obj.role, '#64748b')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: bold;">{}</span>',
            color, obj.get_role_display()
        )
    role_badge.short_description = _('نقش سیستمی')


class ProjectAssignmentInline(admin.TabularInline):
    model = ProjectAssignment
    extra = 1
    autocomplete_fields = ['user']


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'manager_name', 'budget_bac_formatted', 'baseline_start_date', 'baseline_finish_date', 'status_badge']
    list_filter = ['status', 'category']
    search_fields = ['code', 'name', 'manager_name']
    inlines = [ProjectAssignmentInline]
    ordering = ['-created_at']

    def budget_bac_formatted(self, obj):
        return f"{obj.budget_bac:,.0f} میلیون تومان"
    budget_bac_formatted.short_description = _('بودجه کل (BAC)')

    def status_badge(self, obj):
        status_colors = {
            'active': '#10b981',
            'planning': '#3b82f6',
            'on_hold': '#f59e0b',
            'completed': '#6366f1',
            'cancelled': '#ef4444',
        }
        color = status_colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="color: {}; font-weight: bold;">● {}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = _('وضعیت پروژه')


@admin.register(WeeklyProgressReport)
class WeeklyProgressReportAdmin(admin.ModelAdmin):
    list_display = [
        'project',
        'week_number',
        'report_date',
        'planned_value_pct_display',
        'earned_value_pct_display',
        'actual_cost_display',
        'cpi_display',
        'spi_display',
        'traffic_light_badge',
        'submitted_by'
    ]
    list_filter = ['traffic_light_status', 'project', 'report_date']
    search_fields = ['project__name', 'project__code', 'key_issues_and_delays']
    autocomplete_fields = ['project', 'submitted_by']
    readonly_fields = [
        'planned_value_cost',
        'earned_value_cost',
        'cost_variance',
        'schedule_variance',
        'cost_performance_index',
        'schedule_performance_index',
        'estimate_at_completion',
        'variance_at_completion',
        'created_at',
        'updated_at'
    ]

    def planned_value_pct_display(self, obj):
        return f"{obj.planned_value_pct} %"
    planned_value_pct_display.short_description = _('پیشرفت برنامه‌ای (PV)')

    def earned_value_pct_display(self, obj):
        return f"{obj.earned_value_pct} %"
    earned_value_pct_display.short_description = _('پیشرفت واقعی (EV)')

    def actual_cost_display(self, obj):
        return f"{obj.actual_cost:,.0f} م.ت"
    actual_cost_display.short_description = _('هزینه واقعی (AC)')

    def cpi_display(self, obj):
        cpi = obj.cost_performance_index
        color = '#10b981' if cpi >= 1.0 else ('#f59e0b' if cpi >= 0.9 else '#ef4444')
        return format_html('<span style="color: {}; font-weight: bold; font-family: monospace;">{}</span>', color, cpi)
    cpi_display.short_description = _('CPI')

    def spi_display(self, obj):
        spi = obj.schedule_performance_index
        color = '#10b981' if spi >= 1.0 else ('#f59e0b' if spi >= 0.9 else '#ef4444')
        return format_html('<span style="color: {}; font-weight: bold; font-family: monospace;">{}</span>', color, spi)
    spi_display.short_description = _('SPI')

    def traffic_light_badge(self, obj):
        badge_map = {
            'green': ('#10b981', '#ecfdf5', 'سبز'),
            'yellow': ('#f59e0b', '#fffbeb', 'زرد'),
            'red': ('#ef4444', '#fef2f2', 'قرمز'),
        }
        text_color, bg_color, label = badge_map.get(obj.traffic_light_status, ('#6b7280', '#f3f4f6', 'نامشخص'))
        return format_html(
            '<span style="background-color: {}; color: {}; border: 1px solid {}; padding: 4px 8px; border-radius: 4px; font-weight: bold;">● {}</span>',
            bg_color, text_color, text_color, label
        )
    traffic_light_badge.short_description = _('چراغ راهنمایی')
`,
  },
  {
    filename: 'database/schema.sql',
    language: 'sql',
    title: 'اسکریپت ساخت دیتابیس MySQL (SQL DDL Schema)',
    category: 'mysql',
    description: 'دستورات استاندارد SQL با ایندکس‌ها، کلیدهای خارجی (Foreign Keys)، محدودیت‌های CHECK و انکودینگ utf8mb4_persian_ci برای هاست شخصی',
    code: `-- ======================================================================
-- سامانه مدیریت و کنترل پروژه یکپارچه (PMO System)
-- اسکریپت ساخت پایگاه داده MySQL 8.0+
-- انکودینگ و Collation: utf8mb4_persian_ci (پشتیبانی کامل از زبان فارسی)
-- ======================================================================

CREATE DATABASE IF NOT EXISTS \`pmo_database\`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_persian_ci;

USE \`pmo_database\`;

-- ----------------------------------------------------------------------
-- ۱. جدول کاربران و سطوح دسترسی (RBAC Users)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`pmo_users\` (
    \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
    \`username\` VARCHAR(150) NOT NULL UNIQUE,
    \`password\` VARCHAR(128) NOT NULL,
    \`first_name\` VARCHAR(150) NOT NULL DEFAULT '',
    \`last_name\` VARCHAR(150) NOT NULL DEFAULT '',
    \`email\` VARCHAR(254) NOT NULL DEFAULT '',
    \`role\` ENUM('Admin', 'Project_Controller', 'Executive_Viewer') NOT NULL DEFAULT 'Project_Controller',
    \`department\` VARCHAR(150) NULL,
    \`phone_number\` VARCHAR(20) NULL,
    \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
    \`is_staff\` TINYINT(1) NOT NULL DEFAULT 0,
    \`is_superuser\` TINYINT(1) NOT NULL DEFAULT 0,
    \`date_joined\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`last_login\` DATETIME NULL,
    INDEX \`idx_user_role\` (\`role\`),
    INDEX \`idx_user_active\` (\`is_active\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;


-- ----------------------------------------------------------------------
-- ۲. جدول مشخصات پروژه‌ها (Projects)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`pmo_projects\` (
    \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
    \`code\` VARCHAR(50) NOT NULL UNIQUE,
    \`name\` VARCHAR(255) NOT NULL,
    \`description\` TEXT NULL,
    \`manager_name\` VARCHAR(150) NOT NULL,
    \`baseline_start_date\` DATE NOT NULL,
    \`baseline_finish_date\` DATE NOT NULL,
    \`actual_start_date\` DATE NULL,
    \`actual_finish_date\` DATE NULL,
    \`budget_bac\` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    \`status\` ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    \`category\` VARCHAR(100) NULL,
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`chk_project_dates\` CHECK (\`baseline_finish_date\` >= \`baseline_start_date\`),
    CONSTRAINT \`chk_project_budget\` CHECK (\`budget_bac\` >= 0),
    INDEX \`idx_proj_code\` (\`code\`),
    INDEX \`idx_proj_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;


-- ----------------------------------------------------------------------
-- ۳. جدول واسط تخصیص کاربران به پروژه‌ها (Project Assignments)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`pmo_project_assignments\` (
    \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
    \`project_id\` BIGINT NOT NULL,
    \`user_id\` BIGINT NOT NULL,
    \`role_in_project\` ENUM('controller', 'lead_pmo', 'observer') NOT NULL DEFAULT 'controller',
    \`assigned_at\` DATE NOT NULL,
    \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY \`uniq_project_user\` (\`project_id\`, \`user_id\`),
    CONSTRAINT \`fk_assignment_project\` FOREIGN KEY (\`project_id\`)
        REFERENCES \`pmo_projects\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`fk_assignment_user\` FOREIGN KEY (\`user_id\`)
        REFERENCES \`pmo_users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX \`idx_assign_proj_user\` (\`project_id\`, \`user_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;


-- ----------------------------------------------------------------------
-- ۴. جدول گزارش‌های پیشرفت هفتگی (Weekly Progress Reports)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`pmo_weekly_progress_reports\` (
    \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
    \`project_id\` BIGINT NOT NULL,
    \`report_date\` DATE NOT NULL,
    \`week_number\` INT UNSIGNED NOT NULL,
    \`reporting_period_start\` DATE NOT NULL,
    \`reporting_period_end\` DATE NOT NULL,
    \`planned_value_pct\` DECIMAL(5,2) NOT NULL,
    \`earned_value_pct\` DECIMAL(5,2) NOT NULL,
    \`actual_cost\` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    \`key_issues_and_delays\` TEXT NOT NULL,
    \`corrective_actions\` TEXT NULL,
    \`traffic_light_status\` ENUM('green', 'yellow', 'red') NOT NULL DEFAULT 'green',
    \`submitted_by_id\` BIGINT NOT NULL,
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- محدودیت‌های صحت سنجی (Validation Constraints)
    CONSTRAINT \`chk_pv_pct_range\` CHECK (\`planned_value_pct\` BETWEEN 0.00 AND 100.00),
    CONSTRAINT \`chk_ev_pct_range\` CHECK (\`earned_value_pct\` BETWEEN 0.00 AND 100.00),
    CONSTRAINT \`chk_ac_positive\` CHECK (\`actual_cost\` >= 0),
    CONSTRAINT \`chk_report_period\` CHECK (\`reporting_period_end\` >= \`reporting_period_start\`),
    UNIQUE KEY \`uniq_project_week\` (\`project_id\`, \`week_number\`, \`report_date\`),
    
    CONSTRAINT \`fk_report_project\` FOREIGN KEY (\`project_id\`)
        REFERENCES \`pmo_projects\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`fk_report_user\` FOREIGN KEY (\`submitted_by_id\`)
        REFERENCES \`pmo_users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    INDEX \`idx_report_proj_date\` (\`project_id\`, \`report_date\`),
    INDEX \`idx_report_rag\` (\`traffic_light_status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;
`,
  },
  {
    filename: 'config/settings.py',
    language: 'python',
    title: 'تنظیمات اتصال به MySQL در Django (settings.py)',
    category: 'settings',
    description: 'پیکربندی دیتابیس MySQL با درایور mysqlclient / PyMySQL، زمان‌بندی تهران و تنظیمات REST Framework',
    code: `"""
پیکربندی Django برای اتصال به پایگاه داده MySQL روی هاست شخصی
فایل: config/settings.py
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# ----------------------------------------------------------------------
# پایگاه داده MySQL روی هاست شخصی (cPanel / DirectAdmin / VPS)
# ----------------------------------------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'pmo_database'),
        'USER': os.environ.get('DB_USER', 'pmo_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'SecurePassword123!@#'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),  # یا آدرس سرور دیتابیس
        'PORT': os.environ.get('DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES', default_storage_engine=INNODB, names 'utf8mb4' COLLATE 'utf8mb4_persian_ci'",
        },
    }
}

# مدل سفارشی کاربر برای سیستم RBAC
AUTH_USER_MODEL = 'pmo.User'

# تنظیمات زبان و منطقه زمانی ایران
LANGUAGE_CODE = 'fa-ir'
TIME_ZONE = 'Asia/Tehran'
USE_I18N = True
USE_TZ = True

# تنظیمات Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}
`,
  },
  {
    filename: 'DEPLOYMENT_GUIDE.md',
    language: 'markdown',
    title: 'راهنمای استقرار روی هاست شخصی (Deployment Guide)',
    category: 'guide',
    description: 'راهنمای قدم به قدم نصب وابستگی‌های پایتون، ایجاد دیتابیس MySQL، مایگریشن و اجرای سرویس روی سرور',
    code: `# راهنمای گام‌به‌گام استقرار سامانه PMO روی هاست شخصی

این راهنما برای راه‌اندازی بخش بک‌اند **Django** و دیتابیس **MySQL** روی هاست اختصاصی یا مجازی (VPS / cPanel / DirectAdmin) تهیه شده است.

---

### ۱. نصب پیش‌نیازها و محیط مجازی (Virtualenv)

در ترمینال هاست یا سرور خود دستورات زیر را اجرا کنید:

\`\`\`bash
# ساخت و فعال‌سازی محیط مجازی پایتون
python3 -m venv venv
source venv/bin/activate

# نصب پکیج‌های مورد نیاز
pip install django djangorestframework mysqlclient django-cors-headers
\`\`\`

---

### ۲. ساخت دیتابیس در MySQL

وارد محیط MySQL یا ابزار phpMyAdmin در پنل هاست خود شوید و دیتابیس را بسازید:

\`\`\`sql
CREATE DATABASE pmo_database CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci;
\`\`\`

---

### ۳. اجرای مایگریشن‌ها و ایجاد جداول

دستورات ساخت جداول را اجرا کنید:

\`\`\`bash
python manage.py makemigrations pmo
python manage.py migrate
\`\`\`

---

### ۴. ساخت کاربر مدیر سیستم (Admin)

\`\`\`bash
python manage.py createsuperuser
\`\`\`
پس از ورود به پنل ادمین جنگو (\`/admin\`)، نقش کاربر را روی **Admin** قرار دهید.

---

### ۵. تست و اجرای سرور

\`\`\`bash
python manage.py runserver 0.0.0.0:8000
\`\`\`
سامانه هم‌اکنون آماده بهره‌برداری کامل است!
`,
  },
];
