import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import api from '../lib/axios';
import type { Produto } from '../types';

interface AddProdutoModalProps {
  open: boolean;
  onClose: () => void;
  onAddProduto: (produto: Produto) => void;
}

const AddProdutoModal: React.FC<AddProdutoModalProps> = ({
  open,
  onClose,
  onAddProduto,
}) => {
  const [productOptions, setProductOptions] = useState<Produto[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);

  const searchProducts = async (q: string) => {
    if (!q || q.trim() === '') {
      setProductOptions([]);
      return;
    }
    setLoadingProducts(true);
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/produtos/', { headers: { Authorization: `Bearer ${token}` }, params: { q } });
      setProductOptions(res.data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setProductOptions([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleAdd = () => {
    if (selectedProduct) {
      onAddProduto(selectedProduct);
      setSelectedProduct(null);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedProduct(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Adicionar Produto</DialogTitle>
      <DialogContent>
        <Autocomplete
          options={productOptions}
          getOptionLabel={(opt) => `${opt.descricao} (${opt.codigo_interno})`}
          loading={loadingProducts}
          onInputChange={(_e, v) => searchProducts(v)}
          onChange={(_e, value) => setSelectedProduct(value)}
          value={selectedProduct}
          renderInput={(params) => (
            <TextField {...params} label="Buscar Produto" />
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Tooltip title="Adicionar Produto">
          <IconButton onClick={handleAdd} disabled={!selectedProduct}>
            <Add />
          </IconButton>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
};

export default AddProdutoModal;