import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';
import { useTheme } from '@mui/material/styles';
import type { Endereco } from '../../../types';

interface ClienteModalProps {
  open: boolean;
  onClose: () => void;
  editingId: string | null;
  newCliente: {
    nome: string;
    telefone: string;
    endereco: Endereco;
    cpf: string;
  };
  setNewCliente: React.Dispatch<React.SetStateAction<{
    nome: string;
    telefone: string;
    endereco: Endereco;
    cpf: string;
  }>>;
  addingCliente: boolean;
  handleAddCliente: () => Promise<void>;
}

const ClienteModal: React.FC<ClienteModalProps> = ({
  open,
  onClose,
  editingId,
  newCliente,
  setNewCliente,
  addingCliente,
  handleAddCliente,
}) => {
  const theme = useTheme();
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const rawCep = e.target.value || '';
    const cep = rawCep.replace(/\D/g, '');
    if (!cep) return;
    if (cep.length !== 8) {
      setCepError('CEP inválido');
      return;
    }

    setLoadingCep(true);
    setCepError(null);
    try {
      const res = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
      const data = res.data;
      if (data.erro) {
        setCepError('CEP não encontrado');
      } else {
        setNewCliente({
          ...newCliente,
          endereco: {
            ...newCliente.endereco,
            cep: data.cep || rawCep,
            logradouro: data.logradouro || newCliente.endereco.logradouro,
            bairro: data.bairro || newCliente.endereco.bairro,
            cidade: data.localidade || newCliente.endereco.cidade,
            estado: data.uf || newCliente.endereco.estado,
            complemento: data.complemento || newCliente.endereco.complemento,
          },
        });
      }
    } catch (err) {
      setCepError('Erro ao consultar CEP');
      console.error(err);
    } finally {
      setLoadingCep(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { height: '90vh' } }}>
      <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.secondary.main }}>
        {editingId ? 'Editar Cliente' : 'Adicionar Cliente'}
      </DialogTitle>
      <DialogContent sx={{ p: 2, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Nome"
            value={newCliente.nome}
            onChange={(e) => setNewCliente({ ...newCliente, nome: e.target.value })}
            fullWidth
          />
          <TextField
            label="Telefone"
            value={newCliente.telefone}
            onChange={(e) => setNewCliente({ ...newCliente, telefone: e.target.value })}
            fullWidth
          />
          <TextField
            label="CPF"
            value={newCliente.cpf}
            onChange={(e) => setNewCliente({ ...newCliente, cpf: e.target.value })}
            fullWidth
          />
          <Typography variant="h6">Endereço</Typography>
          <TextField
            label="CEP"
            value={newCliente.endereco.cep}
            onChange={(e) => setNewCliente({ ...newCliente, endereco: { ...newCliente.endereco, cep: e.target.value } })}
            onBlur={handleCepBlur}
            error={!!cepError}
            helperText={cepError ?? ''}
            InputProps={{
              endAdornment: loadingCep ? <CircularProgress size={18} /> : undefined,
            }}
            fullWidth
          />
          <TextField
            label="Logradouro"
            value={newCliente.endereco.logradouro}
            onChange={(e) => setNewCliente({ ...newCliente, endereco: { ...newCliente.endereco, logradouro: e.target.value } })}
            fullWidth
          />
          <TextField
            label="Bairro"
            value={newCliente.endereco.bairro}
            onChange={(e) => setNewCliente({ ...newCliente, endereco: { ...newCliente.endereco, bairro: e.target.value } })}
            fullWidth
          />
          <TextField
            label="Cidade"
            value={newCliente.endereco.cidade}
            onChange={(e) => setNewCliente({ ...newCliente, endereco: { ...newCliente.endereco, cidade: e.target.value } })}
            fullWidth
          />
          <TextField
            label="Estado"
            value={newCliente.endereco.estado}
            onChange={(e) => setNewCliente({ ...newCliente, endereco: { ...newCliente.endereco, estado: e.target.value } })}
            fullWidth
          />
          <TextField
            label="Número"
            value={newCliente.endereco.numero}
            onChange={(e) => setNewCliente({ ...newCliente, endereco: { ...newCliente.endereco, numero: e.target.value } })}
            fullWidth
          />
          <TextField
            label="Complemento"
            value={newCliente.endereco.complemento || ''}
            onChange={(e) => setNewCliente({ ...newCliente, endereco: { ...newCliente.endereco, complemento: e.target.value } })}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 1 }}>
        <Button
          size="small"
          onClick={handleAddCliente}
          variant="contained"
          sx={{  width: '100%' }}
          disabled={addingCliente}
        >
          {addingCliente ? 'Salvando...' : (editingId ? 'Salvar' : 'Adicionar')}
        </Button>
        <Button size="small" onClick={onClose} sx={{ color: theme.palette.primary.main, width: '100%' }}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClienteModal;