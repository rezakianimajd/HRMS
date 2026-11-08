/** استعلام‌های خرید (RFQ) — فهرست، ثبت استعلام و ورود به مقایسهٔ پیشنهادها. */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../core/api/axiosConfig';
import { Alert, Box, Button, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import {
  ACCENT_DARK, AddRowButton, DANGER, DialogShell, FONT, Field, FormGrid, INFO, OK, SimpleTable,
  SectionShell, StatusChip, TD, TH, WARN, dateLabel, digits, money, num, todayIso, useList,
} from './procurementUi';

const STATUS_MAP = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  sent: { label: 'ارسال‌شده', color: INFO },
  open: { label: 'باز', color: OK },
  evaluating: { label: 'در حال ارزیابی', color: WARN },
  awarded: { label: 'برنده انتخاب شد', color: '#8b5cf6' },
  cancelled: { label: 'لغو‌شده', color: DANGER },
};

const EMPTY_LINE = { description: '', specification: '', quantity: 1, target_unit_price: 0 };

const EMPTY_FORM = {
  subject: '', department: '', date: todayIso(), deadline: '', project: '',
  description: '', terms: '', lines: [{ ...EMPTY_LINE }],
};

const ProcurementInquiriesPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const params = useMemo(
    () => ({ page_size: 200, ...(search ? { search } : {}), ...(status ? { status } : {}) }),
    [search, status],
  );
  const { rows, loading, error, reload } = useList('/procurement/inquiries/', params);
  const projects = useList('/projects/', { page_size: 300 });

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  const projectOptions = useMemo(
    () => (projects.rows || []).map((project) => ({
      value: project.id,
      label: project.name || project.title || project.code || `پروژه ${project.id}`,
    })),
    [projects.rows],
  );

  const patch = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const patchLine = (index, key, value) => setForm((previous) => ({
    ...previous,
    lines: previous.lines.map((line, position) => (
      position === index ? { ...line, [key]: value } : line
    )),
  }));

  const submit = () => {
    setFormError('');
    if (!form.subject.trim()) { setFormError('موضوع استعلام الزامی است.'); return; }
    const lines = form.lines
      .filter((line) => String(line.description || '').trim())
      .map((line) => ({
        description: line.description,
        specification: line.specification || '',
        quantity: num(line.quantity) || 1,
        target_unit_price: num(line.target_unit_price),
      }));
    setSaving(true);
    axiosInstance.post('/procurement/inquiries/', {
      subject: form.subject,
      department: form.department,
      date: form.date || todayIso(),
      deadline: form.deadline || null,
      project: form.project || null,
      description: form.description,
      terms: form.terms,
      status: 'draft',
      lines,
    })
      .then(() => { setFormOpen(false); setForm(EMPTY_FORM); reload(); })
      .catch((err) => setFormError(err?.response?.data?.detail || 'ثبت استعلام ناموفق بود.'))
      .finally(() => setSaving(false));
  };

  const removeInquiry = (row) => {
    setActionError('');
    if (!window.confirm(`حذف استعلام «${row.subject}»؟`)) return;
    axiosInstance.delete(`/procurement/inquiries/${row.id}/`)
      .then(reload)
      .catch((err) => setActionError(err?.response?.data?.detail || 'حذف ناموفق بود.'));
  };

  const headers = [
    <TH key="n">شماره</TH>, <TH key="s">موضوع</TH>, <TH key="p">پروژه / واحد</TH>,
    <TH key="d">مهلت</TH>, <TH key="q">پیشنهادها</TH>, <TH key="a">برآورد</TH>,
    <TH key="st">وضعیت</TH>, <TH key="o" align="center">عملیات</TH>,
  ];

  return (
    <SectionShell
      icon={<RequestQuoteIcon />}
      title="استعلام‌های خرید (RFQ)"
      subtitle="ثبت استعلام، دعوت تأمین‌کنندگان و مقایسهٔ پیشنهادها"
      loading={loading}
      error={error || actionError}
      actions={(
        <>
          <TextField size="small" placeholder="جست‌وجو در استعلام‌ها…" value={search}
            onChange={(event) => setSearch(event.target.value)} sx={{ width: 210, fontFamily: FONT }} />
          <TextField size="small" select value={status} label="وضعیت"
            onChange={(event) => setStatus(event.target.value)} sx={{ width: 150, fontFamily: FONT }}>
            <MenuItem value="" sx={{ fontFamily: FONT, fontSize: 13 }}>همه</MenuItem>
            {Object.entries(STATUS_MAP).map(([key, meta]) => (
              <MenuItem key={key} value={key} sx={{ fontFamily: FONT, fontSize: 13 }}>{meta.label}</MenuItem>
            ))}
          </TextField>
          <Button variant="contained" size="small" startIcon={<AddIcon fontSize="small" />}
            onClick={() => { setForm(EMPTY_FORM); setFormError(''); setFormOpen(true); }}
            sx={{ bgcolor: ACCENT_DARK, fontFamily: FONT }}>
            استعلام جدید
          </Button>
        </>
      )}
    >
      <SimpleTable head={headers} emptyText="استعلامی ثبت نشده است.">
        {rows.map((row) => (
          <tr key={row.id}>
            <TD bold>{digits(row.number || '—')}</TD>
            <TD bold>{row.subject}</TD>
            <TD>{row.project_name || row.department || '—'}</TD>
            <TD>{dateLabel(row.deadline)}</TD>
            <TD align="center">{digits(row.quotation_count || 0)}</TD>
            <TD>{row.estimated_total ? money(row.estimated_total) : '—'}</TD>
            <TD><StatusChip status={row.status} map={STATUS_MAP} /></TD>
            <TD align="center">
              <Stack direction="row" spacing={0.5} justifyContent="center">
                <Tooltip title="مقایسهٔ پیشنهادها">
                  <IconButton size="small"
                    onClick={() => navigate(`/procurement/inquiries/${row.id}/comparison`)}>
                    <CompareArrowsIcon fontSize="small" sx={{ color: INFO }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="حذف">
                  <IconButton size="small" onClick={() => removeInquiry(row)}>
                    <DeleteIcon fontSize="small" sx={{ color: DANGER }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </TD>
          </tr>
        ))}
      </SimpleTable>

      <DialogShell open={formOpen} title="ثبت استعلام خرید" maxWidth="md" onClose={() => setFormOpen(false)}
        onSubmit={submit} loading={saving} error={formError} submitLabel="ثبت استعلام">
        <FormGrid>
          <Field size={8} label="موضوع استعلام" required value={form.subject}
            onChange={(event) => patch('subject', event.target.value)} />
          <Field size={4} label="واحد درخواست‌کننده" value={form.department}
            onChange={(event) => patch('department', event.target.value)} />
          <Field size={4} label="تاریخ استعلام" type="date" value={form.date}
            onChange={(event) => patch('date', event.target.value)} />
          <Field size={4} label="مهلت دریافت پیشنهاد" type="date" value={form.deadline}
            onChange={(event) => patch('deadline', event.target.value)} />
          <Field size={4} label="پروژه" select options={projectOptions} value={form.project}
            onChange={(event) => patch('project', event.target.value)} />
          <Field size={12} label="شرح / مشخصات کلی" value={form.description}
            onChange={(event) => patch('description', event.target.value)} />
          <Field size={12} label="شرایط استعلام" value={form.terms}
            onChange={(event) => patch('terms', event.target.value)} />
        </FormGrid>

        <Box sx={{ mt: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontFamily: FONT, fontWeight: 900, fontSize: 13 }}>
              اقلام استعلام ({digits(form.lines.length)})
            </Typography>
            <AddRowButton onClick={() => setForm((previous) => ({
              ...previous, lines: [...previous.lines, { ...EMPTY_LINE }],
            }))} />
          </Stack>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {form.lines.map((line, index) => (
              <Box key={index} sx={{ display: 'grid', gridTemplateColumns: '3fr 3fr 1fr 1.3fr auto', gap: 1 }}>
                <TextField size="small" label="شرح کالا / خدمت" value={line.description}
                  onChange={(event) => patchLine(index, 'description', event.target.value)} />
                <TextField size="small" label="مشخصات فنی" value={line.specification}
                  onChange={(event) => patchLine(index, 'specification', event.target.value)} />
                <TextField size="small" type="number" label="مقدار" value={line.quantity}
                  onChange={(event) => patchLine(index, 'quantity', event.target.value)} />
                <TextField size="small" type="number" label="قیمت هدف" value={line.target_unit_price}
                  onChange={(event) => patchLine(index, 'target_unit_price', event.target.value)} />
                <IconButton size="small" disabled={form.lines.length === 1}
                  onClick={() => setForm((previous) => ({
                    ...previous, lines: previous.lines.filter((_item, position) => position !== index),
                  }))}>
                  <DeleteIcon fontSize="small" sx={{ color: DANGER }} />
                </IconButton>
              </Box>
            ))}
          </Stack>
          <Alert severity="info" sx={{ mt: 1.5, fontFamily: FONT }}>
            برآورد کل: {money(form.lines.reduce(
              (total, line) => total + num(line.quantity) * num(line.target_unit_price), 0,
            ))}
          </Alert>
        </Box>
      </DialogShell>
    </SectionShell>
  );
};

export default ProcurementInquiriesPage;
