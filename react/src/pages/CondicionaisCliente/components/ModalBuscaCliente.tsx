import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  CircularProgress,
} from '@mui/material';
import api from '../../../lib/axios';
import type { Cliente } from '../../../types';

interface ModalBuscaClienteProps {
  open: boolean;
  onClose: () => void;
  onClientSelect: (cliente: Cliente, fromSearch: boolean) => void;
}

const ModalBuscaCliente: React.FC<ModalBuscaClienteProps> = ({
  open,
  onClose,
  onClientSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const searchClientes = async (query: string) => {
    if (!query.trim()) {
      setClientes([]);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params: { q?: string; cpf?: string } = {};
      // Se for numérico, assume CPF, senão nome
      if (/^\d+$/.test(query.trim())) {
        params.cpf = query.trim();
      } else {
        params.q = query.trim();
      }
      const res = await api.get('/clientes/', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setClientes(res.data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    searchClientes(value);
  };

  const handleSelectCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
  };

  const handleOk = () => {
    if (selectedCliente) {
      onClientSelect(selectedCliente, false);
      onClose();
      setSearchQuery('');
      setClientes([]);
      setSelectedCliente(null);
    }
  };

  const handleCancel = () => {
    onClose();
    setSearchQuery('');
    setClientes([]);
    setSelectedCliente(null);
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Buscar Cliente</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Pesquisar por Nome ou CPF"
          fullWidth
          variant="outlined"
          value={searchQuery}
          onChange={handleSearchChange}
        />
        {loading && <CircularProgress size={24} />}
        <List>
          {clientes.map((cliente) => (
            <ListItem key={cliente._id} disablePadding>
              <ListItemButton
                selected={selectedCliente?._id === cliente._id}
                onClick={() => handleSelectCliente(cliente)}
              >
                <ListItemText
                  primary={cliente.nome}
                  secondary={`CPF: ${cliente.cpf} | Telefone: ${cliente.telefone}`}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancelar</Button>
        <Button onClick={handleOk} disabled={!selectedCliente}>
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModalBuscaCliente;