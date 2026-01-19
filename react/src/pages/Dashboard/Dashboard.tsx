import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Paper,
  Tooltip,
  ThemeProvider,
  Avatar,
  createTheme,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  ReceiptLong,
  AttachMoney,
  Checkroom,
  Timeline,
  KeyboardArrowUp,
  KeyboardArrowDown
} from '@mui/icons-material';
import { dashboardData } from '../../mock/dashboardData';
import Title from '../../components/Title';


// --- TEMA ---
const theme = createTheme({
  palette: {
    primary: { main: '#3D2B1F', contrastText: '#D4AF37' },
    secondary: { main: '#D4AF37' },
    background: { default: '#D7D2CB', paper: '#E8E4DF' },
    text: { primary: '#3D2B1F', secondary: '#6D5A4A' },
  },
  typography: {
    fontFamily: '"Montserrat", sans-serif',
    h4: { fontFamily: 'serif', fontWeight: 700, color: '#3D2B1F' },
    h6: { fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem' },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 12, border: '1px solid #C8C2B9', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }
      }
    }
  }
});

const LeatherKpiCard = ({ id, title, value, icon, trend, subValue }: { id?: string; title: string; value: string; icon: React.ReactElement; trend?: number; subValue?: string }) => (
  <Paper id={id} sx={{
    p: 2.5,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    height: '100%',
    minHeight: '160px',
    justifyContent: 'space-between',
    position: 'relative'
  }}>
    <Box sx={{ position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, border: '1px dashed rgba(61, 43, 31, 0.1)', borderRadius: '8px', pointerEvents: 'none' }} />
    <Avatar sx={{ bgcolor: 'background.default', color: 'primary.main', width: 36, height: 36, border: '1px solid #C8C2B9' }}>
      {React.cloneElement(icon, { fontSize: 'small' })}
    </Avatar>
    <Box>
      <Typography id={id ? `${id}-title` : undefined} variant="h6" color="text.secondary" sx={{ fontSize: '0.6rem', mb: 0.5 }}>{title}</Typography>
      <Typography id={id ? `${id}-value` : undefined} variant="h4" sx={{ fontWeight: 800, fontSize: '1.3rem' }}>{value}</Typography>
    </Box> 
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
      {trend !== undefined && (trend > 0 ? <KeyboardArrowUp sx={{ fontSize: 14 }} color="success" /> : <KeyboardArrowDown sx={{ fontSize: 14 }} color="error" />)}
      <Typography variant="caption" sx={{ fontWeight: 700, color: trend !== undefined && trend > 0 ? '#2e7d32' : trend !== undefined && trend < 0 ? '#d32f2f' : 'text.secondary' }}>
        {subValue || (trend !== undefined ? `${Math.abs(trend)}%` : '')}
      </Typography>
    </Box>
  </Paper>
);

