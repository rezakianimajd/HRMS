"""Admin registration for the Correspondences module."""
from django.contrib import admin

from correspondences.models import (
    Announcement, Correspondent, Form, IncomingLetter, Letter, LetterAttachment, LetterCategory,
    LetterEvent, LetterReferral, LetterSeries, Organization, OrganizationalLetter, OutgoingLetter,
)


class LetterAttachmentInline(admin.TabularInline):
    model = LetterAttachment
    extra = 0


class LetterReferralInline(admin.TabularInline):
    model = LetterReferral
    extra = 0


@admin.register(Letter)
class LetterAdmin(admin.ModelAdmin):
    list_display = ('number', 'direction', 'subject', 'organization', 'status', 'letter_date',
                    'due_date', 'priority')
    list_filter = ('direction', 'status', 'priority', 'confidentiality', 'is_active')
    search_fields = ('number', 'subject', 'sender_name', 'receiver_name', 'indicator_no')
    date_hierarchy = 'letter_date'
    inlines = [LetterReferralInline, LetterAttachmentInline]


@admin.register(LetterCategory)
class LetterCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'direction', 'order', 'is_active')
    list_filter = ('direction', 'is_active')
    search_fields = ('name', 'code')


@admin.register(LetterSeries)
class LetterSeriesAdmin(admin.ModelAdmin):
    list_display = ('title', 'direction', 'prefix', 'next_number', 'padding', 'is_default',
                    'is_active')
    list_filter = ('direction', 'is_default', 'is_active')
    search_fields = ('title', 'prefix')


@admin.register(Correspondent)
class CorrespondentAdmin(admin.ModelAdmin):
    list_display = ('name', 'kind', 'title', 'organization', 'mobile', 'phone', 'is_active')
    list_filter = ('kind', 'is_active')
    search_fields = ('name', 'code', 'national_id', 'mobile', 'phone')


@admin.register(LetterReferral)
class LetterReferralAdmin(admin.ModelAdmin):
    list_display = ('letter', 'seq', 'to_user', 'to_name', 'referred_on', 'due_date', 'status')
    list_filter = ('status', 'referred_on', 'due_date')
    search_fields = ('letter__number', 'letter__subject', 'to_name', 'note')


@admin.register(LetterEvent)
class LetterEventAdmin(admin.ModelAdmin):
    list_display = ('letter', 'action', 'actor', 'note', 'created_at')
    list_filter = ('action',)
    search_fields = ('letter__number', 'note')


admin.site.register(IncomingLetter)
admin.site.register(OutgoingLetter)
admin.site.register(Announcement)
admin.site.register(Form)
admin.site.register(Organization)
admin.site.register(OrganizationalLetter)
