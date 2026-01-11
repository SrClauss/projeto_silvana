import React, { useState } from 'react';
import { Box, Drawer, AppBar, Toolbar, IconButton, Paper } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import SidebarContent from './SidebarContent';
import { customTheme } from '../theme';
interface LoggedLayoutProps {
  children: React.ReactNode;
  activePage: string;  // Adicione esta linha
}

const LoggedLayout: React.FC<LoggedLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sideWidth = collapsed ? 80 : 260;

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  return (
    <Box id="logged-layout-root" sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar (fixed on md+) so it doesn't cause layout shift when toggling) */}
      <Box id="sidebar-box" sx={{ width: sideWidth, flexShrink: 0, display: { xs: 'none', md: 'block' }, position: { md: 'fixed' }, top: 0, left: 0, bottom: 0, zIndex: (theme) => theme.zIndex.drawer }}>
        <Paper id="sidebar-paper" sx={{ height: '100%', bgcolor: '#3D2B1F', borderRadius: 0, border: 'none', width: sideWidth, display: 'flex', flexDirection: 'column', transition: 'width 200ms', overflow: 'auto' }}>
          <SidebarContent isCollapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
        </Paper>
      </Box>

      {/* Mobile drawer */}
      <Drawer
        id="mobile-drawer"
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 260, backgroundColor: customTheme.palette.opacicityBackground} }}
      >
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      {/* AppBar for mobile */}
      <AppBar id="mobile-appbar" position="fixed" color="transparent" elevation={0} sx={{ display: { md: 'none' } }}>
        <Toolbar>
          <IconButton id="mobile-menu-button" edge="start" color="inherit" aria-label="menu" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main content: document handles scrolling; content fills area next to the fixed sidebar */}
      <Box id="main-wrapper" sx={{ 
        ml: { md: `${sideWidth}px` },
        pt: { xs: '64px', md: 0 },
        width: { xs: '100%', md: `calc(100% - ${sideWidth}px)` },
        flexGrow: 1
      }}>
        {/* Conteúdo alinhado à esquerda e ocupando toda a largura disponível ao lado da sidebar */}
        <Box id="main-content" sx={{ width: '100%', height: '100%' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default LoggedLayout;
