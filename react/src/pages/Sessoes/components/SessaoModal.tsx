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
import type { Sessao } from '../../../types';

interface SessaoModalProps {
  open: boolean;
  onClose: () => void;
  editingSessao?: Sessao | null;
  onSave: (sessao: Sessao) => void;
}

const SessaoModal: React.FC<SessaoModalProps> = ({
  open,
  onClose,
  editingSessao,
  onSave,
}) => {
  const theme = useTheme();
  const [nome, setNome] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingSessao) {
      setNome(editingSessao.nome);
      setLocalizacao(editingSessao.localizacao || '');
    } else {
      setNome('');
      setLocalizacao('');
    }
  }, [editingSessao, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      let response;
      if (editingSessao) {
        response = await axios.put(`/sessoes/${editingSessao._id}`, { nome, localizacao }, { headers: { Authorization: `Bearer ${token}` } });
        onSave(response.data);
      } else {
        response = await axios.post('/sessoes/', { nome, localizacao }, { headers: { Authorization: `Bearer ${token}` } });
        // backend returns { id: inserted_id } — buscar o documento criado para retornar o objeto completo
        if (response?.data?.id) {
          const created = await axios.get(`/sessoes/${response.data.id}`, { headers: { Authorization: `Bearer ${token}` } });
          onSave(created.data);
        } else {
          onSave(response.data);
        }
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth container={document.body}>
      <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.secondary.main }}>
        {editingSessao ? 'Editar Sessão' : 'Adicionar Sessão'}
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
            label="Localização"
            value={localizacao}
            onChange={(e) => setLocalizacao(e.target.value)}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 1 }}>
        <Button
          size="small"
          onClick={handleSave}
          variant="contained"
          sx={{  width: '100%' }}
          disabled={saving}
        >
          {saving ? 'Salvando...' : (editingSessao ? 'Salvar' : 'Adicionar')}
        </Button>
        <Button size="small" onClick={onClose} sx={{ color: theme.palette.primary.main, width: '100%' }}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessaoModal;
