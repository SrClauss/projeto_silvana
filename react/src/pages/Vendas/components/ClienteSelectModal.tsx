import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import axios from 'axios';
import type { Cliente } from '../../../types';


interface ClienteSelectModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (cliente: Cliente) => void;
}

const ClienteSelectModal: React.FC<ClienteSelectModalProps> = ({ open, onClose, onSelect }) => {
  const [s, setS] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [openNew, setOpenNew] = useState(false);
  const [newCliente, setNewCliente] = useState({ nome: '', telefone: '', endereco: { cep: '', logradouro: '', bairro: '', cidade: '', estado: '', numero: '', complemento: '' }, cpf: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => { if (open) load(''); }, [open]);

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let res;
      if (q && q.trim()) res = await axios.get(`/clientes/?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } });
      else res = await axios.get('/clientes/', { headers: { Authorization: `Bearer ${token}` } });
      setClientes(res.data);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (v: string) => { setS(v); load(v); };

  const handleSelect = (c: Cliente) => { onSelect(c); onClose(); };

  const handleCreate = async () => {
    setAdding(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/clientes/', newCliente, { headers: { Authorization: `Bearer ${token}` } });
      if (res?.data?.id) {
        const created = await axios.get(`/clientes/${res.data.id}`, { headers: { Authorization: `Bearer ${token}` } });
        setClientes(prev => [created.data, ...prev]);
        // select created automatically
        onSelect(created.data);
        setOpenNew(false);
        onClose();
      } else {
        // fallback: reload list
        await load('');
      }
    } catch (e) {
      console.error('Erro ao criar cliente:', e);
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Selecionar Cliente</DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField size="small" placeholder="Buscar por nome ou CPF" value={s} onChange={(e) => handleSearch(e.target.value)} fullWidth />
            <IconButton onClick={() => setOpenNew(true)}>
              <Add />
            </IconButton>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Telefone</TableCell>
                    <TableCell>CPF</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clientes.map((c) => (
                    <TableRow key={c._id} hover>
                      <TableCell>{c.nome}</TableCell>
                      <TableCell>{c.telefone}</TableCell>
                      <TableCell>{c.cpf}</TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => handleSelect(c)}>Selecionar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openNew} onClose={() => setOpenNew(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Cliente</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Nome" value={newCliente.nome} onChange={(e) => setNewCliente({ ...newCliente, nome: e.target.value })} fullWidth />
            <TextField label="Telefone" value={newCliente.telefone} onChange={(e) => setNewCliente({ ...newCliente, telefone: e.target.value })} fullWidth />
            <TextField label="CPF" value={newCliente.cpf} onChange={(e) => setNewCliente({ ...newCliente, cpf: e.target.value })} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNew(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={adding}>{adding ? 'Salvando...' : 'Adicionar'}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ClienteSelectModal;
