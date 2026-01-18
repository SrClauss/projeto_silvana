import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Autocomplete,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { CalcResult, SaleDraft, SaleItem, CondicionalCliente as CondicionalClienteType, CalcProduct, CondicionalProduto, Produto } from '../../types';
import { CheckCircle as CheckCircleIcon, Delete as DeleteIcon, Add } from '@mui/icons-material';
import api from '../../lib/axios';


function CondicionaisCliente() {
  const [condicionais, setCondicionais] = useState<CondicionalClienteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  
  const [processarModalOpen, setProcessarModalOpen] = useState(false);
  const [selectedCondicional, setSelectedCondicional] = useState<CondicionalClienteType | null>(null);
  const [codigosDevolvidos, setCodigosDevolvidos] = useState<string[]>([]);
  const [novoCodigoInput, setNovoCodigoInput] = useState('');

  const theme = useTheme();

  // adicionar produto modal
  const [addProdutoModalOpen, setAddProdutoModalOpen] = useState(false);
  const [addProdutoForm, setAddProdutoForm] = useState({ produto_id: '', quantidade: 1, condicional_id: '' });

  // product autocomplete
  const [productOptions, setProductOptions] = useState<Produto[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);



  const fetchCondicionais = async () => {
    try {
      const response = await api.get('/condicionais-cliente/');
      setCondicionais(response.data);
      setLoading(false);
    } catch {
      setError('Erro ao carregar condicionais de cliente');
      setLoading(false);
    }
  };

  const searchProducts = async (q: string) => {
    if (!q || q.trim() === '') {
      setProductOptions([]);
      return;
    }
    setLoadingProducts(true);
    try {
      const response = await api.get(`/produtos/search?q=${encodeURIComponent(q)}`);
      setProductOptions(response.data);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchCondicionais();
  }, []);

  const handleOpenProcessarModal = (condicional: CondicionalClienteType) => {
    setSelectedCondicional(condicional);
    setCodigosDevolvidos([]);
    setNovoCodigoInput('');
    setProcessarModalOpen(true);
  };

  const handleAddCodigo = () => {
    if (novoCodigoInput.trim()) {
      setCodigosDevolvidos([...codigosDevolvidos, novoCodigoInput.trim()]);
      setNovoCodigoInput('');
    }
  };

  const handleRemoveCodigo = (index: number) => {
    setCodigosDevolvidos(codigosDevolvidos.filter((_, i) => i !== index));
  };

  const handleAddProduto = async () => {
    if (!addProdutoForm.condicional_id) return;
    if (!addProdutoForm.produto_id) return setError('Selecione um produto válido');
    try {
      await api.post(`/condicionais-cliente/${addProdutoForm.condicional_id}/adicionar-produto`, { produto_id: addProdutoForm.produto_id, quantidade: addProdutoForm.quantidade });
      setAddProdutoModalOpen(false);
      fetchCondicionais();
    } catch (err: unknown) {
      console.error('Erro ao adicionar produto ao condicional', err);
      setError('Erro ao adicionar produto');
    }
  };

  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [salesDraft, setSalesDraft] = useState<SaleDraft[]>([]);

  // View condicional completa
  const [viewCondicional, setViewCondicional] = useState<CondicionalClienteType | null>(null);
  const fetchCondicionalCompleta = async (id: string) => {
    try {
      const res = await api.get(`/condicionais-cliente/${id}/completa`);
      setViewCondicional(res.data);
    } catch (e) {
      console.error('Erro ao buscar condicional completa', e);
      setViewCondicional(null);
    }
  };

  const handleViewCondicional = (id: string) => {
    fetchCondicionalCompleta(id);
  };

  const fetchCalcular = async (condId: string, devolvidos: string[]) => {
    try {
      const res = await api.post(`/condicionais-cliente/${condId}/calcular-retorno`, { produtos_devolvidos_codigos: devolvidos });
      setCalcResult(res.data);
    } catch (e) {
      console.error('Erro ao calcular retorno', e);
      setCalcResult(null);
    }
  };

  // recalcula sempre que os códigos mudam
  useEffect(() => {
    if (selectedCondicional) {
      fetchCalcular(selectedCondicional._id, codigosDevolvidos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigosDevolvidos, selectedCondicional]);

  const handleConfirmProcess = async () => {
    if (!selectedCondicional || !calcResult) return;

    // validar que todas as quantidades vendidas foram alocadas nas vendas
    const produtosCalc: CalcProduct[] = calcResult.produtos || [];
    const requiredByProduct: Record<string, number> = {};
    produtosCalc.forEach(p => { requiredByProduct[p.produto_id] = p.quantidade_vendida; });

    // soma alocada
    const allocated: Record<string, number> = {};
    salesDraft.forEach(s => {
      (s.items || []).forEach((it: SaleItem) => {
        allocated[it.produto_id] = (allocated[it.produto_id] || 0) + Number(it.quantidade || 0);
      });
    });

    for (const pid of Object.keys(requiredByProduct)) {
      if ((allocated[pid] || 0) !== requiredByProduct[pid]) {
        setError(`Quantidade alocada para produto ${pid} (${allocated[pid] || 0}) não confere com calculado (${requiredByProduct[pid]})`);
        return;
      }
    }

    // montar lista 'vendas' (flat) para enviar ao endpoint
    const vendasFlat: SaleItem[] = [];
    salesDraft.forEach(s => {
      (s.items || []).forEach((it: SaleItem) => {
        vendasFlat.push({ produto_id: it.produto_id, quantidade: it.quantidade, valor_total: it.valor_total, observacoes: it.observacoes });
      });
    });

    try {
      await api.post(`/condicionais-cliente/${selectedCondicional._id}/processar-retorno`, { produtos_devolvidos_codigos: codigosDevolvidos, vendas: vendasFlat });
      setProcessarModalOpen(false);
      setSalesDraft([]);
      fetchCondicionais();
    } catch (err: unknown) {
      let respDetail: string | undefined;
      if (err && typeof err === 'object' && 'response' in err) {
        const r = (err as { response?: { data?: { detail?: string } } }).response;
        respDetail = r?.data?.detail;
      }
      const msg = respDetail ?? (err instanceof Error ? err.message : String(err));
      setError(msg || 'Erro ao processar retorno');
    }
  };

  const getTotalProdutos = (produtos: CondicionalProduto[]) => {
    return produtos.reduce((sum, p) => sum + p.quantidade, 0);
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
        Condicionais Cliente
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/condicionais-cliente/criar')}>Adicionar</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Cliente ID</TableCell>
              <TableCell>Total Produtos</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Data Condicional</TableCell>
              <TableCell>Data Devolução</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {condicionais.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Nenhum condicional encontrado
                </TableCell>
              </TableRow>
            ) : (
              condicionais.map((condicional) => (
                <TableRow key={condicional._id}>
                  <TableCell>{condicional.cliente_id}</TableCell>
                  <TableCell>
                    <Chip 
                      label={`${getTotalProdutos(condicional.produtos)} item(s)`} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={condicional.ativa ? 'Ativa' : 'Encerrada'}
                      color={condicional.ativa ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(condicional.data_condicional).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {condicional.data_devolucao
                      ? new Date(condicional.data_devolucao).toLocaleDateString('pt-BR')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleViewCondicional(condicional._id)}
                      >
                        Visualizar
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => { setAddProdutoForm({ produto_id: '', quantidade: 1, condicional_id: condicional._id }); setAddProdutoModalOpen(true); }}
                        disabled={!condicional.ativa}
                      >
                        Adicionar Produto
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => handleOpenProcessarModal(condicional)}
                        disabled={!condicional.ativa}
                      >
                        Processar Retorno
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Visualizar Condicional Modal */}
      <Dialog open={!!viewCondicional} onClose={() => setViewCondicional(null)} maxWidth="md" fullWidth>
        <DialogTitle>Visualizar Condicional</DialogTitle>
        <DialogContent>
          {viewCondicional ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle1">Cliente: {viewCondicional.cliente ? `${viewCondicional.cliente.nome || ''} (${viewCondicional.cliente._id})` : viewCondicional.cliente_id}</Typography>
              <Typography variant="body2">Data Condicional: {new Date(viewCondicional.data_condicional).toLocaleDateString('pt-BR')}</Typography>
              <Typography variant="body2">Status: {viewCondicional.ativa ? 'Ativa' : 'Encerrada'}</Typography>
              {viewCondicional.observacoes && <Typography variant="body2">Observações: {viewCondicional.observacoes}</Typography>}
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Nome</TableCell>
                      <TableCell>Enviadas</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(viewCondicional.produtos || []).map((p: CondicionalProduto) => (
                      <TableRow key={p.produto_id}>
                        <TableCell>{p.produto?.codigo_interno || '-'}</TableCell>
                        <TableCell>{p.produto?.descricao || p.produto_id}</TableCell>
                        <TableCell>{p.quantidade}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Typography>Carregando...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewCondicional(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Processar Retorno Modal */}
      <Dialog open={processarModalOpen} onClose={() => setProcessarModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Processar Retorno de Condicional</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {selectedCondicional && (
              <Alert severity="info">
                Total de itens enviados: {getTotalProdutos(selectedCondicional.produtos)}
              </Alert>
            )}


            
            <Typography variant="body2" color="text.secondary">
              Informe os códigos internos dos produtos que foram <strong>devolvidos</strong>.
              Os produtos não listados serão considerados vendidos.
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                label="Código Interno do Produto Devolvido"
                value={novoCodigoInput}
                onChange={(e) => setNovoCodigoInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCodigo();
                  }
                }}
                placeholder="Digite o código e pressione Enter"
              />
              <Button
                variant="contained"
                onClick={handleAddCodigo}
                disabled={!novoCodigoInput.trim()}
              >
                Adicionar
              </Button>
            </Box>

            {codigosDevolvidos.length > 0 && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Produtos Devolvidos ({codigosDevolvidos.length}):
                  </Typography>
                  <List dense>
                    {codigosDevolvidos.map((codigo, index) => (
                      <ListItem
                        key={index}
                        secondaryAction={
                          <IconButton edge="end" onClick={() => handleRemoveCodigo(index)}>
                            <DeleteIcon />
                          </IconButton>
                        }
                      >
                        <ListItemText primary={codigo} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            )}

            {/* Resultado do cálculo e agrupamento de vendas */}

            {/* Drag & Drop helpers: draggable products */}
            <style>{` .draggable-row { cursor: grab; } .sales-drop { min-height: 48px; border: 1px dashed rgba(0,0,0,0.12); padding: 8px; border-radius: 4px; } `}</style>
            {calcResult ? (
              <Box>
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle1">Cálculo de Retorno</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Abaixo você verá por produto quantas unidades foram devolvidas e quantas serão consideradas vendidas. Distribua os itens vendidos entre vendas.
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Código Interno</TableCell>
                          <TableCell>Enviadas</TableCell>
                          <TableCell>Devolvidas</TableCell>
                          <TableCell>Vendidas</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(calcResult.produtos || []).map((p: CalcProduct) => {
                          const remaining = p.quantidade_vendida - salesDraft.reduce((s, sd) => {
                            const it = (sd.items || []).find((i: SaleItem | undefined) => i && i.produto_id === p.produto_id);
                            return s + (it ? Number(it.quantidade || 0) : 0);
                          }, 0);

                          return (
                            <TableRow key={p.produto_id} draggable className="draggable-row" onDragStart={(e) => { e.dataTransfer.setData('text/plain', JSON.stringify({ produto_id: p.produto_id, codigo: p.codigo_interno, qty: remaining })); }}>
                              <TableCell>{p.codigo_interno}</TableCell>
                              <TableCell>{p.quantidade_enviada}</TableCell>
                              <TableCell>{p.quantidade_devolvida}</TableCell>
                              <TableCell>{p.quantidade_vendida}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => setSalesDraft(prev => [...prev, { id: `sale-${Date.now()}`, name: `Venda ${prev.length + 1}`, cliente_id: selectedCondicional?.cliente_id, items: [] }])}>Adicionar Venda</Button>
                  </Box>

                  {salesDraft.length > 0 && (
                    <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
                      {salesDraft.map(s => (
                        <Paper key={s.id} variant="outlined" sx={{ p: 1 }} className="sales-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
                          e.preventDefault();
                          const data = e.dataTransfer.getData('text/plain');
                          try {
                            const obj = JSON.parse(data);
                            const produto_id = obj.produto_id;
                            const qty = Number(obj.qty || 0);
                            if (qty <= 0) return setError('Nada para alocar deste produto');
                            // add item to this sale with qty (if exists, sum)
                            setSalesDraft(prev => prev.map(x => {
                              if (x.id !== s.id) return x;
                              const existing = (x.items || []).find((it: SaleItem) => it.produto_id === produto_id);
                              if (existing) {
                                return { ...x, items: (x.items || []).map((it: SaleItem) => it.produto_id === produto_id ? ({ ...it, quantidade: Number(it.quantidade) + qty }) : it) };
                              }
                              return { ...x, items: [...(x.items || []), { produto_id, quantidade: qty }] };
                            }));
                          } catch (err) { console.error('drop parse', err); }
                        }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2">{s.name}</Typography>
                            <Button size="small" color="error" onClick={() => setSalesDraft(prev => prev.filter(x => x.id !== s.id))}>Remover</Button>
                          </Box>
                          <Divider sx={{ my: 1 }} />
                          {(s.items || []).length === 0 ? (
                            <Typography variant="body2" color="text.secondary">Nenhum item adicionado</Typography>
                          ) : (
                            <List dense>
                              {(s.items || []).map((it: SaleItem, idx: number) => (
                                <ListItem key={idx} secondaryAction={<IconButton edge="end" onClick={() => setSalesDraft(prev => prev.map(x => x.id === s.id ? ({ ...x, items: (x.items || []).filter((_: SaleItem, i: number) => i !== idx) }) : x))}><DeleteIcon /></IconButton>}>
                                  <ListItemText primary={`${it.produto_id} — ${it.quantidade} unidade(s)`} />
                                </ListItem>
                              ))}
                            </List>
                          )}
                        </Paper>
                      ))}
                    </Box>
                  )}

                  {/* Allocation controls: simple per-product allocation to a sale */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Alocar itens às vendas</Typography>
                    {(calcResult.produtos || []).map((p: CalcProduct) => {
                      const allocated = salesDraft.reduce((s, sd) => {
                        const it = (sd.items || []).find((i: SaleItem | undefined) => i && i.produto_id === p.produto_id);
                        return s + (it ? Number(it.quantidade || 0) : 0);
                      }, 0);
                      const remaining = p.quantidade_vendida - allocated;

                      return (
                        <Box key={p.produto_id} sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                          <Typography sx={{ width: 140 }}>{p.codigo_interno}</Typography>
                          <Typography sx={{ width: 80 }}>Rest: {remaining}</Typography>
                          <TextField size="small" type="number" inputProps={{ min: 1, max: remaining }} defaultValue={Math.max(1, remaining)} id={`alloc-qty-${p.produto_id}`} sx={{ width: 100 }} />
                          <TextField size="small" select SelectProps={{ native: true }} defaultValue={salesDraft.length ? salesDraft[0].id : ''} id={`alloc-sale-${p.produto_id}`} sx={{ width: 160 }}>
                            <option value="">Selecione venda</option>
                            {salesDraft.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </TextField>
                          <Button size="small" variant="contained" onClick={() => {
                            const qtyEl = document.getElementById(`alloc-qty-${p.produto_id}`) as HTMLInputElement | null;
                            const saleEl = document.getElementById(`alloc-sale-${p.produto_id}`) as HTMLSelectElement | null;
                            const qty = qtyEl ? Number(qtyEl.value) : 0;
                            const saleId = saleEl ? saleEl.value : '';
                            if (!saleId) return setError('Selecione uma venda para alocar');
                            if (qty <= 0) return setError('Quantidade inválida');
                            // atualizar salesDraft
                            setSalesDraft(prev => prev.map(s => s.id === saleId ? ({ ...s, items: [...(s.items || []), { produto_id: p.produto_id, quantidade: qty }] }) : s));
                          }}>Alocar</Button>
                        </Box>
                      );
                    })}
                  </Box>
                </Paper>

                {/* resumo */}
                <Box sx={{ mt: 1 }}>
                  <Alert severity="warning">Produtos que serão vendidos: {selectedCondicional ? getTotalProdutos(selectedCondicional.produtos) - codigosDevolvidos.length : 0}</Alert>
                </Box>

              </Box>
            ) : (
              selectedCondicional && (
                <Alert severity="warning">
                  Produtos que serão vendidos: {getTotalProdutos(selectedCondicional.produtos) - codigosDevolvidos.length}
                </Alert>
              )
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setProcessarModalOpen(false); setSalesDraft([]); }}>Cancelar</Button>
          <Button
            onClick={handleConfirmProcess}
            variant="contained"
            color="success"
          >
            Confirmar e Processar
          </Button>
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddProdutoModalOpen(false)}>Cancelar</Button>
          <Tooltip title="Adicionar Produto">
            <IconButton onClick={handleAddProduto}>
              <Add />
            </IconButton>
          </Tooltip>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

export default CondicionaisCliente;
