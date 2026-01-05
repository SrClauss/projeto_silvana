import { Box, Typography } from '@mui/material'

const BrandSidebar = () => {
  return (
    <Box sx={{
      flex: 1,
      display: { xs: 'none', md: 'flex' },
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      p: 5,
      position: 'relative',
      backgroundImage: `linear-gradient(rgba(61, 43, 31, 0.85), rgba(61, 43, 31, 0.95)), url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1000')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      borderRight: '2px solid #2a1d15',
      boxShadow: 'inset -10px 0 20px rgba(0,0,0,0.3)'
    }}>
      <Box sx={{ position: 'absolute', inset: 15, border: '1px dashed rgba(212, 175, 55, 0.3)', borderRadius: 2, pointerEvents: 'none' }} />
      <Typography variant="h2" sx={{ fontFamily: 'Cormorant Garamond, serif', color: '#d4af37', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>SilvanaTeodoro</Typography>
      <Typography sx={{ color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.3em', fontSize: '0.6rem', mt: 1 }}>Sistema de Gestão de Inventário</Typography>
    </Box>
  )
}

export default BrandSidebar
