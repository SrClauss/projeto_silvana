import { useState } from 'react'
import { Box, Typography, Button, FormControlLabel, Checkbox } from '@mui/material'
import InputWell from './InputWell'
import axios from 'axios' 
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ text: string; color?: string } | null>(null)
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus({ text: 'A autenticar credenciais...', color: '#4a443f' })
    try {
      // POST as query params are expected by backend; we'll send as body JSON and handle when backend updates.
      const res = await axios.post('/auth/login?email=' + encodeURIComponent(email) + '&password=' + encodeURIComponent(password))
      const token = res.data.access_token
      if (token) {
        setStatus({ text: 'Autenticado com sucesso', color: '#157F3A' })
        localStorage.setItem('token', token)
        navigate('/dashboard');
      } else {
        setStatus({ text: 'Resposta inesperada do servidor', color: '#c0392b' })
      }
    } catch {
      setStatus({ text: 'Acesso Negado: Contacte o Administrador.', color: '#c0392b' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 420, mx: 'auto', width: '100%', boxSizing: 'border-box' }}>
      <Box sx={{ textAlign: { xs: 'center', md: 'left' }, mb: 4 }}>
        <Typography sx={{ display: 'inline-block', background: '#dcd7cf', px: 2, py: 0.5, borderRadius: 2, fontSize: { xs: '0.6rem', md: '0.65rem' }, fontWeight: 700, color: '#8c857e', border: '1px solid #c8c2b9' }}>ACESSO RESTRITO</Typography>
        <Typography variant="h1" sx={{ fontFamily: 'Cormorant Garamond, serif', fontSize: { xs: '1.4rem', sm: '1.6rem', md: '1.8rem' }, mt: 1, lineHeight: 1.05, fontWeight: 700 }}>Login Administrativo</Typography>
        <Typography sx={{ color: '#8c857e', fontSize: { xs: '0.78rem', md: '0.9rem' }, mt: 1 }}>Introduza as credenciais do seu terminal</Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <InputWell placeholder="ID de Utilizador" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Box> 

      <Box sx={{ mb: 1 }}>
        <InputWell type="password" placeholder="Chave de Segurança" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, px: 1 }}>
        <FormControlLabel control={<Checkbox />} label={<Typography sx={{ fontSize: '0.75rem', color: '#8c857e', fontWeight: 600 }}>Manter sessão ativa</Typography>} />
      </Box>

      <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading} sx={{ py: 1.8, mt: 1 }}>
        Entrar no Sistema
      </Button>

      {status && (
        <Typography id="status-msg" sx={{ height: 20, mt: 2, textAlign: 'center', fontWeight: 600, color: status.color }}>{status.text}</Typography>
      )}

      <Typography sx={{ mt: 6, textAlign: 'center', fontSize: '0.75rem', color: '#8c857e', opacity: 0.7 }}>&copy; 2026 SilvanaTeodoro Atelier. <br /> Todos os direitos reservados.</Typography>
    </Box>
  )
}

export default LoginForm
