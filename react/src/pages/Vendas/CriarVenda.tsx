import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Paper, Typography, List, ListItem, ListItemText, Divider, Alert, Autocomplete, Chip, ToggleButtonGroup, ToggleButton } from '@mui/material';
import type { AutocompleteRenderInputParams } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/axios';
import type { Produto, Cliente, Item, Tag } from '../../types';

function formatCurrency(cents: number) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

const CriarVenda: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialProdutoId = searchParams.get('produto_id') ?? undefined;
  const initialClienteId = searchParams.get('cliente_id') ?? undefined;

  const [produtoQuery, setProdutoQuery] = useState('');
  const [produtoResults, setProdutoResults] = useState<Produto[]>([]);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);

  // Tag search
  const [tagOptions, setTagOptions] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagFilterMode, setTagFilterMode] = useState<'OR' | 'AND'>('OR');

  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteResults, setClienteResults] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const [quantidade, setQuantidade] = useState<number>(1);
  const [valorTotal, setValorTotal] = useState<number>(0); // cents
  const [observacoes, setObservacoes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const fetchProdutoById = async (id: string) => {
    try {
      const res = await api.get(`/produtos/${id}`);
      setSelectedProduto(res.data);
      const preco = res.data.preco_venda ?? 0;
      setValorTotal(preco * quantidade);
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

  const searchProdutos = async (q: string, tagsParam?: Tag[]) => {
    const tagsToUse = tagsParam ?? selectedTags;

    // if no query and no tags, clear
    if ((!q || q.trim() === '') && (!tagsToUse || tagsToUse.length === 0)) {
      setProdutoResults([]);
      return;
    }

    try {
      let prods: Produto[] = [];

      console.debug('searchProdutos', { q, tagsCount: tagsToUse?.length ?? 0 });

      if (q && q.trim() !== '') {
        const res = await api.get(`/produtos/search/?query=${encodeURIComponent(q)}`);
        prods = res.data || [];
        // if tags are selected, filter server results by tags according to tagFilterMode
        if (tagsToUse && tagsToUse.length > 0) {
          const tagIds = tagsToUse.map(t => t._id);
          if (tagFilterMode === 'OR') {
            prods = prods.filter(p => p.tags && p.tags.some((t: Tag) => tagIds.includes(t._id)));
          } else {
            // AND: product must have all selected tags
            prods = prods.filter(p => p.tags && tagIds.every(id => p.tags.some((t: Tag) => t._id === id)));
          }
        }
      } else if (tagsToUse && tagsToUse.length > 0) {
        // no text query, search by tags server-side
        const tag_ids = tagsToUse.map(t => t._id).join(',');
        const res = await api.get(`/produtos/by-tags/?tag_ids=${encodeURIComponent(tag_ids)}&mode=${encodeURIComponent(tagFilterMode)}`);
        prods = res.data || [];
      }

      setProdutoResults(prods);
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

  useEffect(() => {
    // debounce simple
    const t = setTimeout(() => searchProdutos(produtoQuery), 250);
    return () => clearTimeout(t);
  }, [produtoQuery]);

  useEffect(() => {
    const t = setTimeout(() => searchClientes(clienteQuery), 250);
    return () => clearTimeout(t);
  }, [clienteQuery]);

  useEffect(() => {
    if (selectedProduto) {
      const preco = selectedProduto.preco_venda || 0;
      setValorTotal(preco * quantidade);
    }
  }, [selectedProduto, quantidade]);

  const handleSelectProduto = (p: Produto) => {
    setSelectedProduto(p);
    setProdutoResults([]);
  };

  const handleSelectCliente = (c: Cliente) => {
    setSelectedCliente(c);
    setClienteResults([]);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!selectedProduto) return setError('Selecione um produto');
    if (quantidade < 1) return setError('Quantidade inválida');
    // validate estoque
    const estoque = (selectedProduto.itens || []).filter((it: Item) => !it.condicional_fornecedor_id && !it.condicional_cliente_id).reduce((s: number, it: Item) => s + (it.quantity || 0), 0);
    if (quantidade > estoque) return setError(`Estoque insuficiente. Disponível: ${estoque}`);

    setLoading(true);
    try {
      await api.post('/vendas/', {
        produto_id: selectedProduto._id,
        quantidade,
        cliente_id: selectedCliente?._id || null,
        valor_total: valorTotal,
        observacoes,
      });
      // voltar para listagem
      navigate('/vendas');
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'Erro ao criar venda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 700 }}>
        <Typography variant="h4" sx={{ mb: 2, textAlign: 'center' }}>Criar Venda</Typography>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1">Pesquisar Produto</Typography>
        <TextField
          placeholder="Código interno ou descrição"
          fullWidth
          size="small"
          value={produtoQuery}
          onChange={(e) => setProdutoQuery(e.target.value)}
          sx={{ mb: 1 }}
        />

        <Box sx={{ display: 'flex', gap: 1, alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, mb: 1 }}>
          <Autocomplete
            multiple
            size="small"
            options={tagOptions}
            getOptionLabel={(option: Tag) => option.descricao}
            isOptionEqualToValue={(option: Tag, value: Tag) => option._id === value._id}
            value={selectedTags}
            onChange={(_e: React.SyntheticEvent, newValue: Tag[]) => { setSelectedTags(newValue); searchProdutos(produtoQuery, newValue); }}
            loading={loadingTags}
            renderTags={(value, getTagProps) =>
              value.map((option: Tag, index: number) => {
                const tagProps = getTagProps({ index });
                // remove key from props to avoid React warning about key being passed twice
                const { key: _k, ...rest } = tagProps;
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
            onChange={(_e, v) => { if (v) { setTagFilterMode(v); if (selectedTags.length > 0) searchProdutos(produtoQuery, selectedTags); } }}
            sx={{ mt: { xs: 1, sm: 0 }, ml: { xs: 0, sm: 1 }, whiteSpace: 'nowrap' }}
          >
            <ToggleButton value="OR">Qualquer</ToggleButton>
            <ToggleButton value="AND">Todos</ToggleButton>
          </ToggleButtonGroup>

        </Box>
        {tagError && <Alert severity="warning">{tagError}</Alert>} 

        {produtoResults.length > 0 && (
          <List dense sx={{ maxHeight: 220, overflow: 'auto' }}>
            {produtoResults.map((p) => (
              <React.Fragment key={p._id}>
                <ListItem button onClick={() => handleSelectProduto(p)}>
                  <ListItemText primary={`${p.codigo_interno} — ${p.descricao}`} secondary={`Preço: ${formatCurrency(p.preco_venda || 0)}`} />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
        {selectedProduto && (
          <Box sx={{ mt: 1 }}>
            <Typography><strong>Selecionado:</strong> {selectedProduto.descricao} ({selectedProduto.codigo_interno})</Typography>
            <Typography>Preço unitário: {formatCurrency(selectedProduto.preco_venda || 0)}</Typography>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1">Pesquisar Cliente</Typography>
        <TextField
          placeholder="Nome ou documento"
          fullWidth
          size="small"
          value={clienteQuery}
          onChange={(e) => setClienteQuery(e.target.value)}
          sx={{ mb: 1 }}
        />
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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField label="Quantidade" type="number" size="small" value={quantidade} onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))} sx={{ width: { xs: '100%', sm: 160 } }} />
          <TextField label="Valor Total" size="small" value={formatCurrency(valorTotal)} InputProps={{ readOnly: true }} sx={{ width: { xs: '100%', sm: 'auto' }, flex: 1 }} />
        </Box>
        <TextField label="Observações" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} fullWidth multiline rows={3} />
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button variant="contained" onClick={handleSubmit} disabled={loading} sx={{ width: { xs: '100%', sm: 'auto' } }}>{loading ? 'Salvando...' : 'Salvar Venda'}</Button>
          <Button onClick={() => navigate('/vendas')} sx={{ width: { xs: '100%', sm: 'auto' } }}>Cancelar</Button>
        </Box>
      </Paper>
      </Box>
    </Box>
  );
};

export default CriarVenda;
