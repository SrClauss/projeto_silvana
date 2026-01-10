import { Box, Paper } from '@mui/material'
import BrandSidebar from './components/BrandSidebar'
import LoginForm from './components/LoginForm'

const LoginPage = () => {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', overflowX: 'hidden', width: '100%', px: { xs: 0, md: 0 }, py: { xs: 3, md: 0 } }}>
      <Paper elevation={1} sx={{ width: '100%', maxWidth: { xs: 'calc(100vw - 32px)', md: 1000 }, minHeight: { xs: 520, md: 600 }, borderRadius: 3, overflow: 'hidden', display: 'flex', boxSizing: 'border-box', flexDirection: { xs: 'column', md: 'row' } }}>
        <BrandSidebar />
        <Box sx={{ flex: 1, p: { xs: 3, md: 8 }, display: 'flex', alignItems: 'center' }}>
          <LoginForm />
        </Box>
      </Paper>
    </Box>
  )
}

export default LoginPage
