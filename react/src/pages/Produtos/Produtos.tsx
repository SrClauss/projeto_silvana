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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Chip,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import type { Tag, Produto, Item, Saida, Entrada} from '../../types';

interface ProdutoData {
  codigo_interno: string;
  codigo_externo: string;
  descricao: string;
  marca_fornecedor: string;
  sessao: string;
  itens: Item[];
  saidas: Saida[];
  entradas: Entrada[];
  em_condicional: number;
  tags: Tag[];
  preco_custo: number;
  preco_venda: number;
}
import ProdutoModal from './components/ProdutoModal';

const Produtos: React.FC = () => {
  const theme = useTheme();
  const [, setProdutos] = useState<Produto[]>([]);
  const [filteredProdutos, setFilteredProdutos] = useState<Produto[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagOptions, setTagOptions] = useState<Tag[]>([]);
  const [tagInputValue, setTagInputValue] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [addingProduto, setAddingProduto] = useState(false);
  const [codigoError, setCodigoError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  const [newProduto, setNewProduto] = useState({
    codigo_interno: '',
    codigo_externo: '',
    descricao: '',
    marca_fornecedor: '',
    sessao: '',
    // store prices as reais (float) in the UI; convert to cents on submit
    preco_custo: 0.0,
    preco_venda: 0.0,
    tags: [] as Tag[],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewProduto, setViewProduto] = useState<Produto | null>(null);
  const [modalTagInput, setModalTagInput] = useState<string>('');

  useEffect(() => {
    if (openModal && editingId === null) {
      fetchLastCodigoSuggestion();
    }
  }, [openModal, editingId]);

  const formatCurrency = (value: number) => {
    // value is stored in cents on the backend
    if (value === null || value === undefined) return '-';
    try {
      const reais = value / 100;
      return reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } catch {
      return `R$ ${value / 100}`;
    }
  };

  const loadProdutos = async (q?: string, selectedTagsParam?: Tag[]) => {
    setLoadingProdutos(true);
    try {
      const token = localStorage.getItem('token');
      let prods: Produto[] = [];

      const query = q ?? searchQuery;
      const tagsParam = selectedTagsParam ?? selectedTags;

      if (query && query.trim() !== '' && tagsParam && tagsParam.length > 0) {
        // Search first, then filter by tags (server-side endpoint for combined filter not implemented)
        const res = await axios.get(`/produtos/search/?query=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${token}` } });
        prods = res.data;
        const tagIds = tagsParam.map(t => t._id);
        prods = prods.filter(p => p.tags && p.tags.some(t => tagIds.includes(t._id)));
      } else if (query && query.trim() !== '') {
        const res = await axios.get(`/produtos/search/?query=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${token}` } });
        prods = res.data;
      } else if (tagsParam && tagsParam.length > 0) {
        const tag_ids = tagsParam.map(t => t._id).join(',');
        const res = await axios.get(`/produtos/by-tags/?tag_ids=${encodeURIComponent(tag_ids)}`, { headers: { Authorization: `Bearer ${token}` } });
        prods = res.data;
      } else {
        const res = await axios.get('/produtos/', { headers: { Authorization: `Bearer ${token}` } });
        prods = res.data;
      }

      // ensure product prices are numbers and in cents from server (server stores cents)
      setProdutos(prods);
      setFilteredProdutos(prods);
      setPage(0);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoadingProdutos(false);
    }
  };

  const fetchTags = async () => {
    setLoadingTags(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/produtos/tags/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTags(response.data);
      setTagOptions(response.data);
    } catch (error) {
      console.error('Erro ao buscar tags:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  const fetchProdutoById = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/produtos/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.data as Produto;
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      return null;
    }
  };
  const searchTags = async (q: string) => {
    setLoadingTags(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/produtos/tags/search/?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTagOptions(response.data);
    } catch (error) {
      console.error('Erro ao buscar tags:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  const createTag = async (descricao: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/produtos/tags/', { descricao }, { headers: { Authorization: `Bearer ${token}` } });
      const created = res.data;
      // update local caches
      setTags((t) => [...t, created]);
      setTagOptions((t) => [...t, created]);
      return created;
    } catch (error) {
      console.error('Erro ao criar tag:', error);
      return null;
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const fetchLastCodigoSuggestion = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/produtos/codigo-interno/last', { headers: { Authorization: `Bearer ${token}` } });
      if (res.data && res.data.suggested) {
        setNewProduto((p) => ({ ...p, codigo_interno: res.data.suggested }));
      }
    } catch (error) {
      console.error('Erro ao buscar ultimo codigo interno:', error);
    }
  };

  const handleOpenModal = async () => {
    setEditingId(null);
    setCodigoError(null);
    setNewProduto({ codigo_interno: '', codigo_externo: '', descricao: '', marca_fornecedor: '', sessao: '', preco_custo: 0, preco_venda: 0, tags: [] });
    setOpenModal(true);
  };

  const handleEdit = async (id: string) => {
    const produto = await fetchProdutoById(id);
    if (!produto) return;
    // convert cents to reais
    setEditingId(id);
    setNewProduto({
      codigo_interno: produto.codigo_interno || '',
      codigo_externo: produto.codigo_externo || '',
      descricao: produto.descricao || '',
      marca_fornecedor: produto.marca_fornecedor || '',
      sessao: produto.sessao || '',
      preco_custo: (produto.preco_custo || 0) / 100,
      preco_venda: (produto.preco_venda || 0) / 100,
      tags: produto.tags || [],
    });
    setOpenModal(true);
  };

  const handleView = async (id: string) => {
    const produto = await fetchProdutoById(id);
    if (!produto) return;
    setViewProduto(produto);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirma exclusão deste produto?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/produtos/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await loadProdutos();
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
    }
  };
  const handleAddProduto = async () => {
    setAddingProduto(true);
    try {
      const token = localStorage.getItem('token');
      const produtoData: ProdutoData = {
        codigo_interno: newProduto.codigo_interno,
        codigo_externo: newProduto.codigo_externo,
        descricao: newProduto.descricao,
        marca_fornecedor: newProduto.marca_fornecedor,
        sessao: newProduto.sessao,
        itens: [],
        saidas: [],
        entradas: [],
        em_condicional: 0,
        tags: newProduto.tags,
        // convert to cents
        preco_custo: Math.round((newProduto.preco_custo || 0) * 100),
        preco_venda: Math.round((newProduto.preco_venda || 0) * 100),
      };

      if (editingId) {
        await axios.put(`/produtos/${editingId}`, produtoData, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('/produtos/', produtoData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setOpenModal(false);
      setEditingId(null);
      setNewProduto({
        codigo_interno: '',
        codigo_externo: '',
        descricao: '',
        marca_fornecedor: '',
        sessao: '',
        preco_custo: 0,
        preco_venda: 0,
        tags: [],
      });
      await loadProdutos();
    } catch (error) {
      console.error('Erro ao adicionar/atualizar produto:', error);
      if (axios.isAxiosError(error) && error?.response?.status === 400 && error.response.data?.detail === 'codigo_interno already exists') {
        setCodigoError('Código interno já existe. Buscando nova sugestão...');
        await fetchLastCodigoSuggestion();
      }
    } finally {
      setAddingProduto(false);
    }
  };

  const paginatedProdutos = filteredProdutos.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  useEffect(() => {
    fetchTags();
    loadProdutos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce tag search
  const tagSearchRef = useRef<number | null>(null);
  useEffect(() => {
    if (tagSearchRef.current) window.clearTimeout(tagSearchRef.current);
    if (!tagInputValue || tagInputValue.trim() === '') {
      setTagOptions(tags);
      return;
    }
    tagSearchRef.current = window.setTimeout(() => {
      searchTags(tagInputValue);
    }, 300) as unknown as number;
    return () => { if (tagSearchRef.current) window.clearTimeout(tagSearchRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagInputValue]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      loadProdutos(searchQuery, selectedTags);
    }, 300) as unknown as number;
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Reload when selected tags change
  useEffect(() => {
    loadProdutos(searchQuery, selectedTags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTags]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
      <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontFamily: 'serif', fontWeight: 700, mb: { xs: 2, md: 3 } }}>
        Produtos
      </Typography>

      <Paper sx={{ p: { xs: 2, md: 3 }, mb: { xs: 2, md: 3 }, borderRadius: 2, maxWidth: '100%' }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center' }}>
          <TextField
            size="small"
            label="Buscar por descrição"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: { sm: 160 }, width: { xs: '100%', sm: 'auto' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {loadingProdutos ? <CircularProgress size={16} sx={{ color: theme.palette.secondary.main }} /> : <Search sx={{ color: theme.palette.secondary.main }} />}
                </InputAdornment>
              ),
            }}
          />
          <Autocomplete
            multiple
            size="small"
            options={tagOptions}
            getOptionLabel={(option) => option.descricao}
            isOptionEqualToValue={(option, value) => option._id === value._id}
            value={selectedTags}
            onChange={(_event, newValue) => setSelectedTags(newValue)}
            inputValue={tagInputValue}
            onInputChange={(_e, v) => setTagInputValue(v)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option.descricao}
                  {...getTagProps({ index })}
                  sx={{ bgcolor: theme.palette.secondary.main, color: theme.palette.primary.main }}
                />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} size="small" label="Filtrar por tags" sx={{ minWidth: { sm: 160 }, width: { xs: '100%', sm: 'auto' } }} />
            )}
            sx={{ minWidth: { sm: 160 }, width: { xs: '100%', sm: 'auto' } }}
            loading={loadingTags}
          />
          <Button
            size="small"
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenModal}
          >
            Adicionar Produto
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: 2, maxWidth: '100%' }}>
        {loadingProdutos ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress sx={{ color: theme.palette.primary.main }} />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: theme.palette.primary.main }}>
                    <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>Código Interno</TableCell>
                    <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>Descrição</TableCell>
                    <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedProdutos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} sx={{ textAlign: 'center', py: 6, color: theme.palette.text.secondary }}>Nenhum produto encontrado</TableCell>
                    </TableRow>
                  ) : (
                    paginatedProdutos.map((produto) => (
                      <TableRow key={produto._id} hover>
                        <TableCell>{produto.codigo_interno}</TableCell>
                        <TableCell>{produto.descricao}</TableCell>
                        <TableCell>
                          <Button size="small" onClick={() => handleView(produto._id)} sx={{ mr: 1 }}>Ver</Button>
                          <Button size="small" onClick={() => handleEdit(produto._id)} sx={{ mr: 1 }}>Editar</Button>
                          <Button size="small" color="error" onClick={() => handleDelete(produto._id)}>Deletar</Button>
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
              count={filteredProdutos.length}
              rowsPerPage={rowsPerPage}
              page={Math.min(page, Math.max(0, Math.ceil(filteredProdutos.length / rowsPerPage) - 1))}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ color: theme.palette.primary.main }}
            />

            {/* View modal for full product info */}
            <Dialog open={!!viewProduto} onClose={() => setViewProduto(null)} maxWidth="md" fullWidth>
              <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.secondary.main }}>Produto</DialogTitle>
              <DialogContent>
                {viewProduto && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <Box>
                      <Typography variant="subtitle2">Código Interno</Typography>
                      <Typography>{viewProduto.codigo_interno}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2">Código Externo</Typography>
                      <Typography>{viewProduto.codigo_externo}</Typography>
                    </Box>
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <Typography variant="subtitle2">Descrição</Typography>
                      <Typography>{viewProduto.descricao}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2">Marca/Fornecedor</Typography>
                      <Typography>{viewProduto.marca_fornecedor}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2">Sessão</Typography>
                      <Typography>{viewProduto.sessao}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2">Preço Custo</Typography>
                      <Typography>{formatCurrency(viewProduto.preco_custo)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2">Preço Venda</Typography>
                      <Typography>{formatCurrency(viewProduto.preco_venda)}</Typography>
                    </Box>
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <Typography variant="subtitle2">Tags</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        {viewProduto.tags.map((t) => (
                          <Chip key={t._id} label={t.descricao} sx={{ bgcolor: theme.palette.secondary.main, color: theme.palette.primary.main }} />
                        ))}
                      </Box>
                    </Box>
                  </Box>
                )}
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button size="small" onClick={() => setViewProduto(null)}>Fechar</Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Paper>

      <ProdutoModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        editingId={editingId}
        newProduto={newProduto}
        setNewProduto={setNewProduto}
        codigoError={codigoError}
        setCodigoError={setCodigoError}
        addingProduto={addingProduto}
        handleAddProduto={handleAddProduto}
        modalTagInput={modalTagInput}
        setModalTagInput={setModalTagInput}
        tagOptions={tagOptions}
        loadingTags={loadingTags}
        searchTags={searchTags}
        createTag={createTag}
      />
    </Box>
  );
};

export default Produtos;