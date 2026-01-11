import React, { useState, useEffect } from 'react';
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
  IconButton,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import { Add, Search, Edit, Delete } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import type { MarcaFornecedor } from '../../types';
import MarcaFornecedorModal from './components/MarcaFornecedorModal';

const MarcasFornecedores: React.FC = () => {
  const theme = useTheme();
  const [marcas, setMarcas] = useState<MarcaFornecedor[]>([]);
  const [filteredMarcas, setFilteredMarcas] = useState<MarcaFornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMarca, setEditingMarca] = useState<MarcaFornecedor | null>(null);

  useEffect(() => {
    loadMarcas();
  }, []);

  useEffect(() => {
    const filtered = marcas.filter(m =>
      m.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.fornecedor.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMarcas(filtered);
    setPage(0);
  }, [marcas, searchQuery]);

  const loadMarcas = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/marcas-fornecedores/', { headers: { Authorization: `Bearer ${token}` } });
      setMarcas(response.data);
    } catch (error) {
      console.error('Erro ao carregar marcas/fornecedores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (marca: MarcaFornecedor) => {
    if (editingMarca) {
      setMarcas(marcas.map(m => m._id === marca._id ? marca : m));
    } else {
      setMarcas([...marcas, marca]);
    }
  };

  const handleEdit = (marca: MarcaFornecedor) => {
    setEditingMarca(marca);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta marca/fornecedor?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/marcas-fornecedores/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        setMarcas(marcas.filter(m => m._id !== id));
      } catch (error) {
        console.error('Erro ao excluir marca/fornecedor:', error);
      }
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedMarcas = filteredMarcas.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box id="marcas-root" sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%' }}>
      <Typography id="marcas-title" variant="h4" sx={{ color: theme.palette.primary.main, fontFamily: 'serif', fontWeight: 700, mb: { xs: 2, md: 3 }, textAlign: 'left' }}>
        Marcas/Fornecedores
      </Typography>

      <Paper id="marcas-paper" sx={{ 
        p: { xs: 2, md: 3 }, 
        mb: 2, 
        width: { xs: '100%', md: 'min(1400px, 100%)' },
        mx: { xs: 0, md: 'auto' },
        maxWidth: '100%'
      }}>
        <Box id="marcas-controls" sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <TextField
              id="marcas-search"
              size="small"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: theme.palette.secondary.main }} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: '100%' }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              id="marcas-add-button"
              size="small"
              variant="contained"
              startIcon={<Add />}
              onClick={() => { setEditingMarca(null); setModalOpen(true); }}
            >
              Adicionar
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress sx={{ color: theme.palette.primary.main }} />
          </Box>
        ) : (
          <>
            <TableContainer id="marcas-table-container" sx={{ width: '100%' }}>
              <Table id="marcas-table" sx={{ tableLayout: 'auto' }}>
                <TableHead id="marcas-table-head" sx={{ bgcolor: theme.palette.primary.main }}>
                  <TableRow>
                    <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>Nome</TableCell>
                    <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>Fornecedor</TableCell>
                    <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody id="marcas-table-body">
                  {paginatedMarcas.map((marca) => (
                    <TableRow key={marca._id} id={`marcas-row-${marca._id}`}>
                      <TableCell id={`marcas-name-${marca._id}`}>{marca.nome}</TableCell>
                      <TableCell id={`marcas-fornecedor-${marca._id}`}>{marca.fornecedor}</TableCell>
                      <TableCell id={`marcas-actions-${marca._id}`}>
                        <IconButton id={`marcas-edit-${marca._id}`} onClick={() => handleEdit(marca)} sx={{ color: theme.palette.secondary.main }}>
                          <Edit />
                        </IconButton>
                        <IconButton id={`marcas-delete-${marca._id}`} onClick={() => handleDelete(marca._id)} sx={{ color: theme.palette.error?.main || 'red' }}>
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredMarcas.length}
              rowsPerPage={rowsPerPage}
              page={Math.min(page, Math.max(0, Math.ceil(filteredMarcas.length / rowsPerPage) - 1))}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ color: theme.palette.primary.main }}
            />
          </>
        )}
      </Paper>

      <MarcaFornecedorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingMarca={editingMarca}
        onSave={handleSave}
      />
    </Box>
  );
};

export default MarcasFornecedores;