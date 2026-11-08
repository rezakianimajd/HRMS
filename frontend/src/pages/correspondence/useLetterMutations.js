/**
 * عملیات نوشتاری ماژول مکاتبات: ویرایش درجای ردیف‌های جدول، ثبت/ارجاع/بستن/بایگانی،
 * ثبت پاسخ ارجاع، حذف نامه و پیوست و بارگذاری پیوست.
 *
 * از `CorrespondenceLettersPage` جدا شد تا صفحه فقط فهرست/UI بماند و منطق نوشتن
 * (و invalidate کردن کش‌ها) یک‌جا باشد. همهٔ callbackها با همان نام قبلی برمی‌گردند،
 * بنابراین بدنهٔ جدول و کشوی جزئیات بدون تغییر از آن‌ها استفاده می‌کند.
 */
import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import axiosInstance from '../../core/api/axiosConfig';
import { toPersianDigits } from '../../core/utils/numberUtils';
import {
  EMPTY_ALLOWED_FIELDS, NULLABLE_FIELDS, safeDate,
} from './correspondenceLetterForm';

/** فیلدهای قابل ویرایش درجای جدول. */
export const EDITABLE_FIELDS = [
  'number', 'company_reg_no', 'company_reg_date', 'unit_reg_no', 'unit_reg_date', 'unit_name',
  'subject', 'category', 'delivery_type', 'entry_method', 'entry_time',
  'delivered_by', 'delivered_by_name',
  'sender_employee', 'sender_name', 'sender_party',
  'party_account', 'party_name', 'receiver_employee', 'receiver_name', 'contract',
  'letter_date', 'sent_date', 'due_date', 'priority', 'status',
];

/** مقدار اولیهٔ فرم درجای هر ردیف (هم‌شکل با پاسخ فهرست). */
export const seedLetterDraft = (letter) => ({
  number: letter.number || '',
  company_reg_no: letter.company_reg_no || '',
  company_reg_date: safeDate(letter.company_reg_date),
  unit_reg_no: letter.unit_reg_no || '',
  unit_reg_date: safeDate(letter.unit_reg_date),
  unit_name: letter.unit_name || '',
  subject: letter.subject || '',
  category: letter.category || '',
  delivery_type: letter.delivery_type || 'in_person',
  entry_method: letter.entry_method || 'manual',
  entry_time: letter.entry_time ? String(letter.entry_time).slice(0, 5) : '',
  delivered_by: letter.delivered_by || '',
  delivered_by_name: letter.delivered_by_name || '',
  sender_employee: letter.sender_employee || '',
  sender_name: letter.sender_name || '',
  sender_party: letter.sender_party || '',
  party_account: letter.party_account || '',
  party_name: letter.party_name || '',
  receiver_employee: letter.receiver_employee || '',
  receiver_name: letter.receiver_name || '',
  contract: letter.contract || '',
  letter_date: safeDate(letter.letter_date),
  sent_date: safeDate(letter.sent_date),
  due_date: safeDate(letter.due_date),
  priority: letter.priority || 'normal',
  status: letter.status || 'registered',
});

/** فقط تفاوت‌های ردیف با مقادیر اصلی به سرور فرستاده می‌شود (PATCH سبک). */
export const buildLetterPatch = (letter, draftValues) => {
  const original = seedLetterDraft(letter);
  const payload = {};
  EDITABLE_FIELDS.forEach((key) => {
    const next = draftValues[key] ?? '';
    const before = original[key] ?? '';
    if (String(next) === String(before)) return;
    if (next === '') {
      if (EMPTY_ALLOWED_FIELDS.includes(key)) {
        payload[key] = '';
        return;
      }
      if (!NULLABLE_FIELDS.includes(key)) return;
      payload[key] = null;
      return;
    }
    payload[key] = next;
  });
  return payload;
};

