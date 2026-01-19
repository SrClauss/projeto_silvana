import React, { useState, useEffect, useRef } from 'react';
import {
  Box,

  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  CircularProgress,
  IconButton,
} from '@mui/material';
import Title from '../../components/Title';
import { Add, Visibility, Edit as EditIcon, Delete as DeleteIcon,  Autorenew, History } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import api from '../../lib/axios'
import { useNavigate } from 'react-router-dom';
import type { Cliente } from '../../types';
import ShadowIconButton from '../../components/ShadowIconButton';

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
import ClienteViewModal from './components/ClienteViewModal';
import DeleteModal from '../../components/DeleteModal';

const Clientes: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [page, setPage] = useState(0);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [entityIdToDelete, setEntityIdToDelete] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [nameFilter, setNameFilter] = useState('');
  const nameDebounceRef = useRef<number | null>(null);
  const [cpfFilter, setCpfFilter] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [viewCliente, setViewCliente] = useState<Cliente | null>(null);
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
  const getByCPF = async (cpf: string): Promise<Cliente[]> => {
    try {
      const token = localStorage.getItem('token');
      console.log('Buscando CPF:', cpf);

      // Primeiro tentar busca geral
      const res = await api.get(`/clientes/?q=${encodeURIComponent(cpf)}`, { headers: { Authorization: `Bearer ${token}` } });
      const clientes: Cliente[] = res.data;
      console.log('Clientes retornados da busca geral:', clientes);

      // Filtrar apenas clientes com CPF exato
      const clienteExato = clientes.filter(cliente => {
        console.log('Comparando:', cliente.cpf, '===', cpf, '?', cliente.cpf === cpf);
        return cliente.cpf === cpf;
      });

      console.log('Clientes filtrados por CPF exato:', clienteExato);

      // Se não encontrou, tentar busca sem query para ver todos os clientes
      if (clienteExato.length === 0) {
        console.log('Nenhum cliente encontrado com CPF exato, buscando todos os clientes...');
        const allRes = await api.get('/clientes/', { headers: { Authorization: `Bearer ${token}` } });
        const allClientes: Cliente[] = allRes.data;
        console.log('Todos os clientes:', allClientes.map(c => ({ nome: c.nome, cpf: c.cpf })));

        const clienteFromAll = allClientes.filter(cliente => cliente.cpf === cpf);
        console.log('Cliente encontrado em busca completa:', clienteFromAll);
        return clienteFromAll;
      }

      return clienteExato;
    } catch (error) {
      console.error('Erro ao buscar cliente por CPF:', error);
      return [];
    }
  }
  const handleOpenDeleteModal = (id: string) => {
    setEntityIdToDelete(id);
    setOpenDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!entityIdToDelete) return;
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/clientes/${entityIdToDelete}`, { headers: { Authorization: `Bearer ${token}` } });
      await loadClientes();
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
    } finally {
      setOpenDeleteModal(false);
      setEntityIdToDelete(null);
    }
  }
  useEffect(() => {
    loadClientes();
  }, []);



  const handleCpfKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && cpfFilter.trim()) {
      loadClientesByCPF(cpfFilter.trim());
    }
  };

  useEffect(() => {
    if (nameDebounceRef.current) window.clearTimeout(nameDebounceRef.current);
    nameDebounceRef.current = window.setTimeout(() => {
      if (!cpfFilter.trim()) {
        loadClientes(nameFilter);
      }
    }, 300) as unknown as number;
    return () => {
      if (nameDebounceRef.current) window.clearTimeout(nameDebounceRef.current);
    };
  }, [nameFilter]);

  const loadClientes = async (q?: string) => {
    setLoadingClientes(true);
  
    try {
      const token = localStorage.getItem('token');
      let res;
      if (q && q.trim()) {
        res = await api.get(`/clientes/?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        res = await api.get('/clientes/', { headers: { Authorization: `Bearer ${token}` } });
      }
      const clientes: Cliente[] = res.data;
      setClientes(clientes);
      setFilteredClientes(clientes);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      setFilteredClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  };

  const loadClientesByCPF = async (cpf: string) => {
    setLoadingClientes(true);
    try {
      const clientes = await getByCPF(cpf);
      setClientes(clientes);
      setFilteredClientes(clientes);
    } catch (error) {
      console.error('Erro ao carregar cliente por CPF:', error);
      setFilteredClientes([]);
    } finally {
      setLoadingClientes(false);
    }
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
    setViewCliente(cliente);
    setOpenViewModal(true);
  };


  const fetchClienteById = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get(`/clientes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
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
        await api.put(`/clientes/${editingId}`, clienteData, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await api.post('/clientes/', clienteData, {
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
    <Box width="100%">

      <Title

        text="Clientes"
        subtitle=""
      />
      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2, borderRadius: 2, maxWidth: '100%' }}>
        <Box sx={{ display: 'flex', gap:2 , alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' }, mb: 2 }}>
        

          <TextField
            size="small"
            label="Filtrar por nome"
            variant="outlined"
            value={nameFilter}

            sx={{width: '100%'}}
            onChange={(e) => setNameFilter(e.target.value)}
          />

          <TextField
            size="small"
            label="Buscar por CPF"
            variant="outlined"
            value={cpfFilter}
            sx={{width: '100%'}}
            onChange={(e) => setCpfFilter(e.target.value)}
            onKeyDown={handleCpfKeyDown}
            placeholder="Digite o CPF e pressione Enter"
          />
          

        

          <ShadowIconButton
            tooltip="Adicionar Cliente"
            size="small"
            variant="primary"
            onClick={handleOpenModal}
            shadowIntensity="strong"
            
          >
            <Add />
          </ShadowIconButton>
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
                          
                          <IconButton size="small" onClick={() => navigate(`/clientes/vendas/${cliente._id}`)} aria-label="histórico de vendas" sx={{ color: theme.palette.primary.main, mr: 1 }}>
                            <History fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => navigate(`/condicionais-cliente/criar?cliente_id=${cliente._id}`)} aria-label="criar condicional" sx={{ color: theme.palette.primary.main, mr: 1 }}>
                            <Autorenew fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleView(cliente._id)} aria-label="ver" sx={{ color: theme.palette.primary.main, mr: 1 }}>
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleEdit(cliente._id)} aria-label="editar" sx={{ color: theme.palette.primary.main, mr: 1 }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleOpenDeleteModal(cliente._id)} aria-label="deletar" sx={{ color: theme.palette.error?.main || 'red' }}>
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
      <DeleteModal

        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={handleDelete}
        title="Confirmar Deleção"
        message="Tem certeza que deseja deletar este cliente?"
        entityId={entityIdToDelete || undefined}
      />
      <ClienteViewModal
        open={openViewModal}
        onClose={() => { setOpenViewModal(false); setViewCliente(null); }}
        cliente={viewCliente}
      />
    </Box>
  );
};

export default Clientes;