import { Box, Paper } from '@mui/material';
import SidebarContent from './SidebarContent';

const Sidebar = ({ collapsed, setCollapsed, fixedOnMd = true }: { collapsed?: boolean; setCollapsed?: (v: boolean) => void; fixedOnMd?: boolean }) => {
  const isCollapsed = !!collapsed;
  const width = isCollapsed ? 80 : 260;

  return (
    // outer container can be fixed on md+ or kept in flow depending on fixedOnMd
    <Box sx={{ width, flexShrink: 0, display: { xs: 'none', md: 'block' }, position: fixedOnMd ? { xs: 'static', md: 'fixed' } : { xs: 'static', md: 'static' }, height: { md: '100vh' }, zIndex: 1200 }}>
      <Paper sx={{
        height: { xs: 'auto', md: '100%' }, bgcolor: '#3D2B1F', borderRadius: 0, border: 'none',
        width: '100%', display: 'flex', flexDirection: 'column', transition: 'width 200ms'
      }}>
        <SidebarContent isCollapsed={isCollapsed} onToggleCollapse={() => setCollapsed && setCollapsed(!isCollapsed)} />

      </Paper>
    </Box>
  );
};

export default Sidebar;
