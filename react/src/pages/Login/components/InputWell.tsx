import { TextField, type TextFieldProps, IconButton, InputAdornment } from '@mui/material'
import { useState } from 'react'
import { Visibility, VisibilityOff } from '@mui/icons-material'

const InputWell = (props: TextFieldProps) => {
  const { type, sx, ...rest } = props
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'

  return (
    <TextField
      fullWidth
      variant="outlined"
      size="medium"
      type={isPassword && !show ? 'password' : 'text'}
      {...rest}
      sx={{
        '& .MuiOutlinedInput-input': {
          padding: { xs: '12px 14px', md: '15px 20px' },
          minHeight: { xs: 44, md: 56 },
          boxSizing: 'border-box',
        },
        borderRadius: 2,
        ...sx,
      }}
      InputProps={isPassword ? {
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label={show ? 'Ocultar senha' : 'Exibir senha'}
              onClick={() => setShow((v) => !v)}
              edge="end"
              tabIndex={-1}
              size="small"
            >
              {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      } : undefined}
    />
  )
}

export default InputWell
