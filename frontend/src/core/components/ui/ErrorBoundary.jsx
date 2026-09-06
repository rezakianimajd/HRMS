import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import ReportIcon from '@mui/icons-material/Report';

/* Global error boundary (2026).
   If any subtree throws, we render a friendly error panel instead of a
   white/blank page, and console.log the real error for debugging. */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', p: 4 }}>
          <Paper sx={{
            p: 4, maxWidth: 520, borderRadius: 3, textAlign: 'center',
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'linear-gradient(160deg, rgba(239,68,68,0.08), rgba(255,255,255,0.4))',
          }}>
            <ReportIcon sx={{ fontSize: 54, color: '#ef4444', mb: 1 }} />
            <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
              خطایی در نمایش رخ داد
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }} dir="ltr">
              {this.state.message}
            </Typography>
            <Button variant="contained" color="error"
              onClick={() => window.location.reload()}>
              بارگذاری مجدد صفحه
            </Button>
          </Paper>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;