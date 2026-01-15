import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';
import api from '../../../lib/axios';
import type { Item } from '../../../types';

interface VendaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  produtoId?: string;
  produtoDescricao?: string;
  clienteId?: string | null;
  clienteDescricao?: string | null;
}

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

function VendaModal({ open, onClose, onSuccess, produtoId = '', produtoDescricao = '', clienteId = null, clienteDescricao = null }: VendaModalProps) {
  interface VendaForm { produto_id: string; quantidade: number; cliente_id: string; valor_total: number; observacoes: string }
  const [formData, setFormData] = useState<VendaForm>({
    produto_id: produtoId,
    quantidade: 1,
    cliente_id: clienteId ?? '',
    valor_total: 0,
    observacoes: '',
  });

  // Produto details fetched to get preco_venda and estoque
  const [unitPrice, setUnitPrice] = useState<number>(0); // em cents
  const [subtotal, setSubtotal] = useState<number>(0); // em cents
  const [valorOverridden, setValorOverridden] = useState(false);
  const [estoqueDisponivel, setEstoqueDisponivel] = useState<number | null>(null);

  // Sincronizar produtoId e clienteId enviados via props com o form (caso mudem entre aberturas)
  useEffect(() => {
    setFormData((f) => ({ ...f, produto_id: produtoId, cliente_id: clienteId ?? '' }));
    // reset override ao abrir com novo produto
    setValorOverridden(false);
    setUnitPrice(0);
    setSubtotal(0);
  }, [produtoId, clienteId]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (field: keyof VendaForm, value: string | number) => {
    // se usuário editar valor_total manualmente, marcar override
    if (field === 'valor_total') setValorOverridden(true);
    setFormData({ ...formData, [field]: value } as unknown as VendaForm);
  };

  // Buscar detalhes do produto quando produto_id estiver definido
  useEffect(() => {
    const loadProduto = async () => {
      if (!formData.produto_id) return;
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/produtos/${formData.produto_id}`, { headers: { Authorization: `Bearer ${token}` } });
        const preco = res.data.preco_venda ?? 0;
        setUnitPrice(preco);
        // calcular estoque disponível
        const estoque = (res.data.itens || []).filter((it: Item) => !it.condicional_fornecedor_id && !it.condicional_cliente_id).reduce((s: number, it: Item) => s + (it.quantity || 0), 0);
        setEstoqueDisponivel(estoque);
        // Note: API returns items with shape similar to Item type; runtime checks kept here.
        // calcular subtotal
        const sub = (formData.quantidade || 1) * preco;
        setSubtotal(sub);
        if (!valorOverridden) {
          setFormData((f) => ({ ...f, valor_total: sub }));
        }
      } catch (e) {
        console.error('Erro ao buscar produto:', e);
      }
    };
    loadProduto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.produto_id]);

  // recalcular subtotal quando quantidade mudar
  useEffect(() => {
    const newSub = (formData.quantidade || 1) * (unitPrice || 0);
    setSubtotal(newSub);
    if (!valorOverridden) setFormData((f) => ({ ...f, valor_total: newSub }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.quantidade, unitPrice]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await api.post(`/vendas/`, formData);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: unknown) {
      let respDetail: string | undefined;
      if (err && typeof err === 'object' && 'response' in err) {
        const r = (err as { response?: { data?: { detail?: string } } }).response;
        respDetail = r?.data?.detail;
      }
      const msg = respDetail ?? (err instanceof Error ? err.message : String(err));
      setError(msg || 'Erro ao criar venda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Criar Venda</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {produtoDescricao && (
              <Alert severity="info">Produto: {produtoDescricao}</Alert>
            )}
            
            <TextField
              label="Produto ID"
              value={formData.produto_id}
              onChange={(e) => handleChange('produto_id', e.target.value)}
              required
              disabled={!!produtoId}
            />

            <TextField
              label="Quantidade"
              type="number"
              value={formData.quantidade}
              onChange={(e) => handleChange('quantidade', Math.max(1, parseInt(e.target.value) || 1))}
              required
              inputProps={{ min: 1 }}
            />

            {/* Mostrar cliente selecionado (se passado via props) como info; caso contrário, permitir inserir cliente_id manualmente */}
            {clienteDescricao ? (
              <Alert severity="info">Cliente: {clienteDescricao}</Alert>
            ) : (
              <TextField
                label="Cliente ID (opcional)"
                value={formData.cliente_id}
                onChange={(e) => handleChange('cliente_id', e.target.value)}
              />
            )}

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Preço Unitário"
                  value={unitPrice ? `R$ ${(unitPrice / 100).toFixed(2)}` : ''}
                  InputProps={{ readOnly: true }}
                  fullWidth
                />
              </Box>
              <Box sx={{ width: 160 }}>
                <TextField
                  label="Subtotal"
                  value={`R$ ${(subtotal / 100).toFixed(2)}`}
                  InputProps={{ readOnly: true }}
                  fullWidth
                />
              </Box>
            </Box>

            <TextField
              label="Valor Total (em centavos)"
              type="number"
              value={formData.valor_total}
              onChange={(e) => handleChange('valor_total', parseInt(e.target.value) || 0)}
              inputProps={{ min: 0 }}
              helperText={valorOverridden ? 'Valor manual' : 'Calculado automaticamente (pode editar)'}
            />

            <TextField
              label="Observações"
              value={formData.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              multiline
              rows={3}
            />

            {error && <Alert severity="error">{error}</Alert>}

            {estoqueDisponivel !== null && (
              <Box sx={{ mt: 1 }}>
                <small>Estoque disponível: {estoqueDisponivel}</small>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.produto_id || formData.quantidade < 1 || (estoqueDisponivel !== null && formData.quantidade > estoqueDisponivel)}
          >
            {loading ? <CircularProgress size={24} /> : 'Criar Venda'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={success}
        autoHideDuration={2000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success">Venda criada com sucesso!</Alert>
      </Snackbar>
    </>
  );
}

export default VendaModal;
