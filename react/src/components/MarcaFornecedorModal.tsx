import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import type { MarcaFornecedor } from '../types';

interface MarcaFornecedorModalProps {
  open: boolean;
  onClose: () => void;
  editingMarca?: MarcaFornecedor | null;
  onSave: (marca: MarcaFornecedor) => void;
}

const MarcaFornecedorModal: React.FC<MarcaFornecedorModalProps> = ({
  open,
  onClose,
  editingMarca,
  onSave,
}) => {
  const theme = useTheme();
  const [nome, setNome] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingMarca) {
      setNome(editingMarca.nome);
      setFornecedor(editingMarca.fornecedor);
    } else {
      setNome('');
      setFornecedor('');
    }
  }, [editingMarca, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      let response;
      if (editingMarca) {
        response = await axios.put(`/marcas-fornecedores/${editingMarca._id}`, { nome, fornecedor }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        response = await axios.post('/marcas-fornecedores/', { nome, fornecedor }, { headers: { Authorization: `Bearer ${token}` } });
      }
      onSave(response.data);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar marca/fornecedor:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.secondary.main }}>
        {editingMarca ? 'Editar Marca/Fornecedor' : 'Adicionar Marca/Fornecedor'}
      </DialogTitle>
      <DialogContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            size="small"
            label="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            fullWidth
          />
          <TextField
            size="small"
            label="Fornecedor"
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 1 }}>
        <Button
          size="small"
          onClick={handleSave}
          variant="contained"
          sx={{ bgcolor: theme.palette.secondary.main, color: theme.palette.primary.main, width: '100%' }}
          disabled={saving}
        >
          {saving ? 'Salvando...' : (editingMarca ? 'Salvar' : 'Adicionar')}
        </Button>
        <Button size="small" onClick={onClose} sx={{ color: theme.palette.primary.main, width: '100%' }}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MarcaFornecedorModal;