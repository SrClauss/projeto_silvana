import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  Autocomplete,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import api from '../../lib/axios';
import type { Item, MarcaFornecedor, Produto, Tag } from '../../types';
import ProdutoModal from '../../components/ProdutoModal';
import ShadowIconButton from '../../components/ShadowIconButton';

type NewProduto = Omit<Produto, '_id' | 'em_condicional' | 'saidas' | 'entradas' | 'created_at' | 'updated_at'>;

const CriarCondicionalFornecedor: React.FC = () => {
  const navigate = useNavigate();

  const [fornecedorOptions, setFornecedorOptions] = useState<MarcaFornecedor[]>([]);
  const [loadingFornecedores, setLoadingFornecedores] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<MarcaFornecedor | null>(null);

  const [dataCondicional, setDataCondicional] = useState(new Date().toISOString().split('T')[0]);
  const [observacoes, setObservacoes] = useState('');
  const [quantidadeMaxDevolucao, setQuantidadeMaxDevolucao] = useState(0);

  const [produtosPendentes, setProdutosPendentes] = useState<NewProduto[]>([]);

  const [openProdutoModal, setOpenProdutoModal] = useState(false);

  const [codigoFetched, setCodigoFetched] = useState(false);
  const [defaultCodigo, setDefaultCodigo] = useState<string | null>(null);

  // states reused by ProdutoModal
  const [newProduto, setNewProduto] = useState({ codigo_interno: '', codigo_externo: '', descricao: '', marca_fornecedor: '', sessao: '', preco_custo: 0, preco_venda: 0, tags: [] as Tag[], itens: [] as Item[] });
  const [modalTagInput, setModalTagInput] = useState('');
  const [tagOptions, setTagOptions] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

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
      setTagOptions((t) => [...t, created]);
      return created;
    } catch (error) {
      console.error('Erro ao criar tag:', error);
      return null;
    }
  };

  const handleAddProduto = (produto: NewProduto) => {
    setProdutosPendentes((prev) => [...prev, produto]);
    setOpenProdutoModal(false);

    // Após adicionar produto, atualiza a próxima numeração baseada no código recém-criado
    const lastCode = String(produto.codigo_interno || produto.codigo_externo || '');
    if (lastCode) {
      const nextCode = incrementCode(lastCode);
      setDefaultCodigo(nextCode);
      // marca como já buscado para não sobrescrever com fetch do backend
      setCodigoFetched(true);
    } else {
      // reset para permitir fallback ao backend
      setCodigoFetched(false);
    }

    setNewProduto({ codigo_interno: '', codigo_externo: '', descricao: '', marca_fornecedor: '', sessao: '', preco_custo: 0, preco_venda: 0, tags: [], itens: [] });
  };

  useEffect(() => {
    searchFornecedores('');
  }, []);

  const fetchLastCodigoSuggestion = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token');
      return;
    }

    try {
      console.log('Fetching last codigo in CriarCondicionalFornecedor');
      const res = await api.get('/produtos/codigo-interno/last');
      console.log('Response:', res.data);
      if (res.data && res.data.suggested) {
        console.log('Setting codigo to', res.data.suggested);
        setNewProduto((p) => ({ ...p, codigo_interno: res.data.suggested }));
      }
    } catch (error) {
      console.error('Erro ao buscar ultimo codigo interno:', error);
    }
  };

  const incrementCode = (code: string) => {
    const m = code.match(/^(.*?)(\d+)$/);
    if (m) {
      const prefix = m[1];
      const digits = m[2];
      const next = String(parseInt(digits, 10) + 1).padStart(digits.length, '0');
      return `${prefix}${next}`;
    }
    return `${code}1`;
  };

  const fetchUniqueCodigoSuggestion = async () => {
    try {
      // If there are pending products, prefer generating the next code from the last pending
      if (produtosPendentes && produtosPendentes.length > 0) {
        const last = produtosPendentes[produtosPendentes.length - 1];
        const lastCode = String(last.codigo_interno || last.codigo_externo || '');
        if (lastCode) {
          const suggestedFromList = incrementCode(lastCode);
          return suggestedFromList;
        }
      }

      // Fallback: use backend suggestion and ensure it doesn't exist in DB
      const res = await api.get('/produtos/codigo-interno/last');
      let suggested = String(res.data?.suggested ?? res.data?.last ?? '1');

      let attempts = 0;
      let existsRes = await api.get('/produtos/codigo-interno/exists', { params: { codigo: suggested } });
      while (existsRes.data?.exists && attempts < 1000) {
        suggested = incrementCode(suggested);
        existsRes = await api.get('/produtos/codigo-interno/exists', { params: { codigo: suggested } });
        attempts += 1;
      }

      return suggested;
    } catch (error) {
      console.error('Erro ao buscar sugestão única de código:', error);
      return null;
    }
  };

  const handleOpenProdutoModalForCreate = async () => {
    const unique = await fetchUniqueCodigoSuggestion();
    setDefaultCodigo(unique);
    setOpenProdutoModal(true);
    setCodigoFetched(false);
  };

  useEffect(() => {
    // Só buscar sugestão do backend quando o modal abrir e não tivermos uma numeração pré-definida
    if (openProdutoModal && !codigoFetched && !defaultCodigo) {
      console.log('useEffect triggered, calling fetchLastCodigoSuggestion');
      fetchLastCodigoSuggestion();
      setCodigoFetched(true);
    }
  }, [openProdutoModal, codigoFetched, defaultCodigo]);

  const searchFornecedores = async (q: string) => {
    setLoadingFornecedores(true);
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/marcas-fornecedores/', { headers: { Authorization: `Bearer ${token}` } });
      const list: MarcaFornecedor[] = res.data;
      setFornecedorOptions(list.filter(f => f.fornecedor.toLowerCase().includes(q.toLowerCase())));
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    } finally {
      setLoadingFornecedores(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFornecedor) {
      alert('Selecione um fornecedor.');
      return;
    }

    if (produtosPendentes.length === 0) {
      alert('Adicione ao menos um produto pendente antes de salvar.');
      return;
    }

    try {
      const condData = {
        fornecedor_id: selectedFornecedor._id,
        quantidade_max_devolucao: quantidadeMaxDevolucao,
        data_condicional: dataCondicional,
        observacoes,
      };

      // Prepare products ensuring items contain quantity and other required fields
      const produtosPayload = produtosPendentes.map((p) => ({
        codigo_interno: p.codigo_interno || '',
        codigo_externo: p.codigo_externo || '',
        descricao: p.descricao || '',
        marca_fornecedor: p.marca_fornecedor || '',
        sessao: p.sessao || '',
        preco_custo: p.preco_custo || 0,
        preco_venda: p.preco_venda || 0,
        tags: p.tags || [],
        itens: (p.itens && p.itens.length) ? p.itens : [{ quantity: 1 }]
      }));

      const res = await api.post('/condicionais-fornecedor/batch-create', { condicional: condData, produtos: produtosPayload });
      const body = res?.data;

      if (body && body.condicional_id) {
        alert('Condicional e produtos criados em lote!');
        navigate('/condicionais-fornecedor');
      } else {
        alert('Operação concluída, mas servidor retornou resposta inesperada.');
        navigate('/condicionais-fornecedor');
      }
    } catch (error: unknown) {
      console.error('Erro ao criar condicional:', error);
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      const msg = err?.response?.data?.detail || err?.message || 'Erro ao criar condicional.';
      alert(String(msg));
    }
  };

  const handleRemovePendingProduto = (index: number) => {
    if (!window.confirm('Remover este produto pendente?')) return;
    setProdutosPendentes((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Criar Condicional Fornecedor
      </Typography>

      {/* Seção 1: Fornecedor */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Fornecedor</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={fornecedorOptions}
              getOptionLabel={(opt) => `${opt.nome} - ${opt.fornecedor}`}
              isOptionEqualToValue={(option, value) => {
                if (!option || !value) return false;
                // compare by _id when available
                const optId = (option as MarcaFornecedor)._id;
                const valId = (value as MarcaFornecedor)._id;
                if (optId && valId) return optId === valId;
                return (option as MarcaFornecedor).fornecedor === (value as MarcaFornecedor).fornecedor;
              }}
              loading={loadingFornecedores}
              onInputChange={(_e, v) => searchFornecedores(v)}
              onChange={(_e, value) => setSelectedFornecedor(value)}
              value={selectedFornecedor}
              renderInput={(params) => (
                <TextField {...params} label="Fornecedor" required />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Data Condicional"
              type="date"
              value={dataCondicional}
              onChange={(e) => setDataCondicional(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Quantidade Máxima de Devolução"
              type="number"
              value={quantidadeMaxDevolucao}
              onChange={(e) => setQuantidadeMaxDevolucao(Number(e.target.value))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Observações"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              multiline
              fullWidth
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Seção 3: Produtos */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Produtos</Typography>
        <ShadowIconButton
          variant="primary"
          onClick={() => {
            void handleOpenProdutoModalForCreate();
          }}
        >
          <Add />
        </ShadowIconButton>
        {produtosPendentes.length > 0 ? (
          <>
            <Typography sx={{ mt: 2 }}>Produtos pendentes: {produtosPendentes.length}</Typography>
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Descrição</TableCell>
                    <TableCell>Marca / Fornecedor</TableCell>
                    <TableCell>Sessão</TableCell>
                    <TableCell>Itens</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {produtosPendentes.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{p.codigo_interno || p.codigo_externo}</TableCell>
                      <TableCell>{p.descricao}</TableCell>
                      <TableCell>{p.marca_fornecedor}</TableCell>
                      <TableCell>{p.sessao}</TableCell>
                      <TableCell>{(p.itens && p.itens.length) || 0}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleRemovePendingProduto(idx)}>
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <Typography sx={{ mt: 2, color: 'text.secondary' }}>Sem produtos pendentes.</Typography>
        )}
      </Paper>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={handleSubmit}>
          Salvar Condicional
        </Button>
        <Button onClick={() => navigate('/condicionais-fornecedor')}>
          Cancelar
        </Button>
      </Box>

      {/* Modal de Cadastro de Produto (reutilizável) */}
      <ProdutoModal
        open={openProdutoModal}
        onClose={() => setOpenProdutoModal(false)}
        editingId={null}
        condicionalFornecedorId={undefined}
        newProduto={newProduto}
        setNewProduto={setNewProduto}
        onAddProduto={handleAddProduto}
        modalTagInput={modalTagInput}
        setModalTagInput={setModalTagInput}
        tagOptions={tagOptions}
        loadingTags={loadingTags}
        searchTags={searchTags}
        createTag={createTag}
        defaultMarcaFornecedor={selectedFornecedor || undefined}
        defaultCodigo={defaultCodigo || undefined}
        nextNumeration={defaultCodigo || undefined}
      />
    </Box>
  );
};

export default CriarCondicionalFornecedor;