const Dashboard = () => {
  // Formatar dados para o componente
  const formatCurrency = (value: number) => `${(value / 1000).toFixed(1)}k €`;
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const dailySales = dashboardData.dailySales.map(d => ({ date: formatDate(d.date), sales: d.sales }));

  const formatDayMonthShort = (iso: string) => {
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const dt = new Date(iso);
    const day = dt.getDate().toString().padStart(2, '0');
    const mon = months[dt.getMonth()];
    return `${day} ${mon}`;
  };

  const weeklySales = dashboardData.weeklySales.map((w) => {
    const start = w.start || '';
    const end = w.end || '';
    const weekLabel = `${formatDayMonthShort(start)} - ${formatDayMonthShort(end)}`;
    return { ...w, weekLabel };
  });

  return (
    <ThemeProvider theme={theme}>
      {/* Remover Box wrapper - o LoggedLayout já fornece o container */}
      <Box id="dashboard-root" sx={{ width: '100%' }}>
        <Box id="dashboard-header" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 6 }}>
          <Title text="Gestão do Closet" subtitle="Janeiro 2026 • Performance" />
        </Box>

            <Grid id="dashboard-grid" container spacing={4}>

              {/* KPIs (Linha 1) */}
              <Grid item xs={12} sm={6} md={3} id="kpi-item-faturamento"><LeatherKpiCard id="kpi-faturamento" title="Faturamento" value={formatCurrency(dashboardData.faturamentoMesCorrente)} icon={<AttachMoney />} trend={12} /></Grid>
              <Grid item xs={12} sm={6} md={3} id="kpi-item-conversao"><LeatherKpiCard id="kpi-conversao" title="Conversão" value={`${dashboardData.percentualConversaoCondicionais}%`} icon={<TrendingUp />} subValue="Meta: 80%" /></Grid>
              <Grid item xs={12} sm={6} md={3} id="kpi-item-condicionais"><LeatherKpiCard id="kpi-condicionais" title="Condicionais" value={dashboardData.pecasEmCondicionais.toString()} icon={<Checkroom />} trend={-5} /></Grid>
              <Grid item xs={12} sm={6} md={3} id="kpi-item-ticket"><LeatherKpiCard id="kpi-ticket" title="Ticket Médio" value={`${dashboardData.ticketMedioCondicional} €`} icon={<ReceiptLong />} subValue="+15%" /></Grid> 

              {/* FATURAMENTO DIÁRIO (Linha 2 - Largura Total) */}
              <Grid item xs={12} id="dashboard-daily">
                <Paper id="dashboard-daily-paper" sx={{ p: 4 }}>
                  <Typography id="dashboard-daily-title" variant="h6" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Timeline color="secondary" /> Faturamento Diário (30 Dias)
                  </Typography>
                  <Box id="dashboard-daily-bars" sx={{ height: 260, display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                    {dailySales.map((day, i) => (
                      <Tooltip key={i} title={`${day.date}: ${day.sales}€`} arrow>
                        <Box id={`dashboard-daily-bar-${i}`} sx={{
                          flex: 1,
                          bgcolor: i > 24 ? 'secondary.main' : 'primary.main',
                          height: `${(day.sales / 5000) * 100}%`,
                          borderRadius: '4px 4px 0 0',
                          opacity: i > 24 ? 1 : 0.2,
                          transition: 'opacity 0.2s',
                          '&:hover': { opacity: 1 }
                        }} />
                      </Tooltip>
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                    <Typography id="dashboard-daily-left-caption" variant="caption" color="text.secondary">07 Dez</Typography>
                    <Box id="dashboard-daily-legend" sx={{ display: 'flex', gap: 3 }}>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 8, height: 8, bgcolor: 'primary.main', opacity: 0.2 }} />
                          <Typography variant="caption">Dezembro</Typography>
                       </Box>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 8, height: 8, bgcolor: 'secondary.main' }} />
                          <Typography variant="caption">Janeiro</Typography>
                       </Box>
                    </Box>
                    <Typography id="dashboard-daily-right-caption" variant="caption" color="text.secondary">05 Jan</Typography>
                  </Box>
                </Paper>
              </Grid>

              {/* FLUXO SEMANAL + CUSTOS (Linha 3) */}
              <Grid item xs={12} md={8} id="dashboard-weekly">
                <Paper id="dashboard-weekly-paper" sx={{ p: 4, height: '100%' }}>
                  <Typography id="dashboard-weekly-title" variant="h6" sx={{ mb: 5 }}>Fluxo Semanal</Typography>
                  <Box id="dashboard-weekly-list" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {weeklySales.map((w, i) => (
                      <Box key={i} id={`dashboard-weekly-row-${i}`} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ minWidth: 50, pr: 3 }}>
                          <Typography id={`dashboard-weekly-label-${i}`} variant="caption" sx={{ fontWeight: 700 }}>{w.weekLabel}</Typography>
                        </Box>
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                          <Box id={`dashboard-weekly-bar-${i}`} sx={{ 
                            height: '22px', 
                            bgcolor: i === weeklySales.length - 1 ? 'secondary.main' : 'primary.main', 
                            width: `${(w.total / 30000) * 100}%`, 
                            borderRadius: '6px',
                            minWidth: '10px'
                          }} />
                          <Typography id={`dashboard-weekly-value-${i}`} variant="caption" sx={{ fontWeight: 700 }}>
                            {w.total > 1000 ? `${(w.total/1000).toFixed(1)}k` : w.total}€
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4} id="dashboard-costs">
                <Paper id="dashboard-costs-paper" sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography id="dashboard-costs-title" variant="h6" sx={{ mb: 3 }}>Custos e Impostos</Typography>
                  <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Box id="dashboard-costs-indicator" sx={{
                      width: 130, height: 130, borderRadius: '50%', border: '14px solid #3D2B1F',
                      borderTopColor: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Typography id="dashboard-costs-indicator-value" variant="h6" sx={{ fontWeight: 800 }}>40%</Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ my: 3 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography id="dashboard-costs-impostos-label" variant="caption" color="text.secondary">Impostos</Typography>
                      <Typography id="dashboard-costs-impostos-value" variant="subtitle2" sx={{ fontWeight: 800 }}>{formatCurrency(dashboardData.impostosARecolher)}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography id="dashboard-costs-taxas-label" variant="caption" color="text.secondary">Taxas</Typography>
                      <Typography id="dashboard-costs-taxas-value" variant="subtitle2" sx={{ fontWeight: 800 }}>{formatCurrency(dashboardData.despesasMeiosPagamento)}</Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>

            </Grid>
      </Box>
    </ThemeProvider>
  );
};

export default Dashboard;