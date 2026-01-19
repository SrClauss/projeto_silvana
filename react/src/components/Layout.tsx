import React, { useState } from 'react';
import { Box, Drawer, AppBar, Toolbar, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from '../components/Sidebar';
import SidebarContent from '../components/SidebarContent';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sideMargin = collapsed ? '80px' : '260px';

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  // Runtime validation: ensure MenuIcon is a valid React component (helps catch bad imports that are objects)
  const isMenuIconValid = typeof MenuIcon === 'function' || (MenuIcon && 'render' in MenuIcon && typeof (MenuIcon as unknown as { render?: unknown }).render === 'function');
  if (!isMenuIconValid) {
     
    console.warn('Layout: MenuIcon appears to be invalid. Falling back to text icon. Value:', MenuIcon);
  }

  return (
    <Box sx={{ display: 'flex', width: '100%' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 260 } }}
      >
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <AppBar position="fixed" color="transparent" elevation={0} sx={{ display: { md: 'none' } }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="menu" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
            {isMenuIconValid ? <MenuIcon /> : <span style={{ fontSize: 18, color: '#D4AF37' }}>≡</span>}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, ml: { md: sideMargin, xs: 0 }, minHeight: '100vh', transition: 'margin-left 200ms', pt: { xs: '56px', md: 0 } }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout;