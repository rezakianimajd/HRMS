from django.contrib import admin
from accounting.models import (
    Branch, FiscalYear, FiscalPeriod, AccountingBook,
    AccountType, AccountGroup, Account, AuxiliaryAccount,
    AccountingDimension, DimensionValue, CostCenter,
    Journal, AccountingDocument, AccountingDocumentLine,
    AccountingSequence, SourceTransaction, PostingTemplate, AccountingSettings,
    CodingConfig, AuxiliaryCategory, BankStatement, BankStatementLine, BankReconciliation,
)


admin.site.register(Branch)
admin.site.register(FiscalYear)
admin.site.register(FiscalPeriod)
admin.site.register(AccountingBook)
admin.site.register(AccountType)
admin.site.register(AccountGroup)
admin.site.register(Account)
admin.site.register(AuxiliaryAccount)
admin.site.register(AccountingDimension)
admin.site.register(DimensionValue)
admin.site.register(CostCenter)
admin.site.register(Journal)
admin.site.register(AccountingDocument)
admin.site.register(AccountingDocumentLine)
admin.site.register(AccountingSequence)
admin.site.register(SourceTransaction)
admin.site.register(PostingTemplate)
admin.site.register(AccountingSettings)
admin.site.register(CodingConfig)
admin.site.register(AuxiliaryCategory)
admin.site.register(BankStatement)
admin.site.register(BankStatementLine)
admin.site.register(BankReconciliation)
