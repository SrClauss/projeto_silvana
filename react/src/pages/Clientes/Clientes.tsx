import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Add, Search, Visibility, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import type { Cliente } from '../../types';

interface ClienteData {
  nome: string;
  telefone: string;
  endereco: {
    cep: string;
    logradouro: string;
    bairro: string;
    cidade: string;
    estado: string;
    numero: string;
    complemento?: string;
  };
  cpf: string;
}

import ClienteModal from './components/ClienteModal';

const Clientes: React.FC = () => {
  const theme = useTheme();
  const [, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<number | null>(null);

  const [openModal, setOpenModal] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [addingCliente, setAddingCliente] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newCliente, setNewCliente] = useState<ClienteData>({
    nome: '',
    telefone: '',
    endereco: {
      cep: '',
      logradouro: '',
      bairro: '',
      cidade: '',
      estado: '',
      numero: '',
      complemento: '',
    },
    cpf: '',
  });

  useEffect(() => {
    loadClientes();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      filterClientes();
    }, 300);
  }, [searchQuery]);

  const loadClientes = async (q?: string) => {
    setLoadingClientes(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/clientes/', { headers: { Authorization: `Bearer ${token}` } });
      const clientes: Cliente[] = res.data;
      setClientes(clientes);
      setFilteredClientes(q ? clientes.filter(c => c.nome.toLowerCase().includes(q.toLowerCase()) || c.cpf.includes(q)) : clientes);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      setFilteredClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  };

  const filterClientes = () => {
    loadClientes(searchQuery);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenModal = () => {
    setEditingId(null);
    setNewCliente({
      nome: '',
      telefone: '',
      endereco: {
        cep: '',
        logradouro: '',
        bairro: '',
        cidade: '',
        estado: '',
        numero: '',
        complemento: '',
      },
      cpf: '',
    });
    setOpenModal(true);
  };

  const handleEdit = async (id: string) => {
    const cliente = await fetchClienteById(id);
    if (!cliente) return;
    setEditingId(id);
    setNewCliente({
      nome: cliente.nome,
      telefone: cliente.telefone,
      endereco: cliente.endereco,
      cpf: cliente.cpf,
    });
    setOpenModal(true);
  };

  const handleView = async (id: string) => {
    const cliente = await fetchClienteById(id);
    if (!cliente) return;
    // Implementar visualização se necessário
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirma exclusão deste cliente?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/clientes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await loadClientes();
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
    }
  };

  const fetchClienteById = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/clientes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.data as Cliente;
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      return null;
    }
  };

  const handleAddCliente = async () => {
    setAddingCliente(true);
    try {
      const token = localStorage.getItem('token');
      const clienteData: ClienteData = newCliente;
      if (editingId) {
        await axios.put(`/clientes/${editingId}`, clienteData, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('/clientes/', clienteData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setOpenModal(false);
      setEditingId(null);
      setNewCliente({
        nome: '',
        telefone: '',
        endereco: {
          cep: '',
          logradouro: '',
          bairro: '',
          cidade: '',
          estado: '',
          numero: '',
          complemento: '',
        },
        cpf: '',
      });
      await loadClientes();
    } catch (error) {
      console.error('Erro ao adicionar/atualizar cliente:', error);
    } finally {
      setAddingCliente(false);
    }
  };

  const paginatedClientes = filteredClientes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
      <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontFamily: 'serif', fontWeight: 700, mb: { xs: 2, md: 3 } }}>Clientes</Typography>
      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2, borderRadius: 2, maxWidth: '100%' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            label="Buscar por nome ou CPF"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: { sm: 320 }, width: { xs: '100%', sm: 'auto' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {loadingClientes ? <CircularProgress size={16} sx={{ color: theme.palette.secondary.main }} /> : <Search sx={{ color: theme.palette.secondary.main }} />}
                </InputAdornment>
              ),
            }}
          />

          <TextField
            size="small"
            label="Filtrar"
            variant="outlined"
            sx={{ minWidth: { sm: 160 }, width: { xs: '100%', sm: 'auto' } }}
            disabled
          />

          <Button
            size="small"
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenModal}
            sx={{
              bgcolor: theme.palette.secondary.main,
              color: theme.palette.primary.main,
              boxShadow: '0 8px 18px rgba(0,0,0,0.25)',
              borderRadius: '10px',
              px: 3,
              py: 1.2,
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Adicionar Cliente
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: 2, maxWidth: '100%', p: 0 }}>
        {loadingClientes ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress sx={{ color: theme.palette.primary.main }} />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead sx={{ bgcolor: theme.palette.primary.main }}>
                  <TableRow>
                    <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>Nome</TableCell>
                    <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>Telefone</TableCell>
                    <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>CPF</TableCell>
                    <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedClientes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ textAlign: 'center', py: 6, color: theme.palette.text.secondary }}>Nenhum cliente encontrado</TableCell>
                    </TableRow>
                  ) : (
                    paginatedClientes.map((cliente) => (
                      <TableRow key={cliente._id} hover>
                        <TableCell>{cliente.nome}</TableCell>
                        <TableCell>{cliente.telefone}</TableCell>
                        <TableCell>{cliente.cpf}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleView(cliente._id)} aria-label="ver" sx={{ color: theme.palette.primary.main, mr: 1 }}>
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleEdit(cliente._id)} aria-label="editar" sx={{ color: theme.palette.primary.main, mr: 1 }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(cliente._id)} aria-label="deletar" sx={{ color: theme.palette.error?.main || 'red' }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredClientes.length}
              rowsPerPage={rowsPerPage}
              page={Math.min(page, Math.max(0, Math.ceil(filteredClientes.length / rowsPerPage) - 1))}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Paper>
      <ClienteModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        editingId={editingId}
        newCliente={newCliente}
        setNewCliente={setNewCliente}
        addingCliente={addingCliente}
        handleAddCliente={handleAddCliente}
      />
    </Box>
  );
};

export default Clientes;