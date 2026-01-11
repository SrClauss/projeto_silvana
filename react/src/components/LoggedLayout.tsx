import React, { useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import SidebarContent from './SidebarContent';

// Simples: dois containers — conteúdo principal e sidebar à direita. Menu para mobile.
const LoggedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);

  return (
    <Box id="logged-layout-root" sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'row' }}>
      {/* Conteúdo principal */}
      <Box id="main-area" sx={{ flex: 1, p: { xs: 2, md: 4 } }}>
        {/* botão de menu (apenas mobile) */}
        <Box sx={{ display: { md: 'none' }, mb: 2 }}>
          <IconButton aria-label="menu" onClick={() => setOpen(!open)}>
            <MenuIcon />
          </IconButton>
        </Box>

        {children}
      </Box>

      {/* Sidebar fixa à direita (mostra/oculta no mobile) */}
      <Box
        component="aside"
        id="sidebar"
        sx={{
          width: 260,
          flexShrink: 0,
          display: { xs: open ? 'block' : 'none', md: 'block' },
          position: { xs: 'fixed', md: 'static' },
          right: 0,
          top: 0,
          height: { xs: '100vh', md: 'auto' },
          bgcolor: '#3D2B1F',
          zIndex: 1200,
          overflow: 'auto'
        }}
      >
        <SidebarContent onNavigate={() => setOpen(false)} />
      </Box>
    </Box>
  );
};

export default LoggedLayout;
