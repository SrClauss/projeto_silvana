import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';

interface VendaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  produtoId?: string;
  produtoDescricao?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function VendaModal({ open, onClose, onSuccess, produtoId = '', produtoDescricao = '' }: VendaModalProps) {
  const [formData, setFormData] = useState({
    produto_id: produtoId,
    quantidade: 1,
    cliente_id: '',
    valor_total: 0,
    observacoes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/vendas/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao criar venda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Criar Venda</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {produtoDescricao && (
              <Alert severity="info">Produto: {produtoDescricao}</Alert>
            )}
            
            <TextField
              label="Produto ID"
              value={formData.produto_id}
              onChange={(e) => handleChange('produto_id', e.target.value)}
              required
              disabled={!!produtoId}
            />

            <TextField
              label="Quantidade"
              type="number"
              value={formData.quantidade}
              onChange={(e) => handleChange('quantidade', parseInt(e.target.value))}
              required
              inputProps={{ min: 1 }}
            />

            <TextField
              label="Cliente ID (opcional)"
              value={formData.cliente_id}
              onChange={(e) => handleChange('cliente_id', e.target.value)}
            />

            <TextField
              label="Valor Total (opcional, em centavos)"
              type="number"
              value={formData.valor_total}
              onChange={(e) => handleChange('valor_total', parseInt(e.target.value))}
              inputProps={{ min: 0 }}
            />

            <TextField
              label="Observações"
              value={formData.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              multiline
              rows={3}
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.produto_id || formData.quantidade < 1}
          >
            {loading ? <CircularProgress size={24} /> : 'Criar Venda'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={success}
        autoHideDuration={2000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success">Venda criada com sucesso!</Alert>
      </Snackbar>
    </>
  );
}

export default VendaModal;
