/**
 * فهرست استاندارد «موضوع‌های الحاقیه» — **تولیدشده از طرح بک‌اند**
 * (`hrms_project/contracts/addendum_schema.py`).
 *
 * این فایل هم‌تراز با `GET /contract-addendums/subject-types/` است و فقط به‌عنوان
 * پشتیبان (fallback) استفاده می‌شود تا فرم حتی در نبود آن سرویس هم کامل کار کند.
 * هر موضوع، فیلدهای تخصصی خود را دارد؛ نوع‌ها: money | percent | number | int |
 * text | textarea | date | select و `effect` یعنی اثر آن فیلد روی پروندهٔ قرارداد.
 */
export const ADDENDUM_SCHEMA = {
  "groups": {
    "financial": "مالی و مبلغ",
    "time": "زمان و برنامه",
    "scope": "دامنه و مشخصات فنی",
    "parties": "طرفین و عوامل اجرایی",
    "legal": "حقوقی، بیمه و مالیات",
    "close": "تحویل، تعلیق و خاتمه",
    "other": "سایر"
  },
  "targets": {
    "amount": "مبلغ قرارداد",
    "end_date": "تاریخ پایان قرارداد",
    "advance_payment": "پیش‌پرداخت قرارداد",
    "retention_percent": "درصد حسن انجام کار",
    "guarantee_amount": "مبلغ تضمین",
    "exchange_rate": "نرخ تسعیر ارز"
  },
  "subjects": [
    {
      "value": "amount",
      "label": "تغییر مبلغ، بهای قرارداد و تعدیل قیمت",
      "group": "financial",
      "group_label": "مالی و مبلغ",
      "fields": [
        {
          "key": "amount_change",
          "label": "تغییر مبلغ (افزایش/کاهش)",
          "type": "money",
          "effect": [
            "amount",
            "delta"
          ],
          "help": "عدد مثبت = افزایش، منفی = کاهش"
        },
        {
          "key": "new_amount",
          "label": "مبلغ جدید قرارداد",
          "type": "money",
          "effect": [
            "amount",
            "set"
          ]
        },
        {
          "key": "percent_change",
          "label": "درصد تغییر",
          "type": "percent"
        },
        {
          "key": "adjustment_basis",
          "label": "مبنای تعدیل",
          "type": "text",
          "help": "شاخص، بخشنامه یا مصوبهٔ مبنای تعدیل"
        },
        {
          "key": "adjustment_index",
          "label": "شاخص / ضریب تعدیل",
          "type": "number"
        },
        {
          "key": "effective_date",
          "label": "تاریخ اجرای تغییر",
          "type": "date"
        }
      ]
    },
    {
      "value": "payment",
      "label": "تغییر شرایط پرداخت، پیش‌پرداخت و تسویه‌حساب",
      "group": "financial",
      "group_label": "مالی و مبلغ",
      "fields": [
        {
          "key": "advance_change",
          "label": "تغییر پیش‌پرداخت (افزایش/کاهش)",
          "type": "money",
          "effect": [
            "advance_payment",
            "delta"
          ],
          "help": "عدد مثبت = افزایش، منفی = کاهش"
        },
        {
          "key": "new_advance_payment",
          "label": "پیش‌پرداخت جدید قرارداد",
          "type": "money",
          "effect": [
            "advance_payment",
            "set"
          ]
        },
        {
          "key": "advance_percent",
          "label": "درصد پیش‌پرداخت جدید",
          "type": "percent"
        },
        {
          "key": "payment_terms_new",
          "label": "شرایط پرداخت جدید",
          "type": "textarea"
        },
        {
          "key": "settlement_terms",
          "label": "شرایط تسویه‌حساب",
          "type": "textarea"
        },
        {
          "key": "payment_steps",
          "label": "تعداد/توالی اقساط",
          "type": "text"
        }
      ]
    },
    {
      "value": "deductions",
      "label": "تغییر کسورات، جرایم و خسارات قراردادی",
      "group": "financial",
      "group_label": "مالی و مبلغ",
      "fields": [
        {
          "key": "new_retention_percent",
          "label": "درصد حسن انجام کار جدید",
          "type": "percent",
          "effect": [
            "retention_percent",
            "set"
          ]
        },
        {
          "key": "penalty_amount",
          "label": "مبلغ جریمه",
          "type": "money"
        },
        {
          "key": "penalty_waiver",
          "label": "مبلغ بخشودگی جریمه",
          "type": "money"
        },
        {
          "key": "penalty_basis",
          "label": "مبنای محاسبهٔ جریمه",
          "type": "text"
        },
        {
          "key": "deduction_note",
          "label": "توضیح کسورات",
          "type": "textarea"
        }
      ]
    },
    {
      "value": "guarantees",
      "label": "تغییر تضامین، ضمانت‌نامه‌ها و وثایق",
      "group": "financial",
      "group_label": "مالی و مبلغ",
      "fields": [
        {
          "key": "new_guarantee_amount",
          "label": "مبلغ جدید تضمین",
          "type": "money",
          "effect": [
            "guarantee_amount",
            "set"
          ]
        },
        {
          "key": "guarantee_validity_days",
          "label": "تمدید اعتبار (روز)",
          "type": "int"
        },
        {
          "key": "new_guarantee_expiry",
          "label": "تاریخ انقضای جدید",
          "type": "date"
        },
        {
          "key": "guarantee_kind",
          "label": "نوع تضمین",
          "type": "select",
          "choices": [
            {
              "value": "performance",
              "label": "حسن انجام کار"
            },
            {
              "value": "advance",
              "label": "پیش‌پرداخت"
            },
            {
              "value": "bid",
              "label": "شرکت در مناقصه"
            },
            {
              "value": "execution",
              "label": "اجرای تعهدات"
            },
            {
              "value": "other",
              "label": "سایر"
            }
          ]
        },
        {
          "key": "guarantee_note",
          "label": "توضیحات تضامین",
          "type": "textarea"
        }
      ]
    },
    {
      "value": "currency",
      "label": "تغییر ارز قرارداد، نرخ تسعیر و شرایط مالی بین‌المللی",
      "group": "financial",
      "group_label": "مالی و مبلغ",
      "fields": [
        {
          "key": "new_exchange_rate",
          "label": "نرخ تسعیر جدید",
          "type": "number",
          "effect": [
            "exchange_rate",
            "set"
          ]
        },
        {
          "key": "settlement_currency",
          "label": "ارز تسویه",
          "type": "text"
        },
        {
          "key": "currency_clause",
          "label": "شرایط مالی بین‌المللی / ارزی",
          "type": "textarea"
        },
        {
          "key": "rate_basis",
          "label": "مبنای نرخ (بانک مرکزی/توافقی)",
          "type": "text"
        }
      ]
    },
    {
      "value": "duration",
      "label": "تغییر مدت، تمدید و اصلاح برنامه زمانی قرارداد",
      "group": "time",
      "group_label": "زمان و برنامه",
      "fields": [
        {
          "key": "new_end_date",
          "label": "تاریخ پایان جدید",
          "type": "date",
          "effect": [
            "end_date",
            "set"
          ]
        },
        {
          "key": "extension_days",
          "label": "مدت تمدید (روز)",
          "type": "int"
        },
        {
          "key": "new_start_date",
          "label": "تاریخ شروع جدید",
          "type": "date"
        },
        {
          "key": "time_reason",
          "label": "علت تمدید",
          "type": "select",
          "choices": [
            {
              "value": "employer_delay",
              "label": "تأخیر کارفرما"
            },
            {
              "value": "change_order",
              "label": "تغییر کار / دستور کار جدید"
            },
            {
              "value": "force_majeure",
              "label": "قوه قاهره"
            },
            {
              "value": "material_delay",
              "label": "تأخیر تأمین مصالح"
            },
            {
              "value": "other",
              "label": "سایر"
            }
          ]
        },
        {
          "key": "new_schedule_note",
          "label": "اصلاحات برنامهٔ زمانی",
          "type": "textarea"
        }
      ]
    },
    {
      "value": "provisions",
      "label": "اصلاح و تکمیل مفاد قرارداد",
      "group": "legal",
      "group_label": "حقوقی، بیمه و مالیات",
      "fields": [
        {
          "key": "article_ref",
          "label": "ماده / بند مورد اصلاح",
          "type": "text"
        },
        {
          "key": "old_text",
          "label": "متن قبلی",
          "type": "textarea"
        },
        {
          "key": "new_text",
          "label": "متن جدید",
          "type": "textarea"
        },
        {
          "key": "legal_basis",
          "label": "مستند / مبنای اصلاح",
          "type": "text"
        }
      ]
    },
    {
      "value": "scope",
      "label": "تغییر موضوع، دامنه و حجم کار قرارداد",
      "group": "scope",
      "group_label": "دامنه و مشخصات فنی",
      "fields": [
        {
          "key": "scope_description",
          "label": "شرح دامنهٔ جدید",
          "type": "textarea"
        },
        {
          "key": "added_items",
          "label": "اقلام افزوده",
          "type": "textarea"
        },
        {
          "key": "removed_items",
          "label": "اقلام حذف‌شده",
          "type": "textarea"
        },
        {
          "key": "quantity_change",
          "label": "تغییر حجم کار (مقدار/درصد)",
          "type": "text"
        }
      ]
    },
    {
      "value": "technical",
      "label": "تغییر مشخصات فنی، نقشه‌ها و استانداردهای اجرایی",
      "group": "scope",
      "group_label": "دامنه و مشخصات فنی",
      "fields": [
        {
          "key": "spec_reference",
          "label": "شمارهٔ مشخصات / نقشه",
          "type": "text"
        },
        {
          "key": "revision",
          "label": "ویرایش (Revisions)",
          "type": "text"
        },
        {
          "key": "standard_code",
          "label": "استاندارد مرجع",
          "type": "text"
        },
        {
          "key": "technical_note",
          "label": "توضیح فنی",
          "type": "textarea"
        }
      ]
    },
    {
      "value": "project",
      "label": "تغییر پروژه، محل اجرا و نحوه تخصیص کار",
      "group": "scope",
      "group_label": "دامنه و مشخصات فنی",
      "fields": [
        {
          "key": "project_ref",
          "label": "پروژه / کار جدید",
          "type": "text"
        },
        {
          "key": "location_new",
          "label": "محل اجرای جدید",
          "type": "text"
        },
        {
          "key": "allocation_note",
          "label": "نحوهٔ تخصیص کار",
          "type": "textarea"
        }
      ]
    },
    {
      "value": "supply",
      "label": "تغییر شرایط تأمین مصالح، تجهیزات و تحویل کالا",
      "group": "scope",
      "group_label": "دامنه و مشخصات فنی",
      "fields": [
        {
          "key": "supply_terms_new",
          "label": "شرایط تأمین جدید",
          "type": "textarea"
        },
        {
          "key": "delivery_place",
          "label": "محل تحویل",
          "type": "text"
        },
        {
          "key": "incoterms",
          "label": "شرایط تحویل (Incoterms)",
          "type": "text"
        },
        {
          "key": "supply_note",
          "label": "توضیحات",
          "type": "textarea"
        }
      ]
    },
    {
      "value": "delivery",
      "label": "تغییر شرایط تحویل، آزمایش، تأیید و تضمین کیفیت",
      "group": "close",
      "group_label": "تحویل، تعلیق و خاتمه",
      "fields": [
        {
          "key": "acceptance_stage",
          "label": "مرحلهٔ تحویل / تأیید",
          "type": "text"
        },
        {
          "key": "test_standard",
          "label": "آزمون و استاندارد پذیرش",
          "type": "text"
        },
        {
          "key": "quality_warranty_months",
          "label": "دورهٔ تضمین کیفیت (ماه)",
          "type": "int"
        },
        {
          "key": "delivery_note",
          "label": "توضیحات تحویل",
          "type": "textarea"
        }
      ]
    },
    {
      "value": "parties",
      "label": "تغییر مشخصات طرفین، نمایندگان و صاحبان امضای مجاز",
      "group": "parties",
      "group_label": "طرفین و عوامل اجرایی",
      "fields": [
        {
          "key": "party_role",
          "label": "طرف قرارداد",
          "type": "select",
          "choices": [
            {
              "value": "employer",
              "label": "کارفرما"
            },
            {
              "value": "contractor",
              "label": "پیمانکار"
            },
            {
              "value": "consultant",
              "label": "مشاور"
            },
            {
              "value": "other",
              "label": "سایر"
            }
          ]
        },
        {
          "key": "party_name_new",
          "label": "نام جدید طرف",
          "type": "text"
        },
        {
          "key": "representative",
          "label": "نماینده / صاحب امضا",
          "type": "text"
        },
        {
          "key": "signatory_power",
          "label": "حد اختیارات",
          "type": "text"
        }
      ]
    },
    {
      "value": "consultants",
      "label": "تغییر ناظر، مشاور، پیمانکاران جزء و عوامل اجرایی",
      "group": "parties",
      "group_label": "طرفین و عوامل اجرایی",
      "fields": [
        {
          "key": "role_type",
          "label": "نقش",
          "type": "select",
          "choices": [
            {
              "value": "supervisor",
              "label": "ناظر"
            },
            {
              "value": "consultant",
              "label": "مشاور"
            },
            {
              "value": "subcontractor",
              "label": "پیمانکار جزء"
            },
            {
              "value": "staff",
              "label": "عوامل اجرایی"
            }
          ]
        },
        {
          "key": "entity_name",
          "label": "نام جدید",
          "type": "text"
        },
        {
          "key": "replaced_entity",
          "label": "جایگزینِ",
          "type": "text"
        },
        {
          "key": "consultant_note",
          "label": "توضیحات",
          "type": "textarea"
        }
      ]
    },
    {
      "value": "obligations",
      "label": "تغییر تعهدات، مسئولیت‌ها و حدود اختیارات طرفین",
      "group": "legal",
      "group_label": "حقوقی، بیمه و مالیات",
      "fields": [
        {
          "key": "party_obligations",
          "label": "تعهدات جدید",
          "type": "textarea"
        },
        {
          "key": "liability_limit",
          "label": "حد مسئولیت",
          "type": "text"
        },
        {
          "key": "obligation_note",
          "label": "توضیحات",
          "type": "textarea"
        }
      ]
    },
    {
      "value": "legal",
      "label": "تغییر شرایط بیمه، مالیات و الزامات قانونی",
      "group": "legal",
      "group_label": "حقوقی، بیمه و مالیات",
      "fields": [
        {
          "key": "insurance_basis",
          "label": "شرایط بیمه",
          "type": "textarea"
        },
        {
          "key": "tax_basis",
          "label": "شرایط مالیات و عوارض",
          "type": "textarea"
        },
        {
          "key": "legal_reference",
          "label": "مستند قانونی",
          "type": "text"
        },
        {
          "key": "legal_note",
          "label": "توضیحات",
          "type": "textarea"
        }
      ]
    },
    {
      "value": "suspension",
      "label": "تغییر شرایط تعلیق، توقف، ازسرگیری و خاتمه قرارداد",
      "group": "close",
      "group_label": "تحویل، تعلیق و خاتمه",
      "fields": [
        {
          "key": "action_type",
          "label": "نوع اقدام",
          "type": "select",
          "choices": [
            {
              "value": "suspension",
              "label": "تعلیق"
            },
            {
              "value": "stop",
              "label": "توقف"
            },
            {
              "value": "resume",
              "label": "ازسرگیری"
            },
            {
              "value": "termination",
              "label": "خاتمه"
            }
          ]
        },
        {
          "key": "action_date",
          "label": "تاریخ اجرا",
          "type": "date"
        },
        {
          "key": "action_days",
          "label": "مدت (روز)",
          "type": "int"
        },
        {
          "key": "action_reason",
          "label": "علت",
          "type": "textarea"
        }
      ]
    },
    {
      "value": "other",
      "label": "سایر تغییرات و الحاق موارد جدید",
      "group": "other",
      "group_label": "سایر",
      "fields": [
        {
          "key": "free_title",
          "label": "عنوان تغییر",
          "type": "text"
        },
        {
          "key": "free_text",
          "label": "شرح کامل",
          "type": "textarea"
        }
      ]
    }
  ]
};


export const ADDENDUM_SUBJECTS = ADDENDUM_SCHEMA.subjects.map(({ value, label }) => ({ value, label }));

export const ADDENDUM_GROUPS = ADDENDUM_SCHEMA.groups;

export const CONTRACT_TARGET_LABELS = ADDENDUM_SCHEMA.targets;

export const addendumSubject = (value) =>
  ADDENDUM_SCHEMA.subjects.find((item) => item.value === value) || null;

export const addendumSubjectLabel = (value) => addendumSubject(value)?.label || '';

export const addendumSubjectFields = (value) => addendumSubject(value)?.fields || [];

export default ADDENDUM_SCHEMA;