export const useLetterMutations = ({
  letters,
  qc,
  refreshList,
  refreshReferrals,
  refreshStats,
  setComment,
  setCompleteReferral,
  setDrawerLetter,
  setError,
  setToast,
  activeLetterId,
  canEditOf,
}) => {
  /* ---------- ویرایش درجا در جدول (الگوی گرید ورود اطلاعات) ---------- */
  const [editRowId, setEditRowId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savingIds, setSavingIds] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef(null);

  const letterById = (id) => (letters || []).find((row) => row.id === id) || null;

  const startRowEdit = (letter) => {
    if (canEditOf && !canEditOf(letter)) {
      setError('برای ویرایش این نامه مجوز «ویرایش مکاتبات» لازم است.');
      return;
    }
    setDrafts((previous) => (previous[letter.id] ? previous : {
      ...previous,
      [letter.id]: seedLetterDraft(letter),
    }));
    setEditRowId(letter.id);
  };

  const patchDraft = (key) => (value) => setDrafts((previous) => {
    if (!editRowId) return previous;
    const current = previous[editRowId] || seedLetterDraft(letterById(editRowId) || {});
    return { ...previous, [editRowId]: { ...current, [key]: value } };
  });

  const discardRow = (id) => {
    setDrafts((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
    setEditRowId((previous) => (previous === id ? null : previous));
  };

  const discardAll = () => {
    setDrafts({});
    setEditRowId(null);
  };

  const refreshAll = () => {
    refreshList?.();
    refreshStats?.();
    refreshReferrals?.();
  };

  const invalidateDetail = () => qc.invalidateQueries({ queryKey: ['correspondence-letter'] });

  const afterSave = (saved, failed) => {
    if (!saved && !failed) return;
    invalidateDetail();
    refreshAll();
    if (!saved) return;
    setToast(failed
      ? `${toPersianDigits(saved)} ردیف ذخیره شد و ${toPersianDigits(failed)} ردیف خطا داشت.`
      : `${toPersianDigits(saved)} ردیف ذخیره شد.`);
  };

  const applyPatch = async (id) => {
    const letter = letterById(id);
    const draftValues = drafts[id];
    if (!letter || !draftValues) return { id, ok: false, empty: true };
    const payload = buildLetterPatch(letter, draftValues);
    if (!Object.keys(payload).length) {
      discardRow(id);
      return { id, ok: true, empty: true };
    }
    setSavingIds((previous) => (previous.includes(id) ? previous : [...previous, id]));
    try {
      await axiosInstance.patch(`/letters/${id}/`, payload);
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
      return { id, ok: true, empty: false };
    } catch (requestError) {
      const details = requestError?.response?.data;
      const firstError = details && typeof details === 'object'
        ? Object.entries(details)
          .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(' ') : value}`)[0]
        : '';
      setError(firstError || details?.detail || 'ذخیرهٔ تغییرات ردیف ممکن نشد.');
      return { id, ok: false, empty: false };
    } finally {
      setSavingIds((previous) => previous.filter((item) => item !== id));
    }
  };

  const saveRowEdit = async (id) => {
    if (!id) return;
    const result = await applyPatch(id);
    if (result.ok) setEditRowId((previous) => (previous === id ? null : previous));
    afterSave(result.ok && !result.empty ? 1 : 0, result.ok ? 0 : 1);
  };

  const saveAllEdits = async () => {
    const ids = Object.keys(drafts).map(Number);
    if (!ids.length) return;
    setBulkSaving(true);
    let saved = 0;
    let failed = 0;
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      const result = await applyPatch(id);
      if (result.ok && !result.empty) saved += 1;
      if (!result.ok) failed += 1;
    }
    setBulkSaving(false);
    setEditRowId(null);
    afterSave(saved, failed);
  };

  const rowEditing = (letter) => editRowId === letter?.id;
  const rowDirty = (letter) => Boolean(drafts[letter?.id]);
  const dirtyCount = Object.keys(drafts).length;
  const draft = (editRowId && drafts[editRowId]) || {};

  /* ---------- عملیات نامه (ثبت، ارجاع، پاسخ، بستن، بایگانی، یادداشت) ---------- */
  const letterAction = useMutation({
    mutationFn: ({ id, action, payload }) => axiosInstance
      .post(`/letters/${id}/${action}/`, payload || {})
      .then((response) => response.data),
    onSuccess: (data, variables) => {
      refreshAll();
      invalidateDetail();
      const updated = variables.action === 'refer' ? data.letter : data;
      if (updated?.id) {
        setDrawerLetter((previous) => (previous && previous.id === updated.id
          ? { ...previous, ...updated } : previous));
      }
      const messages = {
        register: 'شماره نامه ثبت شد.',
        refer: 'ارجاع نامه ثبت شد.',
        archive: 'نامه بایگانی شد.',
        close: 'پروندهٔ نامه بسته شد.',
        comment: 'یادداشت ثبت شد.',
      };
      setToast(messages[variables.action] || 'عملیات انجام شد.');
      setError('');
      if (variables.action === 'comment') setComment('');
    },
    onError: (err) => setError(err?.response?.data?.detail || 'انجام عملیات ممکن نشد.'),
  });

  const referralComplete = useMutation({
    mutationFn: ({ id, payload }) => axiosInstance
      .post(`/letter-referrals/${id}/complete/`, payload)
      .then((response) => response.data),
    onSuccess: () => {
      refreshAll();
      invalidateDetail();
      setToast('پاسخ و نتیجهٔ ارجاع ثبت شد.');
      setCompleteReferral?.(null);
    },
    onError: (err) => setError(err?.response?.data?.detail || 'ثبت پاسخ ارجاع انجام نشد.'),
  });

  /** حذف نامه (فقط با مجوز حذف مکاتبات) */
  const deleteLetter = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/letters/${id}/`),
    onSuccess: () => {
      refreshAll();
      setDrawerLetter(null);
      setToast('نامه حذف شد.');
      setError('');
    },
    onError: (err) => setError(
      err?.response?.data?.detail || 'حذف نامه ممکن نشد (مجوز یا وابستگی).',
    ),
  });

  /** حذف پیوست (فقط با مجوز حذف مکاتبات) */
  const deleteAttachment = useMutation({
    mutationFn: (attachmentId) => axiosInstance.delete(`/letter-attachments/${attachmentId}/`),
    onSuccess: () => {
      refreshAll();
      invalidateDetail();
      setToast('پیوست حذف شد.');
      setError('');
    },
    onError: (err) => setError(err?.response?.data?.detail || 'حذف پیوست ممکن نشد.'),
  });

  /** بارگذاری پیوست برای نامهٔ باز‌شده در کشوی جزئیات */
  const uploadAttachment = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !activeLetterId) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('title', file.name);
      body.append('kind', 'attachment');
      await axiosInstance.post(`/letters/${activeLetterId}/attachments/`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await qc.invalidateQueries({ queryKey: ['correspondence-letter', activeLetterId] });
      refreshAll();
      setToast('پیوست بارگذاری شد.');
    } catch (err) {
      setError('بارگذاری پیوست انجام نشد.');
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = '';
    }
  };

  return {
    applyPatch,
    bulkSaving,
    deleteAttachment,
    deleteLetter,
    discardAll,
    discardRow,
    dirtyCount,
    draft,
    editRowId,
    letterAction,
    patchDraft,
    referralComplete,
    refreshAll,
    rowDirty,
    rowEditing,
    saveAllEdits,
    saveRowEdit,
    savingIds,
    startRowEdit,
    uploadAttachment,
    uploadRef,
    uploading,
  };
};

export default useLetterMutations;
