import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  TablePagination,
  Alert,
  Autocomplete,
  Chip,
  useTheme,
  useMediaQuery,
  IconButton,
} from '@mui/material';

import api from '../../lib/axios';
import { useNavigate } from 'react-router-dom';
import type { Saida, Tag } from '../../types';
import { Add as AddIcon, Delete } from '@mui/icons-material';

function Vendas() {
  const today = new Date();
  const isoDate = (d: Date) => d.toISOString().split('T')[0];

  const [vendas, setVendas] = useState<Array<Saida & { produto_descricao?: string; produto_codigo_interno?: string; preco_venda?: number; cliente_nome?: string; cliente_telefone?: string; cliente_cpf?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState<string>(isoDate(today));
  const [dateTo, setDateTo] = useState<string>(isoDate(today));
  const [produtoQuery, setProdutoQuery] = useState('');
  const [produtoId, setProdutoId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'data' | 'valor'>('data');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');

  // Tag filter
  const [tagOptions, setTagOptions] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  const fetchTags = async () => {
    setLoadingTags(true);
    try {
      const res = await api.get('/produtos/tags/');
      setTagOptions(res.data || []);
    } catch (err) {
      console.error('Erro ao buscar tags:', err);
    } finally {
      setLoadingTags(false);
    }
  };

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const navigate = useNavigate();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchVendas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, produtoId, sortBy, order, page, rowsPerPage, selectedTags]);

  const fetchVendas = async () => {
    setLoading(true);
    setError(null);
    // Ensure user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Sessão expirada ou não autenticado. Faça login.');
      setVendas([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    try {
      const params: Record<string, string | number | undefined> = {
        page: page + 1,
        per_page: rowsPerPage,
        date_from: dateFrom,
        date_to: dateTo,
        sort_by: sortBy,
        order: order,
      };
      if (produtoId) params.produto_id = produtoId;
      if (produtoQuery) params.produto_query = produtoQuery;
      if (selectedTags && selectedTags.length > 0) params.tag_ids = selectedTags.map(t => t._id).join(',');

      const res = await api.get('/vendas/', { params });
      console.debug('fetchVendas response', res.status, res.data);
      const data = res.data ?? { items: [], total: 0 };
      if (!data || typeof data !== 'object') {
        console.warn('Vendas: resposta inesperada do servidor', res);
        setVendas([]);
        setTotal(0);
      } else {
        setVendas(data.items ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (err: unknown) {
      console.error('Erro ao carregar vendas:', err);
      // try to extract HTTP info
      type AxiosErrorLike = { response?: { data?: { detail?: string }; status?: number } };
      if (err && typeof err === 'object' && 'response' in err) {
        const r = (err as AxiosErrorLike).response;
        setError(`Erro ao carregar vendas: ${r?.status} ${r?.data?.detail ?? ''}`);
      } else {
        setError('Erro ao carregar vendas');
      }
    } finally {
      setLoading(false);
    }
  };





  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3, gap: 1 }}>
        <Typography variant="h4">Vendas</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/vendas/criar')} sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}>
          Fazer Venda
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Data Início"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          />
          <TextField
            label="Data Fim"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          />
          <TextField
            label="Pesquisar Produto"
            placeholder="Descrição ou código"
            size="small"
            value={produtoQuery}
            onChange={(e) => setProdutoQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setProdutoId(''); fetchVendas(); } }}
            sx={{ flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
          />

          <Autocomplete
            multiple
            size="small"
            options={tagOptions}
            getOptionLabel={(option) => option.descricao}
            isOptionEqualToValue={(option, value) => option._id === value._id}
            value={selectedTags}
            onChange={(_e, newValue) => setSelectedTags(newValue)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option.descricao}
                  {...getTagProps({ index })}
                />
              ))
            }
            onOpen={() => fetchTags()}
            loading={loadingTags}
            renderInput={(params) => (
              <TextField {...params} label="Filtrar por tags" placeholder="Pesquisar tags" size="small" />
            )}
            sx={{ width: { xs: '100%', sm: 300 } }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 } }}>
            <InputLabel>Ordenar por</InputLabel>
            <Select value={sortBy} label="Ordenar por" onChange={(e) => setSortBy(e.target.value as unknown as 'data' | 'valor')}>
              <MenuItem value="data">Data</MenuItem>
              <MenuItem value="valor">Valor</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 120 } }}>
            <InputLabel>Ordem</InputLabel>
            <Select value={order} label="Ordem" onChange={(e) => setOrder(e.target.value as unknown as 'desc' | 'asc')}>
              <MenuItem value="desc">Desc</MenuItem>
              <MenuItem value="asc">Asc</MenuItem>
            </Select>
          </FormControl>

          <Button variant="outlined" size="small" onClick={() => { setPage(0); fetchVendas(); }} sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}>
            Aplicar
          </Button>

              <Box sx={{ flex: 1 }} />
        </Box>
      </Paper>

      {!isXs ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Produto</TableCell>
                <TableCell>Qtd</TableCell>
                <TableCell>Valor Total</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Actions</TableCell>

              </TableRow>
            </TableHead>
            <TableBody>
              {vendas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">Nenhuma venda encontrada</TableCell>
                </TableRow>
              ) : (
                vendas.map((v) => (
                  <TableRow key={v._id}>
                    <TableCell>{new Date(v.data_saida).toLocaleString()}</TableCell>
                    <TableCell>{v.produto_descricao ?? v.produto_codigo_interno ?? v.produtos_id}</TableCell>
                    <TableCell>{v.quantidade}</TableCell>
                    <TableCell>R$ {((v.valor_total || 0) / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <div>
                        <div><strong>{v.cliente_nome ?? v.cliente_id}</strong></div>
                        {v.cliente_telefone && <div>{v.cliente_telefone}</div>}
                        {v.cliente_cpf && <div>CPF: {v.cliente_cpf}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <IconButton color="error" onClick={() => handleDeleteVenda(v._id)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                    
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5,10,25,50]}
          />
        </TableContainer>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {vendas.length === 0 ? (
            <Paper sx={{ p: 2 }}>
              <Typography align="center">Nenhuma venda encontrada</Typography>
            </Paper>
          ) : (
            vendas.map((v) => (
              <Paper key={v._id} sx={{ p: 2 }}>
                <Typography variant="subtitle2">{new Date(v.data_saida).toLocaleString()}</Typography>
                <Typography sx={{ mt: 0.5 }}><strong>{v.produto_descricao ?? v.produto_codigo_interno ?? v.produtos_id}</strong></Typography>
                <Typography>Qtd: {v.quantidade} • R$ {((v.valor_total || 0) / 100).toFixed(2)}</Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2"><strong>{v.cliente_nome ?? v.cliente_id}</strong></Typography>
                  {v.cliente_telefone && <Typography variant="body2">{v.cliente_telefone}</Typography>}
                  {v.cliente_cpf && <Typography variant="body2">CPF: {v.cliente_cpf}</Typography>}
                </Box>
              </Paper>
            ))
          )}

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5,10,25,50]}
          />
        </Box>
      )}


    </Box>
  );
}

export default Vendas;
