/**
 * نواقص قراردادها — پایش کامل بودن پروندهٔ هر قرارداد (استودیو تم).
 *
 * داده از یک اندپوینت تجمیعی می‌آید: `GET /api/external-contracts/completeness/`
 * (فیلدهای خالی، مدارک، درصد پروژه، تاریخ‌ها، مالی و تضامین). فیلترها سمت سرور
 * اعمال می‌شوند و شاخص‌ها روی کل قراردادها محاسبه می‌شوند.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Grid, MenuItem, Stack, TextField, Typography, alpha,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import RefreshIcon from '@mui/icons-material/Refresh';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import axiosInstance from '../core/api/axiosConfig';
import PageHeader from '../core/components/ui/PageHeader';
import { INK, MUTED } from '../pages/accounting/AccountingDashboardUI';
import { formatPersianNumber, formatPersianPercent, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import { printElement } from '../core/print/printEngine';
import {
  ModulePager, ModuleTable, useModuleTableState, useModuleTheme, useRowHeight,
} from './contracts/contractModuleUi';
import {
  AMBER, EmptyNote, MetricTile, Panel, RED, SLATE, StatRow, Track, VIOLET, money, num,
} from './contracts/contractsDashboardKit';

const SEVERITY_META = {
  high: { label: 'بحرانی', color: RED },
  medium: { label: 'متوسط', color: AMBER },
  low: { label: 'کم', color: SLATE },
};

const GROUP_LABELS = {
  fields: 'فیلدهای ناقص',
  documents: 'مدارک',
  dates: 'تاریخ‌ها',
  financial: 'مالی',
  project: 'پروژه و درصد تخصیص',
  guarantees: 'تضامین',
  party: 'طرف حساب',
};

const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

const SeverityChip = ({ severity, count }) => {
  const meta = SEVERITY_META[severity] || SEVERITY_META.low;
  return (
    <Chip size="small" label={count != null ? `${meta.label} (${toPersianDigits(count)})` : meta.label}
      sx={{
        height: 22, fontSize: 11, fontWeight: 800, color: meta.color,
        bgcolor: alpha(meta.color, 0.1), border: `1px solid ${alpha(meta.color, 0.28)}`,
      }} />
  );
};

/** امتیاز سلامت پرونده (۰ تا ۱۰۰) */
const ScoreBar = ({ score }) => {
  const value = Math.max(0, Math.min(100, num(score)));
  const color = value >= 80 ? '#0f766e' : (value >= 50 ? AMBER : RED);
  return (
    <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.6}>
      <Typography sx={{
        fontSize: 11, fontWeight: 900, color,
        fontFamily: 'var(--hrms-table-number-font, inherit)',
      }}>
        {formatPersianPercent(value)}
      </Typography>
      <Box sx={{ width: 34, flexShrink: 0 }}>
        <Track value={value} color={color} height={5} />
      </Box>
    </Stack>
  );
};

