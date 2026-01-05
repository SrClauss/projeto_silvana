import { styled } from '@mui/material/styles'
import { TextField, type TextFieldProps } from '@mui/material'

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-input': {
    padding: { xs: '12px 14px', md: '15px 20px' },
    minHeight: { xs: 44, md: 56 },
    boxSizing: 'border-box',
  },
  borderRadius: theme.shape.borderRadius,
}))

const InputWell = (props: TextFieldProps) => {
  return <StyledTextField fullWidth variant="outlined" size="medium" {...props} />
}

export default InputWell
