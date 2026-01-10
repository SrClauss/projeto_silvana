import { createTheme } from '@mui/material/styles';
export const customTheme ={

  palette:{
    opacicityBackground: '#3d2b1f95',
  }
}

const theme = createTheme({
  palette: {
    primary: {
      main: '#3d2b1f',
      contrastText: '#d4af37',

    },
    secondary: {
      main: '#d4af37',
      contrastText: '#3d2b1f',
    },
    background: {
      default: '#d7d2cb',
      paper: '#e8e4df',
 

    },
    text: {
      primary: '#4a443f',
      secondary: '#8c857e',
    },

    
  },
  typography: {
    fontFamily: '"Montserrat", "Arial", sans-serif',
    h1: {
      fontFamily: '"Cormorant Garamond", serif',
      fontWeight: 700,
      color: '#4a443f',
    },
    h2: {
      fontFamily: '"Cormorant Garamond", serif',
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '12px 24px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          transition: 'all 0.2s ease-in-out',
          '&:active': {
            transform: 'translateY(2px)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(to bottom, #5d4a3a, #3d2b1f)',
          border: '1px solid #2a1d15',
          '&:hover': {
            background: 'linear-gradient(to bottom, #6d5a4a, #4d3b2f)',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#dcd7cf',
          boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.8)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#c8c2b9',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#b8b2a9',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: '1px',
            borderColor: '#d4af37',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        elevation1: {
          boxShadow: '0 20px 50px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,1)',
          border: '1px solid #c8c2b9',
        },
      },
    },
  },
});

export default theme;
