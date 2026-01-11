import { Box, Typography, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Button } from '@mui/material';
import { Inventory, Settings, Logout, Dashboard as DashboardIcon, Timeline, Label, ChevronLeft, ChevronRight, ShoppingBag, Business, SwapHoriz, PersonPin } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import theme from '../theme';

const SidebarContent = ({ onNavigate, isCollapsed, onToggleCollapse }: { onNavigate?: () => void; isCollapsed?: boolean; onToggleCollapse?: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { label: 'Produtos', icon: <ShoppingBag />, path: '/produtos' },
    { label: 'Marcas/Fornecedores', icon: <Business />, path: '/marcas-fornecedores' },
    { label: 'Tags', icon: <Label />, path: '/tags' },
    { label: 'Vendas', icon: <Timeline />, path: '/vendas' },
    { label: 'Cond. Fornecedor', icon: <SwapHoriz />, path: '/condicionais-fornecedor' },
    { label: 'Cond. Cliente', icon: <PersonPin />, path: '/condicionais-cliente' },
    { label: 'Estoque', icon: <Inventory />, path: '/estoque' },
    { label: 'Ajustes', icon: <Settings />, path: '/ajustes' }
  ];

  const handleLogout = () => {
    // Limpar o token de autenticação do localStorage
    localStorage.removeItem('authToken');
    // Redirecionar para a página de login
    navigate('/login');
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: theme.palette.secondary.main, fontFamily: 'serif', fontWeight: 700, display: isCollapsed ? 'none' : 'block' }}>SilvanaTeodoro</Typography>
        <Typography variant="caption" sx={{ color: theme.palette.secondary.main, opacity: 0.6, letterSpacing: 2, display: isCollapsed ? 'none' : 'block' }}>CLOSET</Typography>
      </Box>

      <List sx={{ px: 2, flexGrow: 1 }}>
        {items.map((item) => (
          <ListItem key={item.label} disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              sx={{
                borderRadius: 2,
                mb: 0.5,
                py: 1.2,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                bgcolor: location.pathname === item.path ? 'rgba(212,175,55,0.15)' : 'transparent'
              }}
              onClick={() => { navigate(item.path); if (onNavigate) onNavigate(); }}
            >
              <ListItemIcon sx={{ color: theme.palette.secondary.main, minWidth: 40, justifyContent: 'center' }}>{item.icon}</ListItemIcon>
              {!isCollapsed && <ListItemText primary={item.label} primaryTypographyProps={{ color: theme.palette.secondary.main, fontWeight: 600, fontSize: '0.8rem' }} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
        {!isCollapsed && (
          <Button 
          variant="outlined"
          sx={{ color: theme.palette.secondary.main, borderColor: theme.palette.secondary.main }}
          fullWidth
          onClick={
            handleLogout
          }
          startIcon={<Logout />}>Sair</Button>
        )}
        <Button onClick={() => onToggleCollapse && onToggleCollapse()} sx={{ color: theme.palette.secondary.main, minWidth: 44 }}>
          {isCollapsed ? <ChevronRight sx={{ color: theme.palette.secondary.main }} /> : <ChevronLeft sx={{ color: theme.palette.secondary.main }} />}
        </Button>
      </Box>
    </Box>
  );
};

export default SidebarContent;