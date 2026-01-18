import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Paper, Typography, List, ListItem, ListItemText, Divider, Alert, Autocomplete, Chip, ToggleButtonGroup, ToggleButton, Fab, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { PersonAdd as PersonAddIcon, Add as AddIcon } from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import type { AutocompleteRenderInputParams } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/axios';
import type { Produto, Cliente, Item, Tag } from '../../types';
import ClienteModal from '../Clientes/components/ClienteModal';
import ShadowIconButton from '../../components/ShadowIconButton';  

type ItemCondicional = {
  id: string;
  produto: Produto | null;
  quantidade: number;
  valorTotal: number;
  observacao: string;
  expanded: boolean;
  query: string;
};

const CriarCondicionalCliente: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialProdutoId = searchParams.get('produto_id') ?? undefined;
  const initialClienteId = searchParams.get('cliente_id') ?? undefined;

  const [produtoQuery] = useState('');
  const [produtoResults, setProdutoResults] = useState<Produto[]>([]);

  // Tag search
  const [tagOptions, setTagOptions] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagFilterMode, setTagFilterMode] = useState<'OR' | 'AND'>('OR');

  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteResults, setClienteResults] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [cpfFilter, setCpfFilter] = useState('');
  const [newCliente, setNewCliente] = useState({
    nome: '',
    telefone: '',
    endereco: { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' },
    cpf: '',
  });
  const [addingCliente, setAddingCliente] = useState(false);

  const [itensCondicional, setItensCondicional] = useState<ItemCondicional[]>([]);
  const [observacaoGeral, setObservacaoGeral] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemCondicional | null>(null);

  useEffect(() => {
    // if page opened with produto_id / cliente_id in query, fetch details
    const pid = initialProdutoId;
    const cid = initialClienteId;
    if (pid) fetchProdutoById(pid);
    if (cid) fetchClienteById(cid);

    // preload tags so they appear immediately
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addItem = () => {
    const newItem: ItemCondicional = {
      id: Date.now().toString(),
      produto: null,
      quantidade: 1,
      valorTotal: 0,
      observacao: '',
      expanded: false,
      query: '',
    };
    setItensCondicional(prev => [...prev, newItem]);
  };

  const addItemWithProduct = (p: Produto) => {
    const preco = p.preco_venda || 0;
    const newItem: ItemCondicional = {
      id: Date.now().toString(),
      produto: p,
      quantidade: 1,
      valorTotal: preco,
      observacao: '',
      expanded: false,
      query: `${p.codigo_interno} — ${p.descricao}`,
    };
    setItensCondicional(prev => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItensCondicional(prev => prev.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<ItemCondicional>) => {
    setItensCondicional(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const openEditModal = (item: ItemCondicional) => {
    setEditingItem(item);
    setEditModalOpen(true);
  };

  const saveEditModal = () => {
    if (editingItem) {
      updateItem(editingItem.id, { quantidade: editingItem.quantidade, observacao: editingItem.observacao });
    }
    setEditModalOpen(false);
    setEditingItem(null);
  };

  // helper para estoque disponível exibido no dropdown
  const getAvailableStock = (p: Produto) => {
    return (p.itens || []).filter((it: Item) => !it.condicional_fornecedor_id && !it.condicional_cliente_id).reduce((s: number, it: Item) => s + (it.quantity || 0), 0);
  };

  const fetchProdutoById = async (id: string) => {
    try {
      const res = await api.get(`/produtos/${id}`);
      const produto = res.data;
      const preco = produto.preco_venda ?? 0;
      const newItem: ItemCondicional = {
        id: Date.now().toString(),
        produto,
        quantidade: 1,
        valorTotal: preco,
        observacao: '',
        expanded: false,
        query: `${produto.codigo_interno} — ${produto.descricao}`,
      };
      setItensCondicional(prev => [...prev, newItem]);
    } catch (e) {
      console.error(e);
    }
  };

  const [tagError, setTagError] = useState<string | null>(null);

  type AxiosErrorLike = { response?: { data?: { detail?: string }; status?: number } };
  const fetchTags = async () => {
    setLoadingTags(true);
    setTagError(null);
    try {
      const res = await api.get('/produtos/tags/');
      
      setTagOptions(res.data || []);
    } catch (e: unknown) {
      console.error('Erro ao buscar tags:', e);
      // if unauthorized
      if (e && typeof e === 'object' && 'response' in e) {
        const r = (e as AxiosErrorLike).response;
        if (r?.status === 401) {
          setTagError('Faça login para ver tags');
        } else {
          setTagError('Erro ao buscar tags');
        }
      } else {
        setTagError('Erro ao buscar tags');
      }
    } finally {
      setLoadingTags(false);
    }
  };

  const fetchClienteById = async (id: string) => {
    try {
      const res = await api.get(`/clientes/${id}`);
      setSelectedCliente(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const searchClientes = async (q: string) => {
    try {
      let res;
      if (q && q.trim()) res = await api.get(`/clientes/?q=${encodeURIComponent(q)}`);
      else res = await api.get('/clientes/');
      setClienteResults(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const getByCPF = async (cpf: string): Promise<Cliente[]> => {
    try {
      console.log('Buscando CPF:', cpf);
      // Usar busca geral e filtrar por CPF exato
      const res = await api.get(`/clientes/?q=${encodeURIComponent(cpf)}`);
      const clientes: Cliente[] = res.data;
      console.log('Clientes retornados da busca geral:', clientes);

      // Filtrar apenas clientes com CPF exato
      const clienteExato = clientes.filter(cliente => {
        console.log('Comparando:', cliente.cpf, '===', cpf, '?', cliente.cpf === cpf);
        return cliente.cpf === cpf;
      });

      console.log('Clientes filtrados por CPF exato:', clienteExato);

      // Se não encontrou, tentar busca sem query
      if (clienteExato.length === 0) {
        console.log('Nenhum cliente encontrado com CPF exato, buscando todos...');
        const allRes = await api.get('/clientes/');
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
  };

  const handleCpfKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && cpfFilter.trim()) {
      loadClientesByCPF(cpfFilter.trim());
    }
  };

  const loadClientesByCPF = async (cpf: string) => {
    try {
      const clientes = await getByCPF(cpf);
      setClienteResults(clientes);
    } catch (error) {
      console.error('Erro ao carregar cliente por CPF:', error);
      setClienteResults([]);
    }
  };

  const produtoSearchTimer = useRef<number | null>(null);

  useEffect(() => {
    if (produtoSearchTimer.current) window.clearTimeout(produtoSearchTimer.current);
    produtoSearchTimer.current = window.setTimeout(async () => {
      const q = produtoQuery?.trim();
      if ((!q || q === '') && selectedTags.length === 0) {
        setProdutoResults([]);
        return;
      }
      try {
        let prods: Produto[] = [];
        if (q) {
          const res = await api.get(`/produtos/search/?query=${encodeURIComponent(q)}`);
          prods = res.data || [];
        } else if (selectedTags.length > 0) {
          const tag_ids = selectedTags.map(t => t._id).join(',');
          const res = await api.get(`/produtos/by-tags/?tag_ids=${encodeURIComponent(tag_ids)}&mode=${encodeURIComponent(tagFilterMode)}`);
          prods = res.data || [];
        }

        // apply client-side tag filter if tags are selected and we have server results
        if (selectedTags.length > 0) {
          const tagIds = selectedTags.map(t => t._id);
          if (tagFilterMode === 'OR') {
            prods = prods.filter(p => p.tags && p.tags.some((t: Tag) => tagIds.includes(t._id)));
          } else {
            prods = prods.filter(p => p.tags && tagIds.every(id => p.tags.some((t: Tag) => t._id === id)));
          }
        }

        setProdutoResults(prods);
      } catch (e) {
        console.error('Erro ao buscar produtos:', e);
        setProdutoResults([]);
      }
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtoQuery, selectedTags, tagFilterMode]);

  useEffect(() => {
    if (clienteQuery.length >= 2) {
      const t = setTimeout(() => searchClientes(clienteQuery), 250);
      return () => clearTimeout(t);
    } else {
      setClienteResults([]);
    }
  }, [clienteQuery]);

  const handleSelectCliente = (c: Cliente) => {
    setSelectedCliente(c);
    setClienteResults([]);
  };

  const handleAddCliente = async () => {
    setAddingCliente(true);
    try {
      const res = await api.post('/clientes/', newCliente);
      setSelectedCliente(res.data);
      setClienteModalOpen(false);
      setNewCliente({
        nome: '',
        telefone: '',
        endereco: { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' },
        cpf: '',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Erro ao adicionar cliente');
    } finally {
      setAddingCliente(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!selectedCliente) return setError('Selecione um cliente');
    if (itensCondicional.length === 0) return setError('Adicione pelo menos um produto');
    for (const item of itensCondicional) {
      if (!item.produto) return setError('Selecione um produto para todos os itens');
      if (item.quantidade < 1) return setError('Quantidade inválida para algum item');
      const estoque = getAvailableStock(item.produto);
      if (item.quantidade > estoque) return setError(`Estoque insuficiente para ${item.produto.descricao}. Disponível: ${estoque}`);
    }

    setLoading(true);
    try {
      const produtos = itensCondicional.map(item => {
        return {
          produto_id: item.produto!._id,
          quantidade: item.quantidade,
        };
      });
      await api.post('/condicionais-cliente/', { cliente_id: selectedCliente._id, produtos, observacoes: observacaoGeral });
      navigate('/condicionais-cliente');
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Erro ao criar condicional');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 700 }}>
        <Typography variant="h4" sx={{ mb: 2, textAlign: 'center' }}>Criar Condicional Cliente</Typography>

        <Paper sx={{ p: 2, mb: 2, position: 'relative' }}>
          <Typography variant="subtitle1">Pesquisar Cliente</Typography>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 1
          }}>
            <Box sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}>
              <TextField
                placeholder="Nome ou documento"
                fullWidth
                size="small"
                value={clienteQuery}
                onChange={(e) => setClienteQuery(e.target.value)}
              />
              <TextField
                placeholder="Buscar por CPF (pressione Enter)"
                fullWidth
                size="small"
                value={cpfFilter}
                onChange={(e) => setCpfFilter(e.target.value)}
                onKeyDown={handleCpfKeyDown}
              />
            </Box>
            <Box sx={{
              display: 'flex',
              alignItems: 'center'
            }}>
              <Fab
                color="primary"
                size="small"
                onClick={() => setClienteModalOpen(true)}
              >
                <PersonAddIcon />
              </Fab>
            </Box>
          </Box>
          {clienteResults.length > 0 && (
            <List dense sx={{ maxHeight: 220, overflow: 'auto' }}>
              {clienteResults.map((c) => (
                <React.Fragment key={c._id}>
                  <ListItem button onClick={() => handleSelectCliente(c)}>
                    <ListItemText primary={c.nome} secondary={c._id} />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
          {selectedCliente && (
            <Box sx={{ mt: 1 }}>
              <Typography><strong>Selecionado:</strong> {selectedCliente.nome}</Typography>
            </Box>
          )}
        </Paper>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1">Produtos</Typography>

          {/* Filtros de tags globais */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, mb: 2 }}>
            <Autocomplete
              multiple
              size="small"
              options={tagOptions}
              getOptionLabel={(option: Tag) => option.descricao}
              isOptionEqualToValue={(option: Tag, value: Tag) => option._id === value._id}
              value={selectedTags}
              onChange={(_e: React.SyntheticEvent, newValue: Tag[]) => { setSelectedTags(newValue); }}
              loading={loadingTags}
              renderTags={(value, getTagProps) =>
                value.map((option: Tag, index: number) => {
                  const tagProps = getTagProps({ index });
                  // remove key from props to avoid React warning about key being passed twice
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { key, ...rest } = tagProps;
                  return <Chip key={option._id} label={option.descricao} {...rest} />;
                })
              }
              onOpen={() => fetchTags()}
              renderInput={(params: AutocompleteRenderInputParams) => (
                <TextField {...params} label="Filtrar por tags" placeholder="Pesquisar tags" size="small" />
              )}
              sx={{ flex: 1, width: { xs: '100%', sm: 'auto' } }}
            />
            <ToggleButtonGroup
              value={tagFilterMode}
              exclusive
              size="small"
              onChange={(_e, v) => { if (v) { setTagFilterMode(v); } }}
              sx={{ mt: { xs: 1, sm: 0 }, ml: { xs: 0, sm: 1 }, whiteSpace: 'nowrap' }}
            >
              <ToggleButton value="OR">Qualquer</ToggleButton>
              <ToggleButton value="AND">Todos</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {tagError && <Alert severity="warning">{tagError}</Alert>}

          {/* Quando há resultados por tag/consulta, mostre lista 'Produtos encontrados' para o usuário adicionar rapidamente */}
          {produtoResults.length > 0 && (!produtoQuery || produtoQuery.trim() === '') && (
            <Paper sx={{ p: 1, mb: 2, bgcolor: '#fafafa' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Produtos encontrados</Typography>
              <List dense sx={{ maxHeight: produtoResults.length > 5 ? 200 : 'none', overflow: produtoResults.length > 5 ? 'auto' : 'visible' }}>
                {produtoResults.map((p) => (
                  <React.Fragment key={p._id}>
                    <ListItem button onClick={() => addItemWithProduct(p)}>
                      <ListItemText primary={`${p.codigo_interno} — ${p.descricao}`} secondary={`Estoque: ${getAvailableStock(p)}`} />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}

          {/* Lista de itens de condicional */}
          {itensCondicional.map((item) => (
            <Paper key={item.id} sx={{ p: 2, mb: 2, border: '1px solid #ddd' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Produto {itensCondicional.indexOf(item) + 1}</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <ShadowIconButton size="small" onClick={() => openEditModal(item)} tooltip="Editar produto">
                    <EditIcon />
                  </ShadowIconButton>
                  <ShadowIconButton size="small" variant="error" onClick={() => removeItem(item.id)} tooltip="Remover produto">
                    <DeleteIcon />
                  </ShadowIconButton>
                </Box>
              </Box>
              {item.produto ? (
                <Box>
                  <Typography variant="body1"><strong>{item.produto.codigo_interno} — {item.produto.descricao}</strong></Typography>
                  <Typography variant="body2">Quantidade: {item.quantidade}</Typography>
                  {item.observacao && <Typography variant="body2">Observação: {item.observacao}</Typography>}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">Produto não selecionado</Typography>
              )}
            </Paper>
          ))}

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Fab color="primary" onClick={addItem}>
              <AddIcon />
            </Fab>
          </Box>
        </Paper>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1">Observações Gerais</Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={observacaoGeral}
            onChange={(e) => setObservacaoGeral(e.target.value)}
            placeholder="Observações gerais para a condicional"
          />
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={() => navigate('/condicionais-cliente')}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Criando...' : 'Criar Condicional'}
          </Button>
        </Box>

        <ClienteModal
          open={clienteModalOpen}
          onClose={() => setClienteModalOpen(false)}
          editingId={null}
          newCliente={newCliente}
          setNewCliente={setNewCliente}
          addingCliente={addingCliente}
          handleAddCliente={handleAddCliente}
        />

        <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Editar Produto</DialogTitle>
          <DialogContent>
            {editingItem && (
              <Box sx={{ pt: 1 }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {editingItem.produto ? `${editingItem.produto.codigo_interno} — ${editingItem.produto.descricao}` : 'Produto não selecionado'}
                </Typography>
                <TextField
                  label="Quantidade"
                  type="number"
                  fullWidth
                  value={editingItem.quantidade}
                  onChange={(e) => setEditingItem({ ...editingItem, quantidade: parseInt(e.target.value) || 1 })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Observação"
                  fullWidth
                  multiline
                  rows={3}
                  value={editingItem.observacao}
                  onChange={(e) => setEditingItem({ ...editingItem, observacao: e.target.value })}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveEditModal} variant="contained">Salvar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default CriarCondicionalCliente;
