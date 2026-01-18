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
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Stack,

} from '@mui/material';
import { Add, Search, Visibility, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import api from '../../lib/axios';
import { isAxiosError } from 'axios';
import type { Tag, Produto, Item, Saida, Entrada } from '../../types';

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
import ProdutoModal from '../../components/ProdutoModal';
import ShadowIconButton from '../../components/ShadowIconButton';

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
  const [tagFilterMode, setTagFilterMode] = useState<'AND' | 'OR'>('OR');
  const [openModal, setOpenModal] = useState(false);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
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
    itens: [] as Item[],
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
      let prods: Produto[] = [];

      const query = q ?? searchQuery;
      const tagsParam = selectedTagsParam ?? selectedTags;

      if (query && query.trim() !== '' && tagsParam && tagsParam.length > 0) {
        // Search first, then filter by tags (server-side endpoint for combined filter not implemented)
        const res = await api.get(`/produtos/search/?query=${encodeURIComponent(query)}`);
        prods = res.data;
        const tagIds = tagsParam.map(t => t._id);
        prods = prods.filter(p => {
          if (!p.tags) return false;
          return tagFilterMode === 'OR'
            ? p.tags.some(t => tagIds.includes(t._id))
            : tagIds.every(id => p.tags.some(t => t._id === id));
        });
      } else if (query && query.trim() !== '') {
        const res = await api.get(`/produtos/search/?query=${encodeURIComponent(query)}`);
        prods = res.data;
      } else if (tagsParam && tagsParam.length > 0) {
        const tag_ids = tagsParam.map(t => t._id).join(',');
        const res = await api.get(`/produtos/by-tags/?tag_ids=${encodeURIComponent(tag_ids)}&mode=${encodeURIComponent(tagFilterMode)}`);
        prods = res.data;
      } else {
        const res = await api.get('/produtos/');
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
      const response = await api.get('/produtos/tags/');
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
      const res = await api.get(`/produtos/${id}`);
      return res.data as Produto;
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      return null;
    }
  };
  const searchTags = async (q: string) => {
    setLoadingTags(true);
    try {
      const response = await api.get(`/produtos/tags/search/?q=${encodeURIComponent(q)}`);
      setTagOptions(response.data);
    } catch (error) {
      console.error('Erro ao buscar tags:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  const createTag = async (descricao: string) => {
    const trimmed = descricao.trim();
    if (!trimmed) {
      alert('Descrição da tag não pode ser vazia.');
      return null;
    }
    if (/\s/.test(descricao)) {
      alert('Tags não podem conter espaços. Use underscore (_) ou hífen (-) em vez de espaços.');
      return null;
    }
    try {
      const res = await api.post('/produtos/tags/', { descricao: trimmed });
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
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    try {
      const res = await api.get('/produtos/codigo-interno/last');
      if (res.data && res.data.suggested) {
        setNewProduto((p) => ({ ...p, codigo_interno: res.data.suggested }));
      }
    } catch (error) {
      // Tratar 401 separadamente para evitar logs desnecessários e informar o usuário
      if (isAxiosError(error) && error.response?.status === 401) {
        // opcional: limpar token e redirecionar para login
        // localStorage.removeItem('token');
        // window.location.href = '/login';
        return;
      }
      console.error('Erro ao buscar ultimo codigo interno:', error);
    }
  };

  const handleOpenModal = async () => {
    setEditingId(null);
    setNewProduto({ codigo_interno: '', codigo_externo: '', descricao: '', marca_fornecedor: '', sessao: '', preco_custo: 0, preco_venda: 0, tags: [], itens: [] });
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
      itens: produto.itens || [],
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
      await api.delete(`/produtos/${id}`);
      await loadProdutos();
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        const msg = error.response?.data?.detail || 'Produto está em condicional e não pode ser removido';
        // Mostrar erro de forma visível ao usuário
        alert(msg);
        return;
      }
      console.error('Erro ao deletar produto:', error);
    }
  };
  const handleAddProduto = async (produto: any) => {
    try {
      // token é gerenciado automaticamente pela instância `api`
      const produtoData: ProdutoData = {
        codigo_interno: produto.codigo_interno,
        codigo_externo: produto.codigo_externo,
        descricao: produto.descricao,
        marca_fornecedor: produto.marca_fornecedor,
        sessao: produto.sessao,
        itens: produto.itens,
        saidas: [],
        entradas: [],
        em_condicional: 0,
        tags: produto.tags,
        // convert to cents
        preco_custo: produto.preco_custo,
        preco_venda: produto.preco_venda,
      };

      if (editingId) {
        await api.put(`/produtos/${editingId}`, produtoData);
      } else {
        await api.post('/produtos/', produtoData);
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
        itens: [],
      });
      await loadProdutos();
    } catch (error) {
      console.error('Erro ao adicionar/atualizar produto:', error);
      if (isAxiosError(error) && error?.response?.status === 400 && error.response.data?.detail === 'codigo_interno already exists') {
        await fetchLastCodigoSuggestion();
      }
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

  // recarrega quando o modo de filtro mudar
  useEffect(() => {
    loadProdutos(searchQuery, selectedTags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagFilterMode]);

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontFamily: 'serif', fontWeight: 700, mb: { xs: 2, md: 3 } }}>
        Produtos
      </Typography>

      <Paper sx={{ p: { xs: 2, md: 3 }, mb: { xs: 2, md: 3 }, borderRadius: 2, maxWidth: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2}}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}>
            <TextField
              size="small"
              label="Buscar por descrição"
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{width: '100%', maxWidth: '100%'}}
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
              sx={{ width: '100%'}}
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
                <TextField {...params} size="small" label="Filtrar por tags" sx={{ minWidth: { sm: 160 }, width: '100%' }} />
              )}
              loading={loadingTags}
            />

                   <ShadowIconButton
                size="small"
                tooltip='Adicionar Produto'
                variant='primary'
                onClick={handleOpenModal}
              >
                <Add />
              </ShadowIconButton>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'center', alignItems: 'center' }}>


            <ToggleButtonGroup
              value={tagFilterMode}
              exclusive
              size="small"
              onChange={(_e, v) => { if (v) setTagFilterMode(v as 'AND' | 'OR'); }}
              sx={{ ml: 1 }}
              aria-label="Modo filtro por tags"
            >
              <ToggleButton value="OR" aria-label="Ou">QUALQUER TAG (OU)</ToggleButton>
              <ToggleButton value="AND" aria-label="E">TODAS AS TAGS (E)</ToggleButton>
            </ToggleButtonGroup>


       
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: 2, maxWidth: '100%' }}>
        {loadingProdutos ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress sx={{ color: theme.palette.primary.main }} />
          </Box>
        ) : (
          <>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
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
                            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', whiteSpace: 'nowrap' }}>
                              <IconButton size="small" onClick={() => handleView(produto._id)} aria-label="ver" title="Ver" sx={{ color: theme.palette.primary.main }}>
                                <Visibility fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleEdit(produto._id)} aria-label="editar" title="Editar" sx={{ color: theme.palette.primary.main }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDelete(produto._id)} aria-label="deletar" title="Deletar" sx={{ color: theme.palette.error?.main || 'red' }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
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
            </Box>

            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: theme.palette.primary.main }}>
                      <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600, width: 120 }}>Código Interno</TableCell>
                      <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600, minWidth: 360 }}>Descrição</TableCell>
                      <TableCell sx={{ color: theme.palette.secondary.main, fontWeight: 600, width: 140 }}>Ações</TableCell>
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
                          <TableCell sx={{ whiteSpace: 'normal' }}>{produto.descricao}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', whiteSpace: 'nowrap' }}>
                              <IconButton size="small" onClick={() => handleView(produto._id)} aria-label="ver" title="Ver" sx={{ color: theme.palette.primary.main }}>
                                <Visibility fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleEdit(produto._id)} aria-label="editar" title="Editar" sx={{ color: theme.palette.primary.main }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDelete(produto._id)} aria-label="deletar" title="Deletar" sx={{ color: theme.palette.error?.main || 'red' }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
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
            </Box>

            {/* View modal for full product info */}
            <Dialog open={!!viewProduto} onClose={() => setViewProduto(null)} maxWidth="md" fullWidth>
              <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.secondary.main }}>Visualizar Produto</DialogTitle>
              <DialogContent>
                {viewProduto && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, bgcolor: theme.palette.background.paper }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6">{viewProduto.descricao}</Typography>
                          <Typography variant="body2" color="text.secondary">{viewProduto.codigo_interno} • {viewProduto.codigo_externo}</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="subtitle2">Total em Estoque</Typography>
                          <Typography sx={{ fontWeight: 600, fontSize: 18 }}>
                            {viewProduto.itens ? viewProduto.itens.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : 0}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2">Detalhes</Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body2"><strong>Marca:</strong> {viewProduto.marca_fornecedor || '-'}</Typography>
                        <Typography variant="body2"><strong>Sessão:</strong> {viewProduto.sessao || '-'}</Typography>
                        <Typography variant="body2"><strong>Preço Custo:</strong> {formatCurrency(viewProduto.preco_custo)}</Typography>
                        <Typography variant="body2"><strong>Preço Venda:</strong> {formatCurrency(viewProduto.preco_venda)}</Typography>
                      </Paper>

                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2">Tags</Typography>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {viewProduto.tags && viewProduto.tags.length > 0 ? (
                            viewProduto.tags.map((t) => (
                              <Chip key={t._id} label={t.descricao_case_insensitive ?? t.descricao} title={t.descricao} variant="outlined" size="small" />
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">Sem tags</Typography>
                          )}
                        </Box>
                      </Paper>
                    </Box>

                    <Paper variant="outlined" sx={{ p: 1 }}>
                      <Typography variant="subtitle2" sx={{ px: 2, pt: 1 }}>Itens e Estoque</Typography>
                      <Divider sx={{ my: 1 }} />
                      {viewProduto.itens && viewProduto.itens.length > 0 ? (
                        <TableContainer component={Paper} sx={{ maxHeight: 280 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Data de Aquisição</TableCell>
                                <TableCell align="right">Quantidade</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {viewProduto.itens.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{item.acquisition_date ? new Date(item.acquisition_date).toLocaleDateString('pt-BR') : '-'}</TableCell>
                                  <TableCell align="right">{item.quantity ?? 0}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <tfoot>
                              <TableRow>
                                <TableCell><strong>Total</strong></TableCell>
                                <TableCell align="right"><strong>{viewProduto.itens.reduce((s, it) => s + (Number(it.quantity) || 0), 0)}</strong></TableCell>
                              </TableRow>
                            </tfoot>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Typography sx={{ p: 2 }}>Nenhum item em estoque.</Typography>
                      )}
                    </Paper>
                  </Box>
                )}
              </DialogContent>
              <DialogActions sx={{ p: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button size="small" color="primary" variant="outlined" onClick={() => { setOpenModal(true); setEditingId(viewProduto?._id ?? null); setViewProduto(null); }}>Editar</Button>
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
        onAddProduto={handleAddProduto}
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