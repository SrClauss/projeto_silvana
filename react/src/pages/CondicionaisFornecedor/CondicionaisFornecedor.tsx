import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,

  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { Produto } from '../../types';
import { Add, Undo as UndoIcon } from '@mui/icons-material';
import api from '../../lib/axios';
import ShadowIconButton from '../../components/ShadowIconButton';



interface CondicionalFornecedor {
  _id: string;
  fornecedor_id: string;
  produtos_id: string[];
  quantidade_max_devolucao: number;
  data_condicional: string;
  observacoes?: string;
}

interface StatusDevolucao {
  condicional_id: string;
  quantidade_max_devolucao: number;
  quantidade_devolvida: number;
  quantidade_pode_devolver: number;
  quantidade_em_condicional: number;
}

function CondicionaisFornecedor() {
  const [condicionais, setCondicionais] = useState<CondicionalFornecedor[]>([]);
  const [statusMap, setStatusMap] = useState<Map<string, StatusDevolucao>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const navigate = useNavigate();

  // create condicional fornecedor modal
  const [createCondFornecedorOpen, setCreateCondFornecedorOpen] = useState(false);
  const [createCondFornecedorForm, setCreateCondFornecedorForm] = useState({ fornecedor_id: '', quantidade_max_devolucao: 0, observacoes: '', data_condicional: new Date().toISOString().split('T')[0] });

  // adicionar produto modal
  const [addProdutoModalOpen, setAddProdutoModalOpen] = useState(false);
  const [addProdutoForm, setAddProdutoForm] = useState({ produto_id: '', quantidade: 1, condicional_id: '', data_adicao: new Date().toISOString().split('T')[0] });

  // product autocomplete
  const [productOptions, setProductOptions] = useState<Produto[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const searchProducts = async (q: string) => {
    if (!q || q.trim() === '') {
      setProductOptions([]);
      return;
    }
    setLoadingProducts(true);
    try {
      const res = await api.get(`/produtos/search/?query=${encodeURIComponent(q)}`);
      setProductOptions(res.data || []);
    } catch (e) {
      console.error('Erro ao buscar produtos', e);
      setProductOptions([]);
    } finally {
      setLoadingProducts(false);
    }
  };



  const fetchCondicionais = async () => {
    try {
      const response = await api.get('/condicionais-fornecedor/');
      setCondicionais(response.data);
      
      // Fetch status for each condicional
      const statusPromises = response.data.map((c: CondicionalFornecedor) =>
        api.get(`/condicionais-fornecedor/${c._id}/status-devolucao`)
      );
      
      const statusResponses = await Promise.all(statusPromises);
      const newStatusMap = new Map();
      statusResponses.forEach(res => {
        newStatusMap.set(res.data.condicional_id, res.data);
      });
      setStatusMap(newStatusMap);
      
      setLoading(false);
    } catch {
      setError('Erro ao carregar condicionais de fornecedor');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCondicionais();
  }, []);

  const handleNavigateToDevolucao = (condicional: CondicionalFornecedor) => {
    navigate(`/condicionais-fornecedor/devolucao?id=${condicional._id}`);
  };

  const handleOpenAddProduto = (condicional: CondicionalFornecedor) => {
    setAddProdutoForm({ produto_id: '', quantidade: 1, condicional_id: condicional._id, data_adicao: new Date().toISOString().split('T')[0] });
    setAddProdutoModalOpen(true);
  };

  const handleAddProduto = async () => {
    if (!addProdutoForm.condicional_id) return;
    if (!addProdutoForm.produto_id) return setError('Selecione um produto válido');
    try {
      await api.post(`/condicionais-fornecedor/${addProdutoForm.condicional_id}/adicionar-produto`, { produto_id: addProdutoForm.produto_id, quantidade: addProdutoForm.quantidade });
      setAddProdutoModalOpen(false);
      fetchCondicionais();
    } catch (err: unknown) {
      console.error('Erro ao adicionar produto ao condicional', err);
      setError('Erro ao adicionar produto');
    }
  };

  const handleCreateCondicionalFornecedor = async () => {
    try {
      await api.post(`/condicionais-fornecedor/`, createCondFornecedorForm);
      setCreateCondFornecedorOpen(false);
      fetchCondicionais();
    } catch (err: unknown) {
      console.error('Erro ao criar condicional fornecedor', err);
      setError('Erro ao criar condicional fornecedor');
    }
  };

  const getProgressColor = (status: StatusDevolucao) => {
    const percentage = (status.quantidade_devolvida / status.quantidade_max_devolucao) * 100;
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
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
      <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontFamily: 'serif', fontWeight: 700, mb: { xs: 2, md: 3 } }}>
        Condicionais Fornecedor
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <Box sx={{display: 'flex', justifyContent: 'flex-end' }}>



      <ShadowIconButton
        variant="primary"
        onClick={() => navigate('/condicionais-fornecedor/criar')}
        tooltip="Criar Condicional Fornecedor"
        sx={{ mb: 2 }}
      >
        <Add />
      </ShadowIconButton>
    </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fornecedor ID</TableCell>
              <TableCell>Produtos</TableCell>
              <TableCell>Status de Devolução</TableCell>
              <TableCell>Limite Devolução</TableCell>
              <TableCell>Em Condicional</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {condicionais.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Nenhum condicional encontrado
                </TableCell>
              </TableRow>
            ) : (
              condicionais.map((condicional) => {
                const status = statusMap.get(condicional._id);
                const progressValue = status
                  ? (status.quantidade_devolvida / status.quantidade_max_devolucao) * 100
                  : 0;

                return (
                  <TableRow key={condicional._id}>
                    <TableCell>{condicional.fornecedor_id}</TableCell>
                    <TableCell>
                      <Chip label={`${condicional.produtos_id.length} produto(s)`} size="small" />
                    </TableCell>
                    <TableCell>
                      {status && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <LinearProgress
                            variant="determinate"
                            value={progressValue}
                            color={getProgressColor(status)}
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                          <Typography variant="caption">
                            {status.quantidade_devolvida} / {status.quantidade_max_devolucao} devolvidos
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      {status && (
                        <Chip
                          label={`Pode devolver: ${status.quantidade_pode_devolver}`}
                          color={status.quantidade_pode_devolver > 0 ? 'success' : 'default'}
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {status && (
                        <Chip
                          label={status.quantidade_em_condicional}
                          color="info"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(condicional.data_condicional).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Adicionar Produto">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenAddProduto(condicional)}
                          >
                            <Add />
                          </IconButton>
                        </Tooltip>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<UndoIcon />}
                          onClick={() => handleNavigateToDevolucao(condicional)}
                          disabled={!status || status.quantidade_pode_devolver === 0}
                        >
                          Devolver
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Condicional Fornecedor Modal */}
      <Dialog open={createCondFornecedorOpen} onClose={() => setCreateCondFornecedorOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Criar Condicional Fornecedor</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mt: 1, flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center' }}>
            <TextField label="Fornecedor ID" value={createCondFornecedorForm.fornecedor_id} onChange={(e) => setCreateCondFornecedorForm({ ...createCondFornecedorForm, fornecedor_id: e.target.value })} sx={{ width: { xs: '100%', sm: 'auto' } }} />
            <TextField label="Quantidade Máx Devolução" type="number" value={createCondFornecedorForm.quantidade_max_devolucao} onChange={(e) => setCreateCondFornecedorForm({ ...createCondFornecedorForm, quantidade_max_devolucao: Number(e.target.value || 0) })} sx={{ width: { xs: '100%', sm: 180 } }} />
            <TextField label="Data Condicional" type="date" value={createCondFornecedorForm.data_condicional} onChange={(e) => setCreateCondFornecedorForm({ ...createCondFornecedorForm, data_condicional: e.target.value })} sx={{ width: { xs: '100%', sm: 'auto' } }} />
            <TextField label="Observações" value={createCondFornecedorForm.observacoes} onChange={(e) => setCreateCondFornecedorForm({ ...createCondFornecedorForm, observacoes: e.target.value })} multiline sx={{ width: { xs: '100%', sm: 'auto' } }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateCondFornecedorOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreateCondicionalFornecedor} variant="contained">Criar</Button>
        </DialogActions>
      </Dialog>

      {/* Add Produto Modal */}
      <Dialog open={addProdutoModalOpen} onClose={() => setAddProdutoModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Produto ao Condicional</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Autocomplete
              size="small"
              options={productOptions}
              getOptionLabel={(opt: Produto) => `${opt.codigo_interno} — ${opt.descricao}`}
              loading={loadingProducts}
              onInputChange={(_e, v) => { if (v && v.length >= 2) searchProducts(v); }}
              onChange={(_e, value) => setAddProdutoForm({ ...addProdutoForm, produto_id: value ? value._id : '' })}
              renderInput={(params) => (
                <TextField {...params} label="Produto (código/descrição)" size="small" InputProps={{ ...params.InputProps, endAdornment: (<>{loadingProducts ? <CircularProgress color="inherit" size={16} /> : null}{params.InputProps.endAdornment}</>) }} />
              )}
              sx={{ mb: 1 }}
            />
            <TextField label="Quantidade" type="number" value={addProdutoForm.quantidade} onChange={(e) => setAddProdutoForm({ ...addProdutoForm, quantidade: Math.max(1, parseInt(e.target.value) || 1) })} />
            <TextField label="Data de Adição" type="date" value={addProdutoForm.data_adicao} onChange={(e) => setAddProdutoForm({ ...addProdutoForm, data_adicao: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddProdutoModalOpen(false)}>Cancelar</Button>
          <ShadowIconButton
            variant="primary"
            onClick={handleAddProduto}
            disabled={!addProdutoForm.produto_id || addProdutoForm.quantidade < 1}
          >
            Adicionar
          </ShadowIconButton>
        </DialogActions>
      </Dialog>

      

    </Box>
  );
}

export default CondicionaisFornecedor;
