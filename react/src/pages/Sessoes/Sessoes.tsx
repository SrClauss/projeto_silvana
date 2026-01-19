import React, { useState, useEffect } from 'react';
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
  IconButton,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import { Add, Search, Edit, Delete } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import api from '../../lib/axios';
import type { Sessao } from '../../types';
import SessaoModal from './components/SessaoModal';
import ShadowIconButton from '../../components/ShadowIconButton';
import Title from '../../components/Title';

const Sessoes: React.FC = () => {
  const theme = useTheme();
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [filtered, setFiltered] = useState<Sessao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSessao, setEditingSessao] = useState<Sessao | null>(null);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const filteredList = sessoes.filter(s => s.nome.toLowerCase().includes(searchQuery.toLowerCase()) || (s.localizacao || '').toLowerCase().includes(searchQuery.toLowerCase()));
    setFiltered(filteredList);
    setPage(0);
  }, [sessoes, searchQuery]);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/sessoes/', { headers: { Authorization: `Bearer ${token}` } });
      setSessoes(res.data);
    } catch (e) {
      console.error('Erro ao carregar sessoes', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (s: Sessao) => {
    if (editingSessao) setSessoes(prev => prev.map(p => p._id === s._id ? s : p));
    else setSessoes(prev => [s, ...prev]);
  };

  const handleEdit = (s: Sessao) => { setEditingSessao(s); setModalOpen(true); };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirma exclusão da sessão?')) return;
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/sessoes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSessoes(prev => prev.filter(p => p._id !== id));
    } catch (e) {
      console.error('Erro ao excluir', e);
    }
  };

  const handleChangePage = (_e: unknown, newPage: number) => { setPage(newPage); };
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%' }}>
      <Title text="Sessões" subtitle='Localização de Produtos'/>

      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField size="small" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><Search sx={{ color: theme.palette.secondary.main }} /></InputAdornment>) }} sx={{ flex: 1 }} />
          <ShadowIconButton
            variant="primary"
            onClick={() => { setEditingSessao(null); setModalOpen(true); }}
            tooltip= 'Adicionar Sessões'
          >
            <Add />
          </ShadowIconButton>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}><CircularProgress sx={{ color: theme.palette.primary.main }} /></Box>
        ) : (
          <>
            <TableContainer sx={{ width: '100%' }}>
              <Table>
                <TableHead sx={{ bgcolor: theme.palette.primary.main }}>
                  <TableRow>
                    <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>Nome</TableCell>
                    <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>Localização</TableCell>
                    <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((s) => (
                    <TableRow key={s._id}>
                      <TableCell>{s.nome}</TableCell>
                      <TableCell>{s.localizacao}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleEdit(s)} sx={{ color: theme.palette.secondary.main }}><Edit /></IconButton>
                        <IconButton onClick={() => handleDelete(s._id)} sx={{ color: theme.palette.error?.main || 'red' }}><Delete /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination rowsPerPageOptions={[5,10,25]} component="div" count={filtered.length} rowsPerPage={rowsPerPage} page={Math.min(page, Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1))} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} sx={{ color: theme.palette.primary.main }} />
          </>
        )}
      </Paper>

      <SessaoModal open={modalOpen} onClose={() => setModalOpen(false)} editingSessao={editingSessao} onSave={handleSave} />
    </Box>
  );
};

export default Sessoes;
