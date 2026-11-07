import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Avatar, Box, Button, Checkbox,
  Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControlLabel, Grid, IconButton, InputAdornment, MenuItem, Paper, Stack, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip,
  Typography, alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import BusinessIcon from '@mui/icons-material/Business';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupsIcon from '@mui/icons-material/Groups';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SecurityIcon from '@mui/icons-material/Security';
import SaveIcon from '@mui/icons-material/Save';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import axiosInstance from '../core/api/axiosConfig';
import {
  PageHeader, StatGrid, SURFACE, SOFT, TabsCard,
} from '../core/components/settings/settingsUi';
import EmployeePicker from '../core/components/ui/EmployeePicker';
import UserAvatar from '../core/components/ui/UserAvatar';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const USERS_API = '/users/';
const CATALOG_API = '/users/access/catalog/';
const APPS_API = '/applications/catalog/';
const EMPLOYEES_API = '/employees/';

const ACTION_TONE = {
  view: SOFT.blue,
  create: SOFT.green,
  edit: SOFT.amber,
  delete: SOFT.pink,
  approve: SOFT.violet,
  export: SOFT.teal,
};

const employeeLine = (user) => {
  const position = user.employee_position || '';
  const department = user.employee_department || '';
  if (position && department) return `${position} · ${department}`;
  return position || department || '';
};

const lastLogin = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

const ADMIN_Chip = () => (
  <Chip
    size="small"
    icon={<AdminPanelSettingsIcon sx={{ fontSize: 13 }} />}
    label="مدیر سیستم"
    sx={{
      height: 22, fontSize: 10, fontWeight: 800,
      bgcolor: alpha(SOFT.violet, 0.14), color: SOFT.violet,
      border: `1px solid ${alpha(SOFT.violet, 0.3)}`,
      '& .MuiChip-label': { px: 0.8 },
    }}
  />
);

const CountChip = ({ value, label, color = SOFT.green }) => (
  <Chip
    size="small"
    label={`${formatPersianNumber(value)} ${label}`}
    sx={{
      height: 22, fontSize: 10, fontWeight: 800,
      bgcolor: alpha(color, 0.12), color,
      '& .MuiChip-label': { px: 0.8 },
    }}
  />
);

const StatPill = ({ icon, label, value, color = SOFT.indigo }) => (
  <Stack direction="row" spacing={0.75} alignItems="center"
    sx={{ px: 1, py: 0.5, borderRadius: '10px', bgcolor: alpha(color, 0.08), color }}>
    {icon}
    <Typography sx={{ fontSize: 10.5, fontWeight: 800 }}>{label}</Typography>
    <Typography sx={{ fontSize: 11.5, fontWeight: 900 }}>{value}</Typography>
  </Stack>
);

const moduleCodes = (module) => module.groups.flatMap(
  (group) => group.items.flatMap((item) => Object.values(item.codes)),
);

/* ─────────────────────────── تب کاربران ─────────────────────────── */
const EMPTY_USER = {
  username: '', first_name: '', last_name: '', email: '', password: '',
  employee_id: null, application_ids: [], full_access: false,
};

