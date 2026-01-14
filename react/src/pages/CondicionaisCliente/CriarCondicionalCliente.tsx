import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Autocomplete,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import type { Tag, Produto, Cliente } from '../../types';



const CriarCondicionalCliente: React.FC = () => {
  const navigate = useNavigate();

  const [clienteOptions, setClienteOptions] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(false);

  const [tagOptions, setTagOptions] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'AND' | 'OR'>('OR');

  const [produtoQuery, setProdutoQuery] = useState('');
  const [produtoResults, setProdutoResults] = useState<Produto[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [selectedProdutoForAdd, setSelectedProdutoForAdd] = useState<Produto | null>(null);
  const [quantidadeToAdd, setQuantidadeToAdd] = useState<number>(1);

  const [items, setItems] = useState<{ produto_id: string; descricao: string; quantidade: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoadingTags(true);
    try {
      const res = await api.get('/produtos/tags/');
      setTagOptions(res.data || []);
    } catch (e) {
      console.error('Erro ao buscar tags', e);
    } finally {
      setLoadingTags(false);
    }
  };

  const searchClientes = async (q: string) => {
    setLoadingClientes(true);
    try {
      const res = q && q.trim() ? await api.get(`/clientes/?q=${encodeURIComponent(q)}`) : await api.get('/clientes/');
      setClienteOptions(res.data || []);
    } catch (e) {
      console.error('Erro ao buscar clientes', e);
      setClienteOptions([]);
    } finally {
      setLoadingClientes(false);
    }
  };

  const searchProdutos = async (q: string) => {
    setLoadingProdutos(true);
    try {
      let prods: Produto[] = [];
      if (q && q.trim()) {
        const res = await api.get(`/produtos/search/?query=${encodeURIComponent(q)}`);
        prods = res.data || [];
      } else if (selectedTags && selectedTags.length > 0) {
        const tag_ids = selectedTags.map(t => t._id).join(',');
        const res = await api.get(`/produtos/by-tags/?tag_ids=${encodeURIComponent(tag_ids)}&mode=${encodeURIComponent(tagFilterMode)}`);
        prods = res.data || [];
      }

      // apply client-side tag filter if tags are selected and we have server results
      if (selectedTags && selectedTags.length > 0) {
        const tagIds = selectedTags.map(t => t._id);
        if (tagFilterMode === 'OR') {
          prods = prods.filter(p => p.tags && p.tags.some((t: Tag) => tagIds.includes(t._id)));
        } else {
          prods = prods.filter(p => p.tags && tagIds.every(id => p.tags.some((t: Tag) => t._id === id)));
        }
      }

      setProdutoResults(prods);
    } catch (e) {
      console.error('Erro ao buscar produtos', e);
      setProdutoResults([]);
    } finally {
      setLoadingProdutos(false);
    }
  };

  const checkEstoque = async (produto_id: string) => {
    try {
      const res = await api.get(`/vendas/estoque/${produto_id}`);
      return res.data.estoque_disponivel || 0;
    } catch (e) {
      console.error('Erro ao checar estoque', e);
      return 0;
    }
  };

  const handleAddItem = async () => {
    setError(null);
    if (!selectedProdutoForAdd) return setError('Selecione um produto');
    if (quantidadeToAdd < 1) return setError('Quantidade inválida');
    const estoque = await checkEstoque(selectedProdutoForAdd._id);
    if (quantidadeToAdd > estoque) return setError(`Estoque insuficiente. Disponível: ${estoque}`);
    const item = { produto_id: selectedProdutoForAdd._id, descricao: selectedProdutoForAdd.descricao ?? selectedProdutoForAdd.codigo_interno, quantidade: quantidadeToAdd };
    setItems(prev => [...prev, item]);
    setSelectedProdutoForAdd(null);
    setProdutoQuery('');
    setQuantidadeToAdd(1);
  };

  const handleRemoveItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    setError(null);
    if (!selectedCliente) return setError('Selecione um cliente');
    if (items.length === 0) return setError('Adicione ao menos um item');

    setCreating(true);
    try {
      const res = await api.post('/condicionais-cliente/', { cliente_id: selectedCliente._id, produtos: [] });
      const condId = res.data.id;
      for (const it of items) {
        await api.post(`/condicionais-cliente/${condId}/enviar-produto`, { produto_id: it.produto_id, quantidade: it.quantidade });
      }
      navigate('/condicionais-cliente');
    } catch (e) {
      console.error('Erro ao criar condicional', e);
      setError('Erro ao criar condicional');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Criar Condicional Cliente</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1">Cliente</Typography>
        <Autocomplete
          options={clienteOptions}
          getOptionLabel={(opt: Cliente) => opt.nome || opt._id}
          isOptionEqualToValue={(option, value) => option && value && option._id === value._id}
          loading={loadingClientes}
          onInputChange={(_e, v) => { if (v && v.length >= 2) searchClientes(v); }}
          onChange={(_e, value) => setSelectedCliente(value)}
          renderInput={(params) => <TextField {...params} label="Pesquisar cliente" size="small" InputProps={{ ...params.InputProps, endAdornment: (<>{loadingClientes ? <CircularProgress size={16} /> : null}{params.InputProps.endAdornment}</>) }} />}
          sx={{ mb: 1 }}
        />

        <TextField label="Observações" fullWidth multiline value={''} disabled sx={{ mb: 1 }} />

        <Typography variant="subtitle1">Produtos</Typography>
<Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField placeholder="Pesquisar produto" fullWidth size="small" value={produtoQuery} onChange={(e) => { setProdutoQuery(e.target.value); if (e.target.value.length >= 2) searchProdutos(e.target.value); }} sx={{ mb: { xs: 1, sm: 0 } }} />

          <Autocomplete
            multiple
            size="small"
            options={tagOptions}
            getOptionLabel={(t: Tag) => t.descricao}
            value={selectedTags}
            onChange={(_e, val) => { setSelectedTags(val); searchProdutos(produtoQuery); }}
            loading={loadingTags}
            renderTags={(value: Tag[]) => value.map((option) => (<Chip key={option._id} label={option.descricao} size="small" />))}
            renderInput={(params) => (
              <TextField {...params} label="Filtrar por tags" size="small" InputProps={{ ...params.InputProps, endAdornment: (<>{loadingTags ? <CircularProgress size={16} /> : null}{params.InputProps.endAdornment}</>) }} />
            )}
            sx={{ width: { xs: '100%', sm: 'auto' }, mb: { xs: 1, sm: 0 } }}
          />

          <ToggleButtonGroup size="small" value={tagFilterMode} exclusive onChange={(_e, v) => { if (v) setTagFilterMode(v); searchProdutos(produtoQuery); }} sx={{ mb: { xs: 1, sm: 0 } }}>
            <ToggleButton value="OR">OR</ToggleButton>
            <ToggleButton value="AND">AND</ToggleButton>
          </ToggleButtonGroup>

          <Autocomplete
            size="small"
            options={produtoResults}
            getOptionLabel={(opt: Produto) => `${opt.codigo_interno} — ${opt.descricao}`}
            isOptionEqualToValue={(option, value) => option && value && option._id === value._id}
            loading={loadingProdutos}
            sx={{ width: { xs: '100%', sm: 320 }, mb: { xs: 1, sm: 0 } }}
            onChange={(_e, value) => setSelectedProdutoForAdd(value)}
            renderInput={(params) => <TextField {...params} label="Selecionar" size="small" InputProps={{ ...params.InputProps, endAdornment: (<>{loadingProdutos ? <CircularProgress size={16} /> : null}{params.InputProps.endAdornment}</>) }} />}
          />
          <TextField label="Qtd" size="small" type="number" value={quantidadeToAdd} onChange={(e) => setQuantidadeToAdd(Math.max(1, Number(e.target.value || 1)))} sx={{ width: { xs: '100%', sm: 100 } }} />
          <Button variant="contained" onClick={handleAddItem} sx={{ width: { xs: '100%', sm: 'auto' } }}>Adicionar</Button>
        </Box>

        {items.length > 0 && (
          <Paper variant="outlined" sx={{ mt: 2, p: 1 }}>
            <List dense>
              {items.map((it, idx) => (
                <ListItem key={idx} secondaryAction={<IconButton edge="end" onClick={() => handleRemoveItem(idx)}><DeleteIcon /></IconButton>}>
                  <ListItemText primary={`${it.descricao} — ${it.quantidade} unidade(s)`} secondary={it.produto_id} />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => navigate('/condicionais-cliente')}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={creating}>{creating ? 'Criando...' : 'Criar Condicional'} </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default CriarCondicionalCliente;
