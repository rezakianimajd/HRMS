import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Avatar, Box, Button, Checkbox,
  Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, Grid, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Select,
  Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
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
const ROLES_API = '/users/roles/';
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

const roleColor = (role) => role?.color || SOFT.indigo;

const employeeLine = (user) => {
  const position = user.employee_position || '';
  const department = user.employee_department || '';
  if (position && department) return `${position} · ${department}`;
  return position || department || '';
};

const lastLogin = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

const RoleChip = ({ role }) => (
  <Chip
    size="small"
    label={role?.name || role?.role_name || '—'}
    sx={{
      height: 22,
      fontSize: 10.5,
      fontWeight: 800,
      bgcolor: alpha(roleColor(role), 0.14),
      color: roleColor(role),
      border: `1px solid ${alpha(roleColor(role), 0.3)}`,
      '& .MuiChip-label': { px: 0.9 },
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

/* ─────────────────────────── تب کاربران ─────────────────────────── */
const EMPTY_USER = {
  username: '', first_name: '', last_name: '', email: '', password: '',
  role: 'employee', employee_id: null, application_ids: [],
};

const UserEditDialog = ({
  open, onClose, user, roles, apps, employees, employeesLoading, onCreate, onUpdate,
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
      role: user.role || 'employee',
      employee_id: user.employee_id || null,
      application_ids: user.applications || [],
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
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>نقش دسترسی</InputLabel>
                <Select value={form.role} label="نقش دسترسی"
                  onChange={(event) => set('role', event.target.value)}>
                  {roles.map((role) => (
                    <MenuItem key={role.code} value={role.code} sx={{ fontSize: 12 }}>
                      {`${role.name} — ${formatPersianNumber(role.employees || 0)} کاربر`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>


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
                اتصال به پروندهٔ پرسنلی (عنوان شغلی = نقش سازمانی)
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                با انتخاب پرسنل، عنوان شغلی و دپارتمان او کنار نام کاربر نمایش داده می‌شود.
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
            ماژول‌های مجاز (خالی یعنی طبق نقش)
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


const UsersTab = ({ roles, apps, onMessage }) => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
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

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['access-users'] });
    qc.invalidateQueries({ queryKey: ['role-access'] });
  };

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

  const roleByCode = useMemo(
    () => Object.fromEntries(roles.map((role) => [role.code, role])),
    [roles],
  );

  const filtered = users.filter((user) => {
    const term = search.trim().toLowerCase();
    const haystack = [
      user.username, user.full_name, user.first_name, user.last_name,
      user.email, user.employee_position, user.employee_department,
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !term || haystack.includes(term);
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesRole;
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
            sx={{ minWidth: { xs: '100%', md: 280 } }}
          />
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>نقش</InputLabel>
            <Select value={roleFilter} label="نقش"
              onChange={(event) => setRoleFilter(event.target.value)}>
              <MenuItem value="" sx={{ fontSize: 12 }}>همهٔ نقش‌ها</MenuItem>
              {roles.map((role) => (
                <MenuItem key={role.code} value={role.code} sx={{ fontSize: 12 }}>
                  {role.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flex: 1 }} />
          <StatPill icon={<GroupsIcon sx={{ fontSize: 14 }} />} label="کاربران"
            value={formatPersianNumber(users.length)} color={SOFT.indigo} />
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
                  <TableCell>نقش دسترسی</TableCell>
                  <TableCell align="center">مجوزهای ریز</TableCell>
                  <TableCell align="center">ماژول‌ها</TableCell>
                  <TableCell align="center">آخرین ورود</TableCell>
                  <TableCell align="center" width={96}>عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>

                {filtered.map((user) => {
                  const role = roleByCode[user.role] || { name: user.role_name, color: SOFT.slate };
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
                      <TableCell><RoleChip role={role} /></TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontSize: 11.5, fontWeight: 800 }}>
                          {user.is_superuser
                            ? 'همه'
                            : formatPersianNumber(user.permissions_granted || 0)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontSize: 11.5 }}>
                          {formatPersianNumber((user.applications || []).length)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontSize: 11 }}>{lastLogin(user.last_login)}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.25} justifyContent="center">
                          <Tooltip title="ویرایش">
                            <IconButton size="small"
                              onClick={() => { setEditing(user); setDialogOpen(true); }}>
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="غیرفعال‌سازی">
                            <span>
                              <IconButton size="small" color="error"
                                disabled={remove.isPending}
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
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
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
        roles={roles}
        apps={apps}
        employees={employees}
        employeesLoading={employeesQuery.isLoading}
        onCreate={create}
        onUpdate={update}
      />
    </Box>
  );
};


/* ─────────────────── تب نقش‌ها و مجوزهای ریز ─────────────────── */
const BASE_ROLES = [
  { value: 'super_admin', label: 'مدیر ارشد سیستم' },
  { value: 'hr_manager', label: 'مدیر منابع انسانی' },
  { value: 'hr_specialist', label: 'کارشناس منابع انسانی' },
  { value: 'department_head', label: 'مدیر دپارتمان' },
  { value: 'employee', label: 'کارمند' },
];

const moduleCodes = (module) => module.groups.flatMap(
  (group) => group.items.flatMap((item) => Object.values(item.codes)),
);

const RoleCreateDialog = ({ open, onClose, onCreate, saving }) => {
  const [form, setForm] = useState({
    code: '', name: '', description: '', base_role: 'employee', color: '#64748b',
  });
  React.useEffect(() => {
    if (open) {
      setForm({ code: '', name: '', description: '', base_role: 'employee', color: '#64748b' });
    }
  }, [open]);
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 14, fontWeight: 900 }}>نقش سفارشی جدید</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25} sx={{ pt: 0.5 }}>
          <TextField size="small" label="نام نقش *" value={form.name}
            onChange={(event) => set('name', event.target.value)} />
          <TextField size="small" label="کد یکتا (انگلیسی) *" value={form.code}
            onChange={(event) => set('code', event.target.value.toLowerCase().replace(/\s+/g, '_'))}
            inputProps={{ dir: 'ltr' }} helperText="مثال: treasury_manager" />
          <TextField size="small" label="توضیح" value={form.description}
            onChange={(event) => set('description', event.target.value)} />
          <FormControl size="small">
            <InputLabel>نقش پایه (ارث‌بری)</InputLabel>
            <Select value={form.base_role} label="نقش پایه (ارث‌بری)"
              onChange={(event) => set('base_role', event.target.value)}>
              {BASE_ROLES.map((row) => (
                <MenuItem key={row.value} value={row.value} sx={{ fontSize: 12 }}>
                  {row.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField size="small" label="رنگ" value={form.color}
            onChange={(event) => set('color', event.target.value)} inputProps={{ dir: 'ltr' }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>انصراف</Button>
        <Button variant="contained" disabled={saving || !form.code || !form.name}
          onClick={() => onCreate.mutate(form)}
          sx={{ bgcolor: SOFT.violet, boxShadow: 'none', '&:hover': { bgcolor: SOFT.violet } }}>
          ساخت نقش
        </Button>
      </DialogActions>
    </Dialog>
  );
};


const PermissionMatrix = ({ role, catalog, actions, draft, onToggleCodes, search }) => {
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
                  bgcolor: module.color || roleColor(role),
                }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 900 }}>{module.name}</Typography>
                <Chip
                  size="small"
                  label={`${formatPersianNumber(grantedCount)} از ${formatPersianNumber(moduleCodeList.length)}`}
                  sx={{
                    height: 20, fontSize: 10, fontWeight: 800,
                    bgcolor: alpha(SOFT.green, 0.12), color: SOFT.green,
                  }}
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


const RolesTab = ({ roles, catalog, actions, onMessage, onRefresh }) => {
  const [selected, setSelected] = useState(roles[0]?.code || '');
  const [draft, setDraft] = useState({});
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const role = roles.find((row) => row.code === selected) || roles[0];

  React.useEffect(() => {
    if (!role) return;
    setDraft({ ...(role.permissions || {}) });
  }, [role?.code]); // eslint-disable-line

  const granted = Object.values(draft).filter(Boolean).length;
  const totalCodes = useMemo(
    () => catalog.reduce((sum, module) => sum + moduleCodes(module).length, 0),
    [catalog],
  );

  const toggleCodes = (codes, value) => {
    setDraft((previous) => {
      const next = { ...previous };
      codes.forEach((code) => { next[code] = value; });
      return next;
    });
  };

  const save = useMutation({
    mutationFn: () => axiosInstance.post(
      `${ROLES_API}${role.code}/permissions/`,
      { permissions: draft },
    ),
    onSuccess: () => {
      onRefresh();
      onMessage({ type: 'success', text: `مجوزهای نقش «${role.name}» ذخیره شد.` });
    },
    onError: (error) => onMessage({
      type: 'error', text: error?.response?.data?.error || 'ذخیرهٔ مجوزها انجام نشد.',
    }),
  });

  const create = useMutation({
    mutationFn: (body) => axiosInstance.post(`${ROLES_API}create/`, body),
    onSuccess: () => {
      onRefresh();
      setCreateOpen(false);
      onMessage({ type: 'success', text: 'نقش سفارشی ساخته شد.' });
    },
    onError: (error) => onMessage({
      type: 'error', text: error?.response?.data?.error || 'ساخت نقش انجام نشد.',
    }),
  });

  const remove = useMutation({
    mutationFn: (code) => axiosInstance.post(`${ROLES_API}${code}/delete/`),
    onSuccess: () => {
      onRefresh();
      onMessage({ type: 'success', text: 'نقش حذف شد.' });
    },
    onError: (error) => onMessage({
      type: 'error', text: error?.response?.data?.error || 'حذف نقش انجام نشد.',
    }),
  });

  return (
    <Grid container spacing={1.5}>
      <Grid item xs={12} lg={4}>
        <Paper elevation={0} sx={{ ...SURFACE, p: 1.25 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <ShieldOutlinedIcon sx={{ fontSize: 18, color: SOFT.violet }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 900 }}>
              نقش‌ها ({formatPersianNumber(roles.length)})
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Button size="small" startIcon={<AddIcon sx={{ fontSize: 15 }} />}
              onClick={() => setCreateOpen(true)} sx={{ fontSize: 11 }}>
              نقش جدید
            </Button>
          </Stack>
          <Stack spacing={0.75}>
            {roles.map((row) => {
              const active = row.code === role?.code;
              return (
                <Paper
                  key={row.code}
                  onClick={() => setSelected(row.code)}
                  elevation={0}
                  sx={{
                    p: 1, cursor: 'pointer', borderRadius: '12px',
                    border: '1px solid',
                    borderColor: active ? alpha(roleColor(row), 0.55) : 'divider',
                    bgcolor: active ? alpha(roleColor(row), 0.07) : 'background.paper',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar variant="rounded" sx={{
                      width: 28, height: 28, borderRadius: '9px', fontSize: 13,
                      bgcolor: alpha(roleColor(row), 0.16), color: roleColor(row),
                    }}>
                      <SecurityIcon sx={{ fontSize: 15 }} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 12, fontWeight: 800 }}>
                        {row.name}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: 10, color: 'text.secondary' }}>
                        {row.description || row.code}
                      </Typography>
                    </Box>
                    {row.is_system ? (
                      <Chip size="small" label="سیستمی"
                        sx={{ height: 18, fontSize: 9.5, bgcolor: alpha(SOFT.slate, 0.14) }} />
                    ) : (
                      <Tooltip title="حذف نقش">
                        <IconButton size="small" color="error"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (window.confirm(`نقش «${row.name}» حذف شود؟`)) {
                              remove.mutate(row.code);
                            }
                          }}>
                          <DeleteIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }} useFlexGap flexWrap="wrap">
                    <Chip size="small" icon={<GroupsIcon sx={{ fontSize: 12 }} />}
                      label={`${formatPersianNumber(row.employees || 0)} کاربر`}
                      sx={{ height: 18, fontSize: 9.5 }} />
                    <Chip size="small" icon={<KeyOutlinedIcon sx={{ fontSize: 12 }} />}
                      label={`${formatPersianNumber(row.permissions_total || 0)} مجوز`}
                      sx={{
                        height: 18, fontSize: 9.5,
                        bgcolor: alpha(roleColor(row), 0.1), color: roleColor(row),
                      }} />
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Paper>
      </Grid>


      <Grid item xs={12} lg={8}>
        <Paper elevation={0} sx={{ ...SURFACE, p: 1.25 }}>
          {role ? (
            <>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}
                alignItems={{ xs: 'stretch', md: 'center' }} useFlexGap flexWrap="wrap">
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <RoleChip role={role} />
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {`نقش پایه: ${BASE_ROLES.find((row) => row.value === role.base_role)?.label || role.base_role}`}
                  </Typography>
                </Stack>
                <Box sx={{ flex: 1 }} />
                <StatPill icon={<KeyOutlinedIcon sx={{ fontSize: 14 }} />} label="مجوز فعال"
                  value={`${formatPersianNumber(granted)} از ${formatPersianNumber(totalCodes)}`}
                  color={SOFT.green} />
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
                  sx={{ minWidth: 200 }}
                />
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<SaveIcon sx={{ fontSize: 16 }} />}
                  disabled={save.isPending || role.code === 'super_admin'}
                  onClick={() => save.mutate()}
                  sx={{
                    bgcolor: roleColor(role), boxShadow: 'none',
                    '&:hover': { bgcolor: roleColor(role) },
                  }}
                >
                  ذخیرهٔ مجوزها
                </Button>
              </Stack>

              {role.code === 'super_admin' ? (
                <Alert severity="info" sx={{ mt: 1, fontSize: 11.5 }}>
                  نقش «مدیر ارشد سیستم» همیشه به همهٔ منوها و عملیات دسترسی دارد و قابل محدودسازی نیست.
                </Alert>
              ) : null}

              <Divider sx={{ my: 1 }} />
              <Box sx={{ maxHeight: { xs: 'none', md: 'calc(100vh - 320px)' }, overflow: 'auto', pr: 0.5 }}>
                <PermissionMatrix
                  role={role}
                  catalog={catalog}
                  actions={actions}
                  draft={draft}
                  onToggleCodes={toggleCodes}
                  search={search}
                />
              </Box>
            </>
          ) : (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                نقش‌ای برای نمایش وجود ندارد.
              </Typography>
            </Box>
          )}
        </Paper>
      </Grid>

      <RoleCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={create}
        saving={create.isPending}
      />
    </Grid>
  );
};



/* ──────────────────────────── صفحهٔ اصلی ──────────────────────────── */
const UsersPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [message, setMessage] = useState(null);

  const rolesQuery = useQuery({
    queryKey: ['role-access'],
    queryFn: () => axiosInstance.get(ROLES_API).then((response) => response.data),
    staleTime: 60_000,
  });
  const appsQuery = useQuery({
    queryKey: ['applications-catalog'],
    queryFn: () => axiosInstance.get(APPS_API).then((response) => response.data),
    staleTime: 300_000,
  });

  const roles = rolesQuery.data?.roles || [];
  const catalog = rolesQuery.data?.catalog || [];
  const actions = rolesQuery.data?.actions || [];
  const stats = rolesQuery.data?.stats || { modules: 0, groups: 0, menus: 0, codes: 0 };
  const appsData = appsQuery.data;
  const apps = appsData?.applications || (Array.isArray(appsData) ? appsData : []);

  const refresh = () => qc.invalidateQueries({ queryKey: ['role-access'] });

  const cards = [
    {
      label: 'نقش‌های دسترسی', value: formatPersianNumber(roles.length),
      sub: 'سیستمی و سفارشی', color: SOFT.violet, icon: <ShieldOutlinedIcon />,
    },
    {
      label: 'ماژول‌های برنامه', value: formatPersianNumber(stats.modules),
      sub: `${formatPersianNumber(stats.groups)} گروه منو`, color: SOFT.blue,
      icon: <BusinessIcon />,
    },
    {
      label: 'منوهای تحت کنترل', value: formatPersianNumber(stats.menus),
      sub: 'دسترسی تک‌تک منوها', color: SOFT.teal, icon: <GroupsIcon />,
    },
    {
      label: 'مجوزهای ریز', value: formatPersianNumber(stats.codes),
      sub: 'مشاهده/ایجاد/ویرایش/حذف/تأیید/خروجی',
      color: SOFT.amber, icon: <KeyOutlinedIcon />,
    },
  ];

  return (
    <Box>
      <PageHeader
        icon={<SecurityIcon />}
        title="کاربران، نقش‌ها و مجوزها"
        color={SOFT.violet}
        actions={(
          <Chip
            size="small"
            label={`${formatPersianNumber(stats.codes)} مجوز در ${formatPersianNumber(stats.modules)} ماژول`}
            sx={{ bgcolor: alpha(SOFT.violet, 0.14), color: SOFT.violet, fontWeight: 800 }}
          />
        )}
      />

      {rolesQuery.isError ? (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          دسترسی به فهرست نقش‌ها ممکن نشد (مدیر ارشد یا مدیر منابع انسانی لازم است).
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
          { label: 'نقش‌ها و مجوزهای ریز', icon: <ShieldOutlinedIcon sx={{ fontSize: 16 }} /> },
        ]}
        value={tab}
        onChange={setTab}
        activeColor={SOFT.violet}
      />

      {rolesQuery.isLoading ? (
        <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress size={24} /></Box>
      ) : tab === 0 ? (
        <UsersTab roles={roles} apps={apps} onMessage={setMessage} />
      ) : (
        <RolesTab
          roles={roles}
          catalog={catalog}
          actions={actions}
          onMessage={setMessage}
          onRefresh={refresh}
        />
      )}
    </Box>
  );
};

export default UsersPage;