const UserEditDialog = ({
  open, onClose, user, apps, employees, employeesLoading, onCreate, onUpdate,
}) => {
  const [form, setForm] = useState(EMPTY_USER);
  const accent = SOFT.indigo;

  React.useEffect(() => {
    if (!open) return;
    setForm(user ? {
      username: user.username || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      password: '',
      employee_id: user.employee_id || null,
      application_ids: user.applications || [],
      full_access: Boolean(user.is_full_access),
    } : EMPTY_USER);
  }, [open, user]);

  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const saving = onCreate.isPending || onUpdate.isPending;
  const linkedEmployee = employees.find((row) => row.id === form.employee_id);

  const submit = () => {
    const body = { ...form };
    if (!body.password) delete body.password;
    if (user) onUpdate.mutate({ id: user.id, body });
    else onCreate.mutate(body);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 14, fontWeight: 900 }}>
        {user ? 'ویرایش کاربر' : 'کاربر جدید'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25} sx={{ pt: 0.5 }}>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="نام کاربری *" value={form.username}
                onChange={(event) => set('username', event.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="ایمیل" value={form.email}
                onChange={(event) => set('email', event.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="نام" value={form.first_name}
                onChange={(event) => set('first_name', event.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="نام خانوادگی" value={form.last_name}
                onChange={(event) => set('last_name', event.target.value)} />
            </Grid>
            {!user ? (
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="گذرواژه *" type="password"
                  value={form.password}
                  onChange={(event) => set('password', event.target.value)} />
              </Grid>
            ) : null}
          </Grid>

          <FormControlLabel
            control={(
              <Switch
                size="small"
                checked={form.full_access}
                disabled={Boolean(user?.is_superuser)}
                onChange={(event) => set('full_access', event.target.checked)}
              />
            )}
            label={(
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 800 }}>
                  مدیر سیستم (دسترسی کامل به همهٔ ماژول‌ها و عملیات)
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                  برای سایر پرسنل، مجوزها را در تب «مجوزهای کاربران» تک‌تک تعیین کنید.
                </Typography>
              </Box>
            )}
          />


          <Stack direction="row" spacing={1.25} alignItems="center">
            <UserAvatar
              user={{
                employee_photo: linkedEmployee?.photo_url,
                employee_name: linkedEmployee?.full_name,
                first_name: form.first_name,
                last_name: form.last_name,
                username: form.username,
              }}
              size={44}
              sx={{ bgcolor: alpha(accent, 0.12), color: accent, flexShrink: 0 }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 800 }}>
                اتصال به پروندهٔ پرسنلی (عنوان شغلی نمایش داده می‌شود)
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                برای اینکه عنوان شغلی و دپارتمان پرسنل کنار نام کاربر بیاید.
              </Typography>
            </Box>
          </Stack>
          <EmployeePicker
            employees={employees}
            value={form.employee_id}
            onChange={(employeeId) => set('employee_id', employeeId)}
            accent={accent}
            loading={employeesLoading}
          />

          <Divider />
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.secondary' }}>
            ماژول‌های مجاز (خالی یعنی همهٔ ماژول‌هایی که مجوز دارند)
          </Typography>
          <Grid container spacing={1}>
            {apps.map((app) => {
              const checked = form.application_ids.includes(app.id);
              return (
                <Grid item xs={12} sm={6} key={app.id}>
                  <Paper
                    onClick={() => set(
                      'application_ids',
                      checked
                        ? form.application_ids.filter((id) => id !== app.id)
                        : [...form.application_ids, app.id],
                    )}
                    sx={{
                      p: 1, borderRadius: '12px', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', gap: 1, border: '1px solid',
                      borderColor: checked ? `${app.color || accent}66` : 'divider',
                      bgcolor: checked ? `${app.color || accent}12` : 'background.paper',
                    }}
                  >
                    <Avatar variant="rounded" sx={{
                      width: 26, height: 26, borderRadius: '8px', fontSize: 13,
                      bgcolor: `${app.color || accent}1f`, color: app.color || accent,
                    }}>
                      {app.icon || <BusinessIcon sx={{ fontSize: 14 }} />}
                    </Avatar>
                    <Typography sx={{ fontSize: 11, fontWeight: 700 }} noWrap>
                      {app.label || app.name}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>انصراف</Button>
        <Button variant="contained" startIcon={<SaveIcon />} disabled={saving}
          onClick={submit}
          sx={{ bgcolor: accent, boxShadow: 'none', '&:hover': { bgcolor: accent } }}>
          {user ? 'ذخیره تغییرات' : 'ساخت کاربر'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};


const UsersTab = ({ apps, onMessage, onOpenAccess }) => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const usersQuery = useQuery({
    queryKey: ['access-users'],
    queryFn: () => axiosInstance.get(USERS_API).then((response) => response.data),
  });
  const employeesQuery = useQuery({
    queryKey: ['employees-lite'],
    queryFn: () => axiosInstance.get(EMPLOYEES_API, { params: { page_size: 500 } })
      .then((response) => response.data),
    staleTime: 300_000,
  });

  const rawUsers = usersQuery.data;
  const users = Array.isArray(rawUsers) ? rawUsers : (rawUsers?.results || []);
  const employees = Array.isArray(employeesQuery.data)
    ? employeesQuery.data
    : (employeesQuery.data?.results || []);

  const refresh = () => qc.invalidateQueries({ queryKey: ['access-users'] });

  const create = useMutation({
    mutationFn: (body) => axiosInstance.post('/users/create/', body),
    onSuccess: () => {
      refresh();
      setDialogOpen(false);
      onMessage({ type: 'success', text: 'کاربر جدید ساخته شد.' });
    },
    onError: (error) => onMessage({
      type: 'error', text: error?.response?.data?.error || 'ساخت کاربر انجام نشد.',
    }),
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => axiosInstance.post(`/users/${id}/update/`, body),
    onSuccess: () => {
      refresh();
      setDialogOpen(false);
      onMessage({ type: 'success', text: 'اطلاعات کاربر ذخیره شد.' });
    },
    onError: (error) => onMessage({
      type: 'error', text: error?.response?.data?.error || 'ذخیره انجام نشد.',
    }),
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.post(`/users/${id}/delete/`),
    onSuccess: () => {
      refresh();
      onMessage({ type: 'success', text: 'کاربر غیرفعال شد.' });
    },
    onError: (error) => onMessage({
      type: 'error', text: error?.response?.data?.error || 'غیرفعال‌سازی انجام نشد.',
    }),
  });

  const filtered = users.filter((user) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [
      user.username, user.full_name, user.first_name, user.last_name,
      user.email, user.employee_position, user.employee_department,
    ].filter(Boolean).join(' ').toLowerCase().includes(term);
  });

  return (
    <Box>
      <Paper elevation={0} sx={{ ...SURFACE, p: 1.25, mb: 1.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center"
          useFlexGap flexWrap="wrap">
          <TextField
            size="small"
            placeholder="جست‌وجوی نام، نام کاربری، عنوان شغلی…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16 }} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: { xs: '100%', md: 300 } }}
          />
          <Box sx={{ flex: 1 }} />
          <StatPill icon={<GroupsIcon sx={{ fontSize: 14 }} />} label="کاربران"
            value={formatPersianNumber(users.length)} color={SOFT.indigo} />
          <Button
            size="small"
            variant="outlined"
            onClick={() => onOpenAccess(null)}
            sx={{ fontSize: 11 }}
          >
            تعیین مجوز کاربران
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            sx={{ bgcolor: SOFT.indigo, boxShadow: 'none', '&:hover': { bgcolor: SOFT.indigo } }}
          >
            کاربر جدید
          </Button>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ ...SURFACE, overflow: 'hidden' }}>
        {usersQuery.isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={22} /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{
                  '& th': { fontWeight: 800, fontSize: 11, bgcolor: alpha(SOFT.slate, 0.06) },
                }}>
                  <TableCell>کاربر</TableCell>
                  <TableCell>عنوان سازمانی (پرسنل)</TableCell>
                  <TableCell>دسترسی</TableCell>
                  <TableCell>ماژول‌های مجاز</TableCell>
                  <TableCell align="center">آخرین ورود</TableCell>
                  <TableCell align="center" width={120}>عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>

                {filtered.map((user) => {
                  const position = employeeLine(user);
                  return (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <UserAvatar user={user} size={34} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography noWrap sx={{ fontSize: 12, fontWeight: 800 }}>
                              {user.full_name || user.username}
                            </Typography>
                            <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                              {`@${user.username}`}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {position ? (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <BadgeOutlinedIcon sx={{ fontSize: 14, color: SOFT.blue }} />
                            <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>
                              {position}
                            </Typography>
                          </Stack>
                        ) : (
                          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                            به پروندهٔ پرسنلی وصل نیست
                          </Typography>
                        )}
                        {user.employee_code ? (
                          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                            {`کد پرسنلی: ${user.employee_code}`}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {user.is_full_access ? (
                          <ADMIN_Chip />
                        ) : (
                          <CountChip
                            value={typeof user.permissions_granted === 'number'
                              ? user.permissions_granted : 0}
                            label="مجوز"
                            color={SOFT.green}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {user.is_full_access ? (
                          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                            همهٔ ماژول‌ها
                          </Typography>
                        ) : (user.modules || []).length ? (
                          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                            {user.modules.slice(0, 4).map((module) => (
                              <Chip
                                key={module.slug}
                                size="small"
                                label={`${module.name} · ${formatPersianNumber(module.count)}`}
                                sx={{
                                  height: 20, fontSize: 9.5,
                                  bgcolor: alpha(module.color || SOFT.slate, 0.12),
                                  color: module.color || SOFT.slate,
                                }}
                              />
                            ))}
                            {user.modules.length > 4 ? (
                              <Chip size="small"
                                label={`+${formatPersianNumber(user.modules.length - 4)}`}
                                sx={{ height: 20, fontSize: 9.5 }} />
                            ) : null}
                          </Stack>
                        ) : (
                          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                            هنوز مجوزی تعیین نشده
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="center">
                        <Typography sx={{ fontSize: 11 }}>{lastLogin(user.last_login)}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.25} justifyContent="center">
                          <Tooltip title="مجوزهای ریز">
                            <span>
                              <IconButton size="small" disabled={user.is_superuser}
                                onClick={() => onOpenAccess(user)}>
                                <KeyOutlinedIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="ویرایش">
                            <IconButton size="small"
                              onClick={() => { setEditing(user); setDialogOpen(true); }}>
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="غیرفعال‌سازی">
                            <span>
                              <IconButton size="small" color="error"
                                disabled={remove.isPending || user.is_superuser}
                                onClick={() => {
                                  if (window.confirm(`کاربر «${user.username}» غیرفعال شود؟`)) {
                                    remove.mutate(user.id);
                                  }
                                }}>
                                <DeleteIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filtered.length ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        کاربری با این فیلترها پیدا نشد.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <UserEditDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        user={editing}
        apps={apps}
        employees={employees}
        employeesLoading={employeesQuery.isLoading}
        onCreate={create}
        onUpdate={update}
      />
    </Box>
  );
};


/* ─────────────────── تب مجوزهای کاربران (هر پرسنل مستقل) ─────────────────── */
const PermissionMatrix = ({ catalog, actions, draft, onToggleCodes, search }) => {
  const term = search.trim().toLowerCase();
  return (
    <Stack spacing={0.75}>
      {catalog.map((module) => {
        const moduleCodeList = moduleCodes(module);
        const grantedCount = moduleCodeList.filter((code) => draft[code]).length;
        const groups = module.groups
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => (
              !term
              || item.title.toLowerCase().includes(term)
              || item.path.toLowerCase().includes(term)
              || group.title.toLowerCase().includes(term)
            )),
          }))
          .filter((group) => group.items.length);
        if (!groups.length) return null;
        return (
          <Accordion key={module.slug} disableGutters elevation={0}
            sx={{
              border: '1px solid', borderColor: 'divider', borderRadius: '12px !important',
              '&:before': { display: 'none' },
            }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}
                useFlexGap flexWrap="wrap">
                <Box sx={{
                  width: 8, height: 8, borderRadius: '50%',
                  bgcolor: module.color || SOFT.slate,
                }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 900 }}>{module.name}</Typography>
                <CountChip
                  value={grantedCount}
                  label={`از ${formatPersianNumber(moduleCodeList.length)}`}
                  color={SOFT.green}
                />
                <Box sx={{ flex: 1 }} />
                <Button size="small" sx={{ fontSize: 10.5, minWidth: 0 }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleCodes(moduleCodeList, true);
                  }}>
                  انتخاب همه
                </Button>
                <Button size="small" color="inherit" sx={{ fontSize: 10.5, minWidth: 0 }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleCodes(moduleCodeList, false);
                  }}>
                  هیچ‌کدام
                </Button>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0.5 }}>

              {groups.map((group) => (
                <Box key={`${module.slug}-${group.title}`} sx={{ mb: 1 }}>
                  <Typography sx={{
                    fontSize: 10.5, fontWeight: 800, color: 'text.secondary', mb: 0.35,
                  }}>
                    {group.title}
                  </Typography>
                  <Table size="small" sx={{ '& td, & th': { py: 0.25, px: 0.75 } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: 10, fontWeight: 800 }}>منو</TableCell>
                        {actions.map((action) => (
                          <TableCell key={action.key} align="center"
                            sx={{ fontSize: 10, fontWeight: 800, width: 62 }}>
                            {action.label}
                          </TableCell>
                        ))}
                        <TableCell align="center"
                          sx={{ fontSize: 10, fontWeight: 800, width: 54 }}>
                          همه
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {group.items.map((item) => {
                        const codes = Object.values(item.codes);
                        const allChecked = codes.every((code) => draft[code]);
                        return (
                          <TableRow key={item.id} hover>
                            <TableCell>
                              <Typography sx={{ fontSize: 11, fontWeight: 700 }}>
                                {item.title}
                              </Typography>
                              <Typography sx={{ fontSize: 9.5, color: 'text.secondary' }} noWrap>
                                {item.path}
                              </Typography>
                            </TableCell>
                            {actions.map((action) => {
                              const code = item.codes[action.key];
                              if (!code) {
                                return <TableCell key={action.key} align="center">—</TableCell>;
                              }
                              return (
                                <TableCell key={action.key} align="center">
                                  <Checkbox
                                    size="small"
                                    checked={Boolean(draft[code])}
                                    onChange={(event) => onToggleCodes([code], event.target.checked)}
                                    inputProps={{ 'aria-label': `${item.title} ${action.label}` }}
                                    sx={{
                                      p: 0.25,
                                      color: alpha(ACTION_TONE[action.key] || SOFT.slate, 0.55),
                                      '&.Mui-checked': {
                                        color: ACTION_TONE[action.key] || SOFT.slate,
                                      },
                                    }}
                                  />
                                </TableCell>
                              );
                            })}
                            <TableCell align="center">
                              <Checkbox size="small" checked={allChecked}
                                indeterminate={!allChecked && codes.some((code) => draft[code])}
                                onChange={(event) => onToggleCodes(codes, event.target.checked)}
                                sx={{ p: 0.25 }} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
};


const UserAccessTab = ({ catalog, actions, initialUserId, onMessage, onSaved }) => {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(initialUserId || null);
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [draft, setDraft] = useState({});
  const [fullAccess, setFullAccess] = useState(false);

  const usersQuery = useQuery({
    queryKey: ['access-users'],
    queryFn: () => axiosInstance.get(USERS_API).then((response) => response.data),
  });
  const rawUsers = usersQuery.data;
  const users = Array.isArray(rawUsers) ? rawUsers : (rawUsers?.results || []);

  React.useEffect(() => {
    if (selectedId) return;
    const first = users.find((user) => !user.is_superuser) || users[0];
    if (first) setSelectedId(first.id);
  }, [users, selectedId]);

  const accessQuery = useQuery({
    queryKey: ['user-access', selectedId],
    queryFn: () => axiosInstance.get(`${USERS_API}${selectedId}/access/`)
      .then((response) => response.data),
    enabled: Boolean(selectedId),
    staleTime: 15_000,
  });

  const accessData = accessQuery.data;
  React.useEffect(() => {
    if (!accessData) return;
    setDraft({ ...(accessData.permissions || {}) });
    setFullAccess(Boolean(accessData.full_access));
  }, [accessData]);

  const selectedUser = users.find((user) => user.id === selectedId);
  const granted = Object.values(draft).filter(Boolean).length;
  const totalCodes = useMemo(
    () => catalog.reduce((sum, module) => sum + moduleCodes(module).length, 0),
    [catalog],
  );
  const readOnly = Boolean(selectedUser?.is_superuser);

  const toggleCodes = (codes, value) => {
    setDraft((previous) => {
      const next = { ...previous };
      codes.forEach((code) => { next[code] = value; });
      return next;
    });
  };

  const save = useMutation({
    mutationFn: () => axiosInstance.post(
      `${USERS_API}${selectedId}/access/`,
      { permissions: fullAccess ? {} : draft, full_access: fullAccess },
    ),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['access-users'] });
      qc.invalidateQueries({ queryKey: ['user-access', selectedId] });
      if (onSaved) onSaved();
      onMessage({ type: 'success', text: response.data?.message || 'مجوزها ذخیره شد.' });
    },
    onError: (error) => onMessage({
      type: 'error', text: error?.response?.data?.error || 'ذخیرهٔ مجوزها انجام نشد.',
    }),
  });

  const filteredUsers = users.filter((user) => {
    const term = userSearch.trim().toLowerCase();
    if (!term) return true;
    return [
      user.username, user.full_name, user.employee_position, user.employee_department,
    ].filter(Boolean).join(' ').toLowerCase().includes(term);
  });

  return (
    <Grid container spacing={1.5}>
      <Grid item xs={12} lg={4}>
        <Paper elevation={0} sx={{ ...SURFACE, p: 1.25 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <GroupsIcon sx={{ fontSize: 18, color: SOFT.indigo }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 900 }}>
              پرسنل / کاربران ({formatPersianNumber(users.length)})
            </Typography>
          </Stack>
          <TextField
            size="small"
            fullWidth
            placeholder="جست‌وجوی نام یا عنوان شغلی…"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16 }} />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 1 }}
          />
          <Stack spacing={0.75} sx={{ maxHeight: { md: 'calc(100vh - 380px)' }, overflow: 'auto' }}>
            {filteredUsers.map((user) => {
              const active = user.id === selectedId;
              return (
                <Paper
                  key={user.id}
                  onClick={() => setSelectedId(user.id)}
                  elevation={0}
                  sx={{
                    p: 0.9, cursor: 'pointer', borderRadius: '12px', border: '1px solid',
                    borderColor: active ? alpha(SOFT.indigo, 0.55) : 'divider',
                    bgcolor: active ? alpha(SOFT.indigo, 0.06) : 'background.paper',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <UserAvatar user={user} size={30} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>
                        {user.full_name || user.username}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: 10, color: 'text.secondary' }}>
                        {employeeLine(user) || `@${user.username}`}
                      </Typography>
                    </Box>
                    {user.is_full_access ? (
                      <ADMIN_Chip />
                    ) : (
                      <CountChip
                        value={typeof user.permissions_granted === 'number'
                          ? user.permissions_granted : 0}
                        label="مجوز"
                      />
                    )}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      </Grid>


      <Grid item xs={12} lg={8}>
        <Paper elevation={0} sx={{ ...SURFACE, p: 1.25 }}>
          {!selectedId ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                یک کاربر را انتخاب کنید تا مجوزهای ریز او تعیین شود.
              </Typography>
            </Box>
          ) : accessQuery.isLoading ? (
            <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={22} /></Box>
          ) : (
            <>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}
                alignItems={{ xs: 'stretch', md: 'center' }} useFlexGap flexWrap="wrap">
                <Stack direction="row" spacing={1} alignItems="center">
                  <UserAvatar user={selectedUser || {}} size={34} />
                  <Box>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 900 }}>
                      {selectedUser?.full_name || accessData?.user?.full_name
                        || selectedUser?.username}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                      {employeeLine(selectedUser || {}) || `@${selectedUser?.username || ''}`}
                    </Typography>
                  </Box>
                </Stack>
                <Box sx={{ flex: 1 }} />
                <CountChip
                  value={fullAccess ? totalCodes : granted}
                  label={`از ${formatPersianNumber(totalCodes)} مجوز`}
                  color={SOFT.green}
                />
                <TextField
                  size="small"
                  placeholder="جست‌وجوی منو…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 190 }}
                />
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<SaveIcon sx={{ fontSize: 16 }} />}
                  disabled={save.isPending || readOnly}
                  onClick={() => save.mutate()}
                  sx={{
                    bgcolor: SOFT.indigo, boxShadow: 'none',
                    '&:hover': { bgcolor: SOFT.indigo },
                  }}
                >
                  ذخیرهٔ مجوزها
                </Button>
              </Stack>

              <Divider sx={{ my: 1 }} />

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <FormControlLabel
                  control={(
                    <Switch
                      size="small"
                      checked={fullAccess || readOnly}
                      disabled={readOnly}
                      onChange={(event) => setFullAccess(event.target.checked)}
                    />
                  )}
                  label={(
                    <Typography sx={{ fontSize: 11.5, fontWeight: 800 }}>
                      مدیر سیستم — دسترسی کامل (جایگزین ماتریس)
                    </Typography>
                  )}
                />
              </Stack>

              {readOnly ? (
                <Alert severity="info" sx={{ mb: 1, fontSize: 11.5 }}>
                  این کاربر «مدیر سیستم» است و به‌طور خودکار به همهٔ منوها و عملیات دسترسی دارد.
                </Alert>
              ) : null}

              <Box sx={{
                maxHeight: { xs: 'none', md: 'calc(100vh - 380px)' },
                overflow: 'auto', pr: 0.5,
                opacity: (fullAccess || readOnly) ? 0.45 : 1,
                pointerEvents: (fullAccess || readOnly) ? 'none' : 'auto',
              }}>
                <PermissionMatrix
                  catalog={catalog}
                  actions={actions}
                  draft={draft}
                  onToggleCodes={toggleCodes}
                  search={search}
                />
              </Box>
            </>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};


/* ──────────────────────────── صفحهٔ اصلی ──────────────────────────── */
const UsersPage = () => {
  const [tab, setTab] = useState(0);
  const [message, setMessage] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const usersQuery = useQuery({
    queryKey: ['access-users'],
    queryFn: () => axiosInstance.get(USERS_API).then((response) => response.data),
  });
  const catalogQuery = useQuery({
    queryKey: ['access-catalog'],
    queryFn: () => axiosInstance.get(CATALOG_API).then((response) => response.data),
    staleTime: 300_000,
  });
  const appsQuery = useQuery({
    queryKey: ['applications-catalog'],
    queryFn: () => axiosInstance.get(APPS_API).then((response) => response.data),
    staleTime: 300_000,
  });

  const rawUsers = usersQuery.data;
  const users = Array.isArray(rawUsers) ? rawUsers : (rawUsers?.results || []);
  const catalog = catalogQuery.data?.catalog || [];
  const actions = catalogQuery.data?.actions || [];
  const stats = catalogQuery.data?.stats || { modules: 0, groups: 0, menus: 0, codes: 0 };
  const appsData = appsQuery.data;
  const apps = appsData?.applications || (Array.isArray(appsData) ? appsData : []);

  const admins = users.filter((user) => user.is_full_access).length;
  const withAccess = users.filter(
    (user) => !user.is_full_access && Number(user.permissions_granted || 0) > 0,
  ).length;

  const cards = [
    {
      label: 'کاربران فعال', value: formatPersianNumber(users.length),
      sub: 'متصل به پروندهٔ پرسنلی', color: SOFT.indigo, icon: <GroupsIcon />,
    },
    {
      label: 'مدیر سیستم', value: formatPersianNumber(admins),
      sub: 'دسترسی کامل', color: SOFT.violet, icon: <AdminPanelSettingsIcon />,
    },
    {
      label: 'دارای مجوز ریز', value: formatPersianNumber(withAccess),
      sub: 'دسترسی اختصاصی هر پرسنل', color: SOFT.green, icon: <KeyOutlinedIcon />,
    },
    {
      label: 'منو × عملیات', value: formatPersianNumber(stats.codes),
      sub: `${formatPersianNumber(stats.menus)} منو در ${formatPersianNumber(stats.modules)} ماژول`,
      color: SOFT.amber, icon: <ShieldOutlinedIcon />,
    },
  ];

  const openAccess = (user) => {
    setSelectedUserId(user ? user.id : null);
    setTab(1);
  };

  return (
    <Box>
      <PageHeader
        icon={<SecurityIcon />}
        title="کاربران و مجوزهای ریز"
        color={SOFT.violet}
        actions={(
          <Chip
            size="small"
            label={`${formatPersianNumber(stats.codes)} مجوز در ${formatPersianNumber(stats.modules)} ماژول`}
            sx={{ bgcolor: alpha(SOFT.violet, 0.14), color: SOFT.violet, fontWeight: 800 }}
          />
        )}
      />

      {usersQuery.isError || catalogQuery.isError ? (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          دسترسی به مدیریت کاربران ممکن نشد (فقط مدیر سیستم مجاز است).
        </Alert>
      ) : null}
      {message ? (
        <Alert severity={message.type} sx={{ mb: 1.5 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      ) : null}

      <StatGrid stats={cards} />

      <TabsCard
        tabs={[
          { label: 'کاربران', icon: <GroupsIcon sx={{ fontSize: 16 }} /> },
          { label: 'مجوزهای کاربران', icon: <KeyOutlinedIcon sx={{ fontSize: 16 }} /> },
        ]}
        value={tab}
        onChange={setTab}
        activeColor={SOFT.violet}
      />

      {usersQuery.isLoading || catalogQuery.isLoading ? (
        <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress size={24} /></Box>
      ) : tab === 0 ? (
        <UsersTab apps={apps} onMessage={setMessage} onOpenAccess={openAccess} />
      ) : (
        <UserAccessTab
          catalog={catalog}
          actions={actions}
          initialUserId={selectedUserId}
          onMessage={setMessage}
          onSaved={() => usersQuery.refetch()}
        />
      )}
    </Box>
  );
};

export default UsersPage;

