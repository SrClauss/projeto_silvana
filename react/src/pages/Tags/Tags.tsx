import React, { useEffect, useState } from 'react';
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
import { Add, Search, Visibility, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import type { Tag } from '../../types';
import TagsModal from './components/TagsModal';

const TagsPage: React.FC = () => {
  const theme = useTheme();
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    const filtered = tags.filter(t =>
      t.descricao.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredTags(filtered);
    setPage(0);
  }, [tags, searchQuery]);

  const loadTags = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/produtos/tags/', { headers: { Authorization: `Bearer ${token}` } });
      setTags(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
    setNewTag('');
    setOpenModal(true);
  };

  const handleEdit = async (id: string) => {
    const tag = tags.find(t => t._id === id);
    if (!tag) return;
    setEditingId(id);
    setNewTag(tag.descricao);
    setOpenModal(true);
  };

  const handleView = async (_id: string) => {
    // Implementar se necessário
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirma exclusão da tag?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/produtos/tags/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setTags((t) => t.filter(x => x._id !== id));
    } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    if (!newTag.trim()) return;
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      if (editingId) {
        await axios.put(`/produtos/tags/${editingId}`, { descricao: newTag.trim() }, { headers: { Authorization: `Bearer ${token}` } });
        setTags((t) => t.map(x => x._id === editingId ? { ...x, descricao: newTag.trim() } : x));
      } else {
        const res = await axios.post('/produtos/tags/', { descricao: newTag.trim() }, { headers: { Authorization: `Bearer ${token}` } });
        setTags((t) => [...t, res.data]);
      }
      setOpenModal(false);
      setNewTag('');
      setEditingId(null);
    } catch (e) {
      console.error(e);
    } finally { setCreating(false); }
  };

  const paginatedTags = filteredTags.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
      <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontFamily: 'serif', fontWeight: 700, mb: { xs: 2, md: 3 } }}>Tags</Typography>
      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2, borderRadius: 2, maxWidth: '100%' }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Buscar tags"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {loading ? <CircularProgress size={16} sx={{ color: theme.palette.secondary.main }} /> : <Search sx={{ color: theme.palette.secondary.main }} />}
                </InputAdornment>
              ),
            }}
            fullWidth
          />
          <Button size="small" variant="contained" startIcon={<Add />} onClick={handleOpenModal} sx={{  boxShadow: '0 6px 12px rgba(0,0,0,0.18)', textTransform: 'uppercase', fontWeight: 700 }}>
            Adicionar Tag
          </Button>
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead sx={{ bgcolor: theme.palette.primary.main }}>
                  <TableRow>
                    <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>Descrição</TableCell>
                    <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedTags.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} sx={{ textAlign: 'center', py: 6, color: theme.palette.text.secondary }}>Nenhuma tag encontrada</TableCell>
                    </TableRow>
                  ) : (
                    paginatedTags.map((tag) => (
                      <TableRow key={tag._id} hover>
                        <TableCell>{tag.descricao_case_insensitive ?? tag.descricao}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleView(tag._id)} aria-label="ver" sx={{ color: theme.palette.primary.main, mr: 1 }}>
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleEdit(tag._id)} aria-label="editar" sx={{ color: theme.palette.primary.main, mr: 1 }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(tag._id)} aria-label="deletar" sx={{ color: theme.palette.error?.main || 'red' }}>
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
              count={filteredTags.length}
              rowsPerPage={rowsPerPage}
              page={Math.min(page, Math.max(0, Math.ceil(filteredTags.length / rowsPerPage) - 1))}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Paper>
      <TagsModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        editingId={editingId}
        newTag={newTag}
        setNewTag={setNewTag}
        creating={creating}
        handleCreate={handleCreate}
      />
    </Box>
  );
};

export default TagsPage;
