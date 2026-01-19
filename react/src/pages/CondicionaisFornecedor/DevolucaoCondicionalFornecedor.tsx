import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Grid,
  Paper,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Chip,
  Stack,
  CircularProgress,
  Divider,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import api from '../../lib/axios';
import type { Produto, Saida } from '../../types';
import Title from '../../components/Title';


interface ProdutoDevolucao {
  produto: Produto;
  saida: Saida[];
}

interface Condicional {
  _id: string;
  fornecedor?: { fornecedor?: string };
  fornecedor_id?: string;
  prazo_devolucao?: number | string;
  data_condicional?: string;
  fechada?: boolean;
}

interface Status {
  quantidade_em_condicional?: number;
  quantidade_vendida?: number;
  quantidade_devolvida?: number;
}

const formatCurrency = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const DevolucaoCondicionalFornecedor: React.FC = () => {


  const [searchParams] = useSearchParams();
  const condicionalId = searchParams.get('id');


  const [produtosDevolucao, setProdutosDevolucao] = useState<ProdutoDevolucao[]>([]);
  const [loading, setLoading] = useState(false);
  const [condicional, setCondicional] = useState<Condicional | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [quantidadesParaDevolver, setQuantidadesParaDevolver] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const navigate = useNavigate();

  const loadCondicional = useCallback(async () => {
    if (!condicionalId) return;
    try {
      setLoading(true);
      const res = await api.get(`/condicionais-fornecedor/${condicionalId}/completa`);
      setCondicional(res.data);
    } catch (e) {
      console.error('Erro ao buscar condicional completa:', e);
    } finally {
      setLoading(false);
    }
  }, [condicionalId]);

  const loadStatus = useCallback(async () => {
    if (!condicionalId) return;
    try {
      const res = await api.get(`/condicionais-fornecedor/${condicionalId}/status-devolucao`);
      setStatus(res.data);
    } catch (e) {
      console.error('Erro ao buscar status de devolução:', e);
    }
  }, [condicionalId]);

  const loadProdutosDevolucao = useCallback(async () => {
    if (!condicionalId) return;
    try {
      setLoading(true);
      const res = await api.get<Produto[]>(`/condicionais-fornecedor/${condicionalId}/produtos`);
      const produtos = res.data;
      const produtosComSaida: ProdutoDevolucao[] = [];
      for (const produto of produtos) {
        try {
          const saidaRes = await api.get<Saida[]>(`/condicionais-fornecedor/produto-vendido/${produto._id}`);
          produtosComSaida.push({ produto, saida: saidaRes.data || [] });
        } catch  {
          produtosComSaida.push({ produto, saida: [] });
        }
      }
      setProdutosDevolucao(produtosComSaida);
    } catch (e) {
      console.error('Erro ao carregar produtos para devolução condicional de fornecedor:', e);
    } finally {
      setLoading(false);
    }
  }, [condicionalId]);

  useEffect(() => {
    loadCondicional();
    loadStatus();
    loadProdutosDevolucao();
  }, [loadCondicional, loadStatus, loadProdutosDevolucao]);

  const isExpired = useMemo(() => {
    if (!condicional) return false;
    const prazo = condicional.prazo_devolucao;
    if (!prazo) return false;
    if (!condicional.data_condicional) return false;
    const data = new Date(condicional.data_condicional);
    data.setDate(data.getDate() + Number(prazo));
    return data < new Date();
  }, [condicional]);

  // Per-product calculations
  const computeQuantidades = (p: ProdutoDevolucao) => {
    const { produto, saida } = p;
    // quantidade em condicional: somar itens que contém condicionalId
    const quantidadeEmCondicional = produto.itens.reduce((acc: number, it) => {
      const count = (it.condicionais_fornecedor || []).filter((cid) => cid === condicionalId).length;
      return acc + (it.quantity || 0) * (count > 0 ? 1 : 0);
    }, 0);

    // vendido a partir desta condicional para este produto
    const vendidoCondicional = saida.reduce((acc: number, s) => {
      if (s.tipo === 'venda' && s.condicional_fornecedor_id === condicionalId && s.produtos_id === produto._id) {
        return acc + (s.quantidade || 0);
      }
      return acc;
    }, 0);

    // já devolvido deste condicional para este produto
    const devolvidoCondicional = saida.reduce((acc: number, s) => {
      if (s.tipo === 'devolucao' && s.condicional_fornecedor_id === condicionalId && s.produtos_id === produto._id) {
        return acc + (s.quantidade || 0);
      }
      return acc;
    }, 0);

    const disponivelParaDevolver = Math.max(0, quantidadeEmCondicional - vendidoCondicional - devolvidoCondicional);

    const precoCustoTotal = (produto.preco_custo || 0) * (quantidadeEmCondicional || 0) / 100;

    return { quantidadeEmCondicional, vendidoCondicional, devolvidoCondicional, disponivelParaDevolver, precoCustoTotal };
  };

  const totalCostBefore = useMemo(() => {
    return produtosDevolucao.reduce((acc, p) => {
      const calc = computeQuantidades(p);
      return acc + (p.produto.preco_custo || 0) * calc.quantidadeEmCondicional;
    }, 0);
  }, [produtosDevolucao]);

  const totalCostAfter = useMemo(() => {
    return produtosDevolucao.reduce((acc, p) => {
      const calc = computeQuantidades(p);
      const toReturn = quantidadesParaDevolver[p.produto._id] || 0;
      const remaining = Math.max(0, calc.quantidadeEmCondicional - toReturn);
      return acc + (p.produto.preco_custo || 0) * remaining;
    }, 0);
  }, [produtosDevolucao, quantidadesParaDevolver]);

  const percentSold = useMemo(() => {
    if (!status) return 0;
    const totalSent = (status.quantidade_em_condicional || 0) + (status.quantidade_vendida || 0) + (status.quantidade_devolvida || 0);
    if (totalSent === 0) return 0;
    return Math.round(((status.quantidade_vendida || 0) / totalSent) * 100);
  }, [status]);

  // total items selected for return
  const totalItemsSelected = useMemo(() => Object.values(quantidadesParaDevolver).reduce((acc, v) => acc + (v || 0), 0), [quantidadesParaDevolver]);

  // total cost (custo) associated with the selected returns
  const totalReturnCost = useMemo(() => {
    return produtosDevolucao.reduce((acc, p) => {
      const q = quantidadesParaDevolver[p.produto._id] || 0;
      return acc + q * (p.produto.preco_custo || 0);
    }, 0);
  }, [produtosDevolucao, quantidadesParaDevolver]);

  const handleChangeQuantity = (produtoId: string, value: number, max: number) => {
    const v = Math.max(0, Math.min(value || 0, max));
    setQuantidadesParaDevolver((prev) => ({ ...prev, [produtoId]: v }));
  };

  const handleClearSelection = () => setQuantidadesParaDevolver({});

  const processDevolucoes = async () => {
    if (!condicionalId) return;
    setWarning(null);
    setBusy(true);
    try {
      // Coletar IDs dos produtos selecionados para devolução
      const produtosDevolvidosIds = Object.entries(quantidadesParaDevolver)
        .filter(([, q]) => q > 0)
        .map(([produtoId]) => produtoId)
        .filter(Boolean) as string[];

      // Chamar o endpoint para processar retorno com os IDs selecionados (ou vazio)
      await api.post(`/condicionais-fornecedor/${condicionalId}/processar-retorno`, { produtos_devolvidos_ids: produtosDevolvidosIds });
      
      // sucesso: recarregar dados e redirecionar
      setQuantidadesParaDevolver({});
      await loadStatus();
      await loadProdutosDevolucao();
      
      setTimeout(() => {
        navigate('/condicionais-fornecedor');
      }, 2000);
    } catch (e) {
      console.error('Erro ao processar devoluções:', e);
      setWarning('Erro ao processar devoluções. Veja o console para detalhes.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitDevolucoes = () => {
    setConfirmOpen(true);
  };

  return (
    <Box>
      <Title text="Devolução de Condicional de Fornecedor" />

      {loading && <CircularProgress />}

      {condicional && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 2, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Condicional: {condicional._id}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap">
              <Chip label={`Fornecedor: ${condicional.fornecedor?.fornecedor || condicional.fornecedor_id || ''}`} sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }} />
              {condicional.prazo_devolucao != null && (
                <Chip label={`Prazo (dias): ${condicional.prazo_devolucao}`} color={isExpired ? 'error' : 'default'} sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }} />
              )}
              {status && (
                <Chip label={`Vendidos: ${status.quantidade_vendida || 0}`} sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }} />
              )}
              {status && (
                <Chip label={`Percent vendido: ${percentSold}%`} sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }} />
              )}
            </Stack>
            {isExpired && (
              <Alert icon={<WarningAmberIcon />} severity="warning" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Prazo de devolução expirado</Alert>
            )}
            {condicional.fechada && (
              <Alert severity="error" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Esta condicional já foi finalizada e não pode mais ser modificada</Alert>
            )}
          </Stack>
        </Paper>
      )}

      {warning && <Alert severity="warning" sx={{ mb: 2 }}>{warning}</Alert>}

      <Grid container spacing={2}>
        {produtosDevolucao.map(({ produto, saida }) => {
          const { quantidadeEmCondicional, vendidoCondicional, devolvidoCondicional, disponivelParaDevolver } = computeQuantidades({ produto, saida });
          const selected = quantidadesParaDevolver[produto._id] || 0;

          return (
            <Grid item xs={12} md={12} key={produto._id}>
              <Paper sx={{ p: { xs: 2, sm: 3 }, '&:hover': { boxShadow: 6 }, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2 } }}> 
                <Stack spacing={{ xs: 2, sm: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Avatar sx={{ bgcolor: 'primary.main', width: { xs: 48, sm: 56 }, height: { xs: 48, sm: 56 }, fontSize: { xs: 18, sm: 22 }, flexShrink: 0 }}>{produto.descricao?.charAt(0) ?? produto.codigo_interno?.charAt(0)}</Avatar> 
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' }, fontWeight: 600, mb: 0.5 }}>{produto.codigo_interno} — {produto.descricao}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{produto.marca_fornecedor || 'Sem marca'}</Typography>
                    </Box>
                  </Stack>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 2 }} sx={{ bgcolor: '#f5f5f5', p: { xs: 1.5, sm: 2 }, borderRadius: 1 }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ flex: 1 }}>
                      <Chip label={`Em estoque: ${quantidadeEmCondicional}`} size="medium" color={disponivelParaDevolver > 0 ? 'success' : 'default'} sx={{ fontWeight: 600 }} />
                      <Chip label={`Vendidos: ${vendidoCondicional}`} size="medium" color="primary" />
                      <Chip label={`Devolvidos: ${devolvidoCondicional}`} size="medium" />
                    </Stack>
                    <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, pt: { xs: 1, sm: 0 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Subtotal em estoque</Typography>
                      <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, color: 'primary.main' }}>{formatCurrency((produto.preco_custo || 0) * quantidadeEmCondicional)}</Typography>
                    </Box>
                  </Stack>
                </Stack>

                <Divider />

                <Stack spacing={{ xs: 2, sm: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 3 }} sx={{ bgcolor: '#fafafa', p: { xs: 1.5, sm: 2 }, borderRadius: 1 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Preço Custo</Typography>
                      <Typography variant="body1" fontWeight={600} sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>{formatCurrency(produto.preco_custo || 0)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Preço Venda</Typography>
                      <Typography variant="body1" fontWeight={600} sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>{formatCurrency(produto.preco_venda || 0)}</Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ bgcolor: selected > 0 ? '#e3f2fd' : 'transparent', p: { xs: 1.5, sm: 2 }, borderRadius: 1, border: selected > 0 ? '2px solid #2196f3' : 'none' }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1, fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>Disponível para devolver: <Box component="span" sx={{ color: 'success.main', fontSize: { xs: '1rem', sm: '1.1rem' } }}>{disponivelParaDevolver}</Box></Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        label="Quantidade a devolver"
                        type="number"
                        size="medium"
                        value={selected}
                        onChange={(e) => handleChangeQuantity(produto._id, Number(e.target.value), disponivelParaDevolver)}
                        inputProps={{ min: 0, max: disponivelParaDevolver }}
                        disabled={condicional?.fechada}
                        sx={{ 
                          flex: 1,
                          '& .MuiInputBase-root': { fontSize: { xs: '1rem', sm: '1rem' } },
                          '& .MuiInputLabel-root': { fontSize: { xs: '0.9rem', sm: '1rem' } }
                        }}
                      />
                      <Tooltip title="Limpar">
                        <IconButton 
                          size="large" 
                          onClick={() => handleChangeQuantity(produto._id, 0, disponivelParaDevolver)}
                          disabled={condicional?.fechada}
                          sx={{ 
                            bgcolor: 'error.light',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.main' },
                            width: { xs: 44, sm: 48 },
                            height: { xs: 44, sm: 48 }
                          }}
                        >
                          <Box component="span" sx={{ fontSize: { xs: 18, sm: 20 }, lineHeight: 1 }}>✕</Box>
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>

                  <Accordion sx={{ mt: 1 }}>
                    <AccordionSummary>Vendas / Saídas ({saida.length})</AccordionSummary>
                    <AccordionDetails>
                      {saida.length === 0 && <Typography variant="body2" color="text.secondary">Sem saídas registradas</Typography>}
                      {saida.map((s) => (
                        <Box key={s._id} sx={{ mb: 1, borderBottom: '1px solid #eee', pb: 1 }}>
                          <Typography variant="body2"><strong>{s.tipo}</strong> — {new Date(s.data_saida).toLocaleString()}</Typography>
                          <Typography variant="body2">Quantidade: {s.quantidade}</Typography>
                          {s.observacoes && <Typography variant="body2">Obs: {s.observacoes}</Typography>}
                          {s.condicional_fornecedor_id && <Chip label={`Condicional: ${s.condicional_fornecedor_id}`} size="small" sx={{ mt: 0.5 }} />}
                        </Box>
                      ))}
                    </AccordionDetails>
                  </Accordion>
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Paper sx={{ p: { xs: 2, sm: 3 }, mt: 3, borderRadius: 2, bgcolor: '#f5f5f5' }}>
        <Stack spacing={{ xs: 2, sm: 3 }}>
          <Stack spacing={{ xs: 2, sm: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap">
              <Chip 
                label={`Itens selecionados: ${totalItemsSelected}`} 
                color="primary" 
                sx={{ fontSize: { xs: '0.9rem', sm: '0.95rem' }, fontWeight: 600, height: { xs: 36, sm: 40 } }}
              />
              <Chip 
                label={`Total a devolver: ${formatCurrency(totalReturnCost)}`} 
                color="secondary" 
                sx={{ fontSize: { xs: '0.9rem', sm: '0.95rem' }, fontWeight: 600, height: { xs: 36, sm: 40 } }}
              />
            </Stack>
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 4 }} sx={{ bgcolor: 'white', p: { xs: 2, sm: 2 }, borderRadius: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Valor em estoque (antes)</Typography>
                <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, color: 'text.primary' }}>{formatCurrency(totalCostBefore)}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Valor em estoque (depois)</Typography>
                <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, color: 'success.main' }}>{formatCurrency(totalCostAfter)}</Typography>
              </Box>
            </Stack>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button 
              variant="outlined" 
              onClick={handleClearSelection} 
              disabled={busy || totalItemsSelected === 0 || condicional?.fechada}
              sx={{ 
                height: { xs: 48, sm: 44 },
                fontSize: { xs: '0.95rem', sm: '0.875rem' },
                fontWeight: 600
              }}
            >
              Limpar Seleção
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSubmitDevolucoes} 
              disabled={busy || condicional?.fechada}
              sx={{
                backgroundColor: 'primary.main',
                color: 'secondary.main',
                '&:hover': { backgroundColor: 'primary.dark' },
                height: { xs: 48, sm: 44 },
                fontSize: { xs: '0.95rem', sm: '0.875rem' },
                fontWeight: 700,
                px: 3
              }}
            >
              {busy ? 'Processando...' : condicional?.fechada ? 'Condicional Fechada' : 'Finalizar Condicional'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar finalização do condicional</DialogTitle>
        <DialogContent dividers>
          {totalItemsSelected > 0 ? (
            <>
              <Typography variant="body2" gutterBottom>Itens a devolver antes da finalização:</Typography>
              {produtosDevolucao.filter(p => (quantidadesParaDevolver[p.produto._id] || 0) > 0).map(p => (
                <Box key={p.produto._id} sx={{ mb: 1 }}>
                  <Typography variant="body2">{p.produto.codigo_interno} — {p.produto.descricao}: {quantidadesParaDevolver[p.produto._id]} unidade(s) — {formatCurrency((quantidadesParaDevolver[p.produto._id]||0)*(p.produto.preco_custo||0))}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1">Total a devolver: <strong>{formatCurrency(totalReturnCost)}</strong></Typography>
            </>
          ) : (
            <Typography variant="body2">Nenhum item selecionado para devolução. O condicional será finalizado removendo os itens vendidos e alterando o status dos restantes.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={async () => { setConfirmOpen(false); await processDevolucoes(); }} disabled={busy}>{busy ? 'Processando...' : 'Confirmar'}</Button>
        </DialogActions>
      </Dialog> 

    </Box>
  );
};

export default DevolucaoCondicionalFornecedor;