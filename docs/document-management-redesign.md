# Kian EBP — Document Management Redesign

## 1. Audit summary

The existing implementation already had the right storage foundations:

- Module-specific archive profiles and directories, including employee and contract folders.
- `ManagedDocument`, `DocumentVersion`, `DocumentFolder` and `DocumentActivity` models.
- DMS folder seeding, archive indexing without copying files, version history and activity logging.
- A separate DMS workspace (`/document-management`) with dashboard, library, folders, reports and activity pages.

The audit found these gaps:

1. The DMS API was tenant-scoped but not document-scoped: any authenticated tenant user could query every DMS record.
2. Confidentiality was displayed in the UI but not enforced server-side.
3. Files were downloaded through raw media URLs; storage paths were exposed in API payloads.
4. The only lifecycle statuses were `draft`, `active` and `archived`; there was no review, approval, publication, rejection, withdrawal or replacement sequence.
5. Documents had no organizational type, responsible department, issuing authority, effective date, review date or replacement relationship.
6. Navigation exposed a library but not organizational categories, workflow queues or review-due views.
7. DMS writes had no explicit `can_manage_documents` / `can_delete_documents` checks.
8. Employee and contract documents remained accessible from their own modules; the DMS indexed them but had no generic related-entity reference.

## 2. Architectural decisions

- **Preserve the existing storage engine.** No existing file was moved, copied or deleted. Archive indexing still references the original physical path.
- **One logical document, many access points.** Employee, contract, project and financial documents remain owned by their source module; DMS is the central discovery and governance layer.
- **Logical classification is separate from physical folders.** `document_type` drives organizational registers; `DocumentFolder` continues to describe the storage/library hierarchy.
- **Controlled lifecycle.** New DMS documents start as drafts. Publication is a separate, authorized transition. Published controlled documents cannot be edited directly.
- **Explicit permissions.** Management, deletion, approval and publication are separate permissions.
- **Backward-compatible migrations.** Existing indexed documents are marked non-controlled and published so they remain visible and editable as before.

## 3. Information architecture

The DMS has its own application menu:

- **خانه** — dashboard, workflow KPIs and storage summary.
- **کتابخانه اسناد** — all documents, drafts, personal documents, confidential documents, then one collapsible menu per module root; each module exposes its own subfolders.
- **اسناد سازمانی** — only the company-document folder's own subfolders; no document-type filter items.
- **گردش‌کار اسناد** — in-review, approved, published, rejected, withdrawn and superseded queues.
- **پایش و بایگانی** — archive, expiring, expired and review-due views.
- **ساختار و مدیریت** — folder and module structure.
- **گزارش‌ها و تاریخچه** — comprehensive report and activity log.

Registers are consolidated into filtered views of one repository rather than separate duplicate pages.

## 4. Metadata and lifecycle

Added metadata:

- `document_type` (company, circular, policy, procedure, form, minutes, correspondence, template, quality, financial, HR, contract, project, other)
- `owner_department`, `issuing_authority`
- `effective_date`, `review_date`
- `related_entity_type`, `related_entity_id`, `related_entity_label`
- `workflow_status`, `is_controlled`
- `published_at`, `published_by`, `superseded_by`
- extensible `metadata` JSON, including capped workflow history

Lifecycle:

`draft → in_review → approved → published → superseded/withdrawn → archived`

Rejected documents return to `rejected` and can be resubmitted. A published document can start a revision (`draft`) while retaining its prior versions. Publication records the publisher and time; replacement records a link to the replacement document.

## 5. Security changes

- Read querysets filter confidential/secret documents unless the user is the creator or holds `can_manage_documents`.
- Folder document counts and DMS statistics use the same accessible-document scope.
- Create/update/folder/sync/version operations require `can_manage_documents`.
- Permanent deletion requires `can_delete_documents`.
- Approval/rejection requires `can_approve_documents`.
- Publication/withdrawal/replacement requires `can_publish_documents`.
- The content endpoint streams files only after object-level authorization; no raw media path is returned.
- Storage paths are returned only to document managers.
- Activity lists are limited to accessible documents.
- Published controlled documents reject direct serializer edits; a workflow transition is required.

## 6. Remaining limitations

- **Library filtering is currently client-side over a bounded result window.** The API exposes server-side filters and pagination, but the library screen loads up to 500 documents for fast folder/search filtering; very large repositories should move to server-driven pagination.
- **Full-text search inside PDF/Word/scanned files is not implemented.**
- **Approval is single-stage.** It is intentionally not a BPM engine. Multi-step approval chains would require a separate workflow model.
- **Document types are fixed choices.** A dynamic taxonomy administration page is not included.
- **Related business records are reference fields.** Employee/contract/project links are not automatically resolved into deep links because source models have different identifiers.
- **Media-server hardening is an operational requirement.** The API no longer exposes media URLs, but production Nginx must also protect `/media/` or route it through an authenticated handler; repository-level code cannot guarantee that external server rule.
- **Preview is browser-based for supported MIME types.** A server-side Office/PDF conversion service was deliberately not introduced.
- **DB-backed integration tests could not run in this environment** because PostgreSQL was unavailable; migration checks and Django's non-DB test suite were run instead.

## 7. Migrations and validation

- `documents.0010_dms_governance_metadata`: structural fields, indexes, activity action.
- `documents.0011_backfill_dms_governance`: legacy data backfill in a separate transaction, avoiding PostgreSQL `pending trigger events` during index creation.
- `settings_app.0015_documents_storage_profile`: DMS storage profile.
- `core.0016_enable_document_management_module`: DMS application registration.
- Backend: `python manage.py check` and `python manage.py test documents` (24 tests).
- Frontend: production build plus targeted DMS tests.
