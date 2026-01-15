import React, { useRef, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Button } from '@mui/material';
import { Inventory, Settings, Logout, Dashboard as DashboardIcon, Timeline, Label, ChevronLeft, ChevronRight, ShoppingBag, Business, LocationOn, SwapHoriz, PersonPin, People } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import theme from '../theme';

const SidebarContent = ({ onNavigate, isCollapsed, onToggleCollapse }: { onNavigate?: () => void; isCollapsed?: boolean; onToggleCollapse?: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // refs and drag handlers for discreet scroll handle
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startScrollRef = useRef(0);
    const handleDragging = (e: MouseEvent) => {
    if (!draggingRef.current) return;
    const deltaY = e.clientY - startYRef.current;
    if (scrollRef.current) scrollRef.current.scrollTop = startScrollRef.current + deltaY * 1.2;
  };

  const handleDragEnd = () => {
    draggingRef.current = false;
    document.removeEventListener('mousemove', handleDragging);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startScrollRef.current = scrollRef.current?.scrollTop ?? 0;
    document.addEventListener('mousemove', handleDragging);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    startScrollRef.current = scrollRef.current?.scrollTop ?? 0;
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const deltaY = e.touches[0].clientY - startYRef.current;
    if (scrollRef.current) scrollRef.current.scrollTop = startScrollRef.current + deltaY * 1.2;
  };

  const handleTouchEnd = () => {
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  };

  const items = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { label: 'Produtos', icon: <ShoppingBag />, path: '/produtos' },
    { label: 'Clientes', icon: <People />, path: '/clientes' },
    { label: 'Marcas/Fornecedores', icon: <Business />, path: '/marcas-fornecedores' },
    { label: 'Sessões', icon: <LocationOn />, path: '/sessoes' },
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

  useEffect(() => {
    // cleanup listeners on unmount
    return () => {
      document.removeEventListener('mousemove', handleDragging);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);


  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography component={"div"} variant='caption' color={theme.palette.background.default}>V 1.0</Typography>
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: theme.palette.secondary.main, fontFamily: 'serif', fontWeight: 700, display: isCollapsed ? 'none' : 'block' }}>SilvanaTeodoro</Typography>
        <Typography variant="caption" sx={{ color: theme.palette.secondary.main, opacity: 0.6, letterSpacing: 2, display: isCollapsed ? 'none' : 'block' }}>CLOSET</Typography>
      </Box>

      <Box ref={scrollRef} sx={{
        position: 'relative',
        px: 2,
        flexGrow: 1,
        overflowY: 'auto',
        // hide scrollbar across browsers but keep scrolling functional
        '&::-webkit-scrollbar': { width: 0, height: 0 },
        scrollbarWidth: 'none', // firefox
        msOverflowStyle: 'none' // ie 10+
      }}>
        <List sx={{ py: 1 }}>
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

        {/* small draggable handle to control scroll discretely */}
        {!isCollapsed && (
          <Box
            onMouseDown={handleDragStart}
            onTouchStart={handleTouchStart}
            sx={{
              position: 'absolute',
              right: 6,
              top: '35%',
              transform: 'translateY(-35%)',
              width: 8,
              height: '30%',
              bgcolor: 'rgba(255,255,255,0.06)',
              borderRadius: 2,
              cursor: 'grab',
              zIndex: 10,
              '&:active': { cursor: 'grabbing' },
              '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
            }}
            title="Arraste para rolar"
          />
        )}
      </Box>

      <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center', mt: 'auto', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
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