const ContractsCompletenessPage = () => {
  const navigate = useNavigate();
  const moduleTheme = useModuleTheme();
  const [severity, setSeverity] = useState('');
  const [group, setGroup] = useState('');
  const [code, setCode] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);

  const params = useMemo(() => {
    const next = {};
    if (severity) next.severity = severity;
    if (group) next.group = group;
    if (code) next.code = code;
    if (search.trim()) next.search = search.trim();
    return next;
  }, [severity, group, code, search]);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['contracts-completeness', params],
    queryFn: () => axiosInstance.get('/external-contracts/completeness/', { params })
      .then((response) => response.data),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const payload = data || {};
  const summary = payload.summary || {};
  const severityCounts = summary.severity || {};
  const rules = summary.by_code || [];
  const rows = payload.contracts || [];

  const pageSize = moduleTheme.tableTheme.rowsPerPage;
  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(
    rows.length, pageSize, [severity, group, code, search],
  );
  const pagedRows = rows.slice(page * pageSize, (page + 1) * pageSize);
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, pagedRows.length);

  const resetFilters = () => {
    setSeverity('');
    setGroup('');
    setCode('');
    setSearch('');
  };

  const activeFilters = [severity, group, code, search.trim()].filter(Boolean).length;

  if (isLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ pb: 1 }} ref={tableRef}>
      <PageHeader
        icon={<FactCheckIcon />}
        title="نواقص قراردادها"
        subtitle="پایش کامل بودن پروندهٔ قراردادها: فیلدهای خالی، مدارک، درصد تخصیص پروژه، تاریخ‌ها، مالی و تضامین"
        badge={(
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
            <Chip size="small"
              label={`${formatPersianNumber(summary.with_issues || 0)} دارای نقص`}
              sx={{ height: 23, fontWeight: 800, bgcolor: alpha(RED, 0.1), color: RED }} />
            <Chip size="small"
              label={`${formatPersianNumber(summary.clean || 0)} سالم`}
              sx={{ height: 23, fontWeight: 800, bgcolor: alpha('#0f766e', 0.1), color: '#0f766e' }} />
            <Chip size="small"
              label={`میانگین امتیاز ${formatPersianPercent(summary.avg_score ?? 100)}`}
              sx={{ height: 23, fontWeight: 800, bgcolor: alpha(AMBER, 0.1), color: AMBER }} />
          </Stack>
        )}
        actions={(
          <>
            <Button size="small" variant="outlined" startIcon={<RefreshIcon />}
              disabled={isFetching} onClick={() => refetch()}>
              به‌روزرسانی
            </Button>
            <Button size="small" variant="outlined" startIcon={<PrintOutlinedIcon />}
              onClick={() => printElement('main', { title: 'نواقص قراردادها', orientation: 'landscape' })}>
              چاپ
            </Button>
          </>
        )}
      />

      {isError ? (
        <Alert severity="error" sx={{ mb: 1.25, borderRadius: '12px', fontSize: 12 }}
          action={<Button size="small" onClick={() => refetch()}>تلاش دوباره</Button>}>
          دادهٔ نواقص قراردادها دریافت نشد.
        </Alert>
      ) : null}

      {/* ---- نوار شاخص‌ها ---- */}
      <Box sx={{
        display: 'grid', gap: 1.25, mb: 1.5,
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))',
        },
      }}>
        <MetricTile theme={moduleTheme} icon={FactCheckIcon} label="کل قراردادها"
          value={formatPersianNumber(payload.total_contracts || 0)} suffix="قرارداد"
          hint={`امتیاز سلامت میانگین ${formatPersianPercent(summary.avg_score ?? 100)}`}
          color={AMBER} />
        <MetricTile theme={moduleTheme} icon={FactCheckIcon} label="دارای نقص"
          value={formatPersianNumber(summary.with_issues || 0)} suffix="قرارداد"
          hint={`${formatPersianNumber(summary.issues_total || 0)} نقص ثبت‌شده`}
          color={RED} onClick={() => { setSeverity(''); setGroup(''); setCode(''); }} />
        <MetricTile theme={moduleTheme} icon={FactCheckIcon} label="بدون مدرک"
          value={formatPersianNumber((rules.find((row) => row.code === 'no_documents') || {}).count || 0)}
          suffix="قرارداد"
          hint="هیچ مدرکی بارگذاری نشده"
          color={SLATE} onClick={() => { setCode('no_documents'); setSeverity(''); setGroup(''); }} />
        <MetricTile theme={moduleTheme} icon={FactCheckIcon} label="بدون درصد پروژه"
          value={formatPersianNumber(
            ((rules.find((row) => row.code === 'project_share_missing') || {}).count || 0)
            + ((rules.find((row) => row.code === 'no_project') || {}).count || 0),
          )}
          suffix="قرارداد"
          hint="تخصیص پروژه مشخص نشده"
          color={AMBER} onClick={() => { setGroup('project'); setSeverity(''); setCode(''); }} />
        <MetricTile theme={moduleTheme} icon={FactCheckIcon} label="فیلدهای ناقص"
          value={formatPersianNumber(
            (rules.filter((row) => row.group === 'fields'))
              .reduce((sum, row) => sum + num(row.count), 0),
          )}
          suffix="مورد"
          hint={`${formatPersianNumber(rules.length)} نوع نقص شناسایی‌شده`}
          color={VIOLET} onClick={() => { setGroup('fields'); setSeverity(''); setCode(''); }} />
      </Box>

      {/* ---- فیلترها ---- */}
      <Panel theme={moduleTheme} icon={FactCheckIcon} color={AMBER}
        title="فیلتر نواقص" hint={activeFilters ? `${formatPersianNumber(activeFilters)} فیلتر فعال` : 'بدون فیلتر'}
        sx={{ mb: 1.5 }}>
        <Grid container spacing={1.25}>
          <Grid item xs={12} md={3}>
            <TextField size="small" fullWidth label="جست‌وجو" value={search}
              placeholder="شماره، موضوع، طرف حساب، پروژه…"
              onChange={(event) => setSearch(event.target.value)} />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField size="small" select fullWidth label="شدت" value={severity}
              onChange={(event) => setSeverity(event.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {Object.entries(SEVERITY_META).map(([key, meta]) => (
                <MenuItem key={key} value={key}>
                  {`${meta.label} (${formatPersianNumber(severityCounts[key] || 0)})`}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField size="small" select fullWidth label="گروه" value={group}
              onChange={(event) => setGroup(event.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {(summary.by_group || []).map((row) => (
                <MenuItem key={row.group} value={row.group}>
                  {`${GROUP_LABELS[row.group] || row.label} (${formatPersianNumber(row.count)})`}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField size="small" select fullWidth label="نوع نقص" value={code}
              onChange={(event) => setCode(event.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {rules.map((row) => (
                <MenuItem key={row.code} value={row.code}>
                  {`${row.label} (${formatPersianNumber(row.count)})`}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="outlined" onClick={resetFilters} disabled={!activeFilters}
              sx={{ height: 40 }}>
              پاک‌کردن فیلترها
            </Button>
          </Grid>
        </Grid>
        <Divider sx={{ my: 1.25 }} />
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          {(['high', 'medium', 'low']).map((key) => (
            <Box key={key} role="button" tabIndex={0} sx={{ cursor: 'pointer' }}
              onClick={() => setSeverity(severity === key ? '' : key)}>
              <SeverityChip severity={key} count={severityCounts[key] || 0} />
            </Box>
          ))}
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontSize: 11, color: MUTED }}>
            {`${formatPersianNumber(payload.filtered_total || 0)} قرارداد با فیلتر جاری`}
          </Typography>
        </Stack>
      </Panel>


      {/* ---- فهرست قراردادها با نواقص ---- */}
      <Panel theme={moduleTheme} icon={FactCheckIcon} color={RED}
        title="قراردادهای نیازمند تکمیل" hint={`${formatPersianNumber(rows.length)} ردیف`}
        ariaLabel="فهرست نواقص قراردادها"
        sx={{ mb: 1 }}>
        {rows.length ? (
          <>
            <ModuleTable
              tableTheme={{ ...moduleTheme.tableTheme, singleLine: true }}
              ariaLabel="جدول نواقص قراردادها"
              containerRef={tableRef}
              tableHeight={tableHeight}
              rowHeight={rowHeight}
              dimmed={isFetching}
              rows={pagedRows}
              rowKey={(row) => row.id}
              onRowClick={(row) => setDetail(row)}
              emptyText="قراردادی با این شرایط پیدا نشد."
              minWidth={980}
              tableLayout="fixed"
              columns={[
                {
                  key: 'number', label: 'شماره قرارداد', width: '14%',
                  render: (row) => (
                    <Typography noWrap sx={{
                      fontSize: 11.5, fontWeight: 900, color: INK,
                      fontFamily: 'var(--hrms-table-number-font, inherit)',
                    }}>
                      {row.number ? toPersianDigits(row.number) : `#${toPersianDigits(row.id)}`}
                    </Typography>
                  ),
                },
                {
                  key: 'party', label: 'طرف حساب', width: '24%',
                  render: (row) => (
                    <Typography noWrap title={row.party_name} sx={{ fontSize: 11.5, fontWeight: 700 }}>
                      {row.party_name || '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'subject', label: 'موضوع', width: '36%',
                  render: (row) => (
                    <Typography noWrap title={row.subject} sx={{ fontSize: 11.5, color: INK }}>
                      {row.subject || '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'score', label: 'امتیاز', width: '12%', align: 'center',
                  render: (row) => <ScoreBar score={row.score} />,
                },
                {
                  key: 'actions', label: 'ویرایش پرونده', width: '14%', align: 'center',
                  render: (row) => (
                    <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />}
                      aria-label="ویرایش پرونده"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/external-contracts/${row.id}`);
                      }}
                      sx={{ fontSize: 10.5, py: 0.15, px: 1, whiteSpace: 'nowrap' }}>
                      ویرایش پرونده
                    </Button>
                  ),
                },
              ]}
            />
            <ModulePager
              tableTheme={moduleTheme.tableTheme}
              page={page}
              onPage={setPage}
              totalPages={totalPages}
              pageNumbers={pageNumbers}
              total={rows.length}
              pageSize={pageSize}
              unit="قرارداد"
            />
          </>
        ) : (
          <EmptyNote icon={FactCheckIcon} text="با فیلترهای فعلی، قرارداد دارای نقصی پیدا نشد." />
        )}
      </Panel>


      {/* ---- دیالوگ جزئیات نواقص یک قرارداد ---- */}
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
          fontWeight: 900, color: INK, borderBottom: '1px solid', borderColor: 'divider',
          display: 'flex', alignItems: 'center', gap: 1,
        }}>
          <FactCheckIcon sx={{ color: RED, fontSize: 20 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 900 }}>
              {detail?.number
                ? `قرارداد ${toPersianDigits(detail.number)}`
                : `قرارداد #${toPersianDigits(detail?.id || '')}`}
            </Typography>
            <Typography noWrap sx={{ fontSize: 11, color: MUTED }}>{detail?.subject || '—'}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          {detail ? (
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                {detail.issues.map((issue) => (
                  <SeverityChip key={issue.code} severity={issue.severity} />
                ))}
                <Chip size="small" label={`امتیاز ${formatPersianPercent(detail.score)}`}
                  sx={{ height: 22, fontSize: 11, fontWeight: 800, color: INK, bgcolor: alpha(INK, 0.06) }} />
              </Stack>
              <Divider />
              {Object.entries(
                detail.issues.reduce((acc, issue) => {
                  (acc[issue.group] = acc[issue.group] || []).push(issue);
                  return acc;
                }, {}),
              ).map(([groupKey, groupIssues]) => (
                <Box key={groupKey}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 900, color: MUTED, mb: 0.5 }}>
                    {GROUP_LABELS[groupKey] || groupKey}
                  </Typography>
                  <Stack spacing={0.5}>
                    {groupIssues.map((issue) => {
                      const meta = SEVERITY_META[issue.severity] || SEVERITY_META.low;
                      return (
                        <Box key={issue.code} sx={{
                          p: 0.8, borderRadius: '10px', border: '1px solid',
                          borderColor: alpha(meta.color, 0.22), bgcolor: alpha(meta.color, 0.04),
                        }}>
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: meta.color }} />
                            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: INK, flex: 1 }}>
                              {issue.label}
                            </Typography>
                            <Typography sx={{ fontSize: 10, color: meta.color, fontWeight: 800 }}>
                              {meta.label}
                            </Typography>
                          </Stack>
                          {issue.detail ? (
                            <Typography sx={{ mt: 0.3, fontSize: 10.5, color: MUTED }}>
                              {issue.detail}
                            </Typography>
                          ) : null}
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              ))}
              <Divider />
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <StatRow label="طرف حساب" value={detail.party_name || '—'} />
                </Grid>
                <Grid item xs={6}>
                  <StatRow label="پروژه" value={detail.project_name || '—'} />
                </Grid>
                <Grid item xs={6}>
                  <StatRow label="مبلغ قرارداد" value={detail.amount ? money(detail.amount) : '—'} />
                </Grid>
                <Grid item xs={6}>
                  <StatRow label="تاریخ پایان" value={dateLabel(detail.end_date)} />
                </Grid>
              </Grid>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDetail(null)}>بستن</Button>
          <Button variant="contained" disabled={!detail}
            onClick={() => { navigate(`/external-contracts/${detail.id}`); }}
>
            باز کردن پروندهٔ قرارداد
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractsCompletenessPage;

