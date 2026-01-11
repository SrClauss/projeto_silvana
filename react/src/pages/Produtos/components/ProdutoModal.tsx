import React from 'react';
import {
  Box,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Chip,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import type { Tag } from '../../../types';
import MarcaFornecedorModal from '../../../components/MarcaFornecedorModal';
import type { MarcaFornecedor } from '../../../types';

interface ProdutoModalProps {
  open: boolean;
  onClose: () => void;
  editingId: string | null;
  newProduto: {
    codigo_interno: string;
    codigo_externo: string;
    descricao: string;
    marca_fornecedor: string;
    sessao: string;
    preco_custo: number;
    preco_venda: number;
    tags: Tag[];
  };
  setNewProduto: React.Dispatch<React.SetStateAction<{
    codigo_interno: string;
    codigo_externo: string;
    descricao: string;
    marca_fornecedor: string;
    sessao: string;
    preco_custo: number;
    preco_venda: number;
    tags: Tag[];
  }>>;
  codigoError: string | null;
  setCodigoError: React.Dispatch<React.SetStateAction<string | null>>;
  addingProduto: boolean;
  handleAddProduto: () => Promise<void>;
  modalTagInput: string;
  setModalTagInput: React.Dispatch<React.SetStateAction<string>>;
  tagOptions: Tag[];
  loadingTags: boolean;
  searchTags: (q: string) => Promise<void>;
  createTag: (descricao: string) => Promise<Tag | null>;
}

const ProdutoModal: React.FC<ProdutoModalProps> = ({
  open,
  onClose,
  editingId,
  newProduto,
  setNewProduto,
  codigoError,
  setCodigoError,
  addingProduto,
  handleAddProduto,
  modalTagInput,
  setModalTagInput,
  tagOptions,
  loadingTags,
  searchTags,
  createTag,
}) => {
  const theme = useTheme();
  const [marcaModalOpen, setMarcaModalOpen] = React.useState(false);
  const [marcaOptions, setMarcaOptions] = React.useState<MarcaFornecedor[]>([]);
  const [marcaLoading, setMarcaLoading] = React.useState(false);
  const [marcaInputValue, setMarcaInputValue] = React.useState('');

  const searchMarcas = async (q: string) => {
    setMarcaLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/marcas-fornecedores/', { headers: { Authorization: `Bearer ${token}` } });
      const list: MarcaFornecedor[] = res.data;
      const filtered = q ? list.filter(m => (m.nome || '').toLowerCase().includes(q.toLowerCase()) || (m.fornecedor || '').toLowerCase().includes(q.toLowerCase())) : list;
      setMarcaOptions(filtered);
    } catch (e) {
      console.error('Erro ao buscar marcas/fornecedores:', e);
      setMarcaOptions([]);
    } finally {
      setMarcaLoading(false);
    }
  };

  const handleSaveMarca = (marca: MarcaFornecedor) => {
    // Atualizar o campo marca_fornecedor com o nome da marca
    setNewProduto({ ...newProduto, marca_fornecedor: marca.nome });
    // adicionar a lista local de options
    setMarcaOptions(prev => [marca, ...prev.filter(m => m._id !== marca._id)]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth sx={{ maxHeight: '80vh' }}>
      <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.secondary.main }}>
        {editingId ? 'Editar Produto' : 'Adicionar Produto'}
      </DialogTitle>
      <DialogContent sx={{ p: 2, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              label="Código Interno"
              value={newProduto.codigo_interno}
              onChange={(e) => { setNewProduto({ ...newProduto, codigo_interno: e.target.value }); setCodigoError(null); }}
              error={!!codigoError}
              helperText={codigoError ?? ''}
              fullWidth
            />
            <TextField
              size="small"
              label="Código Externo"
              value={newProduto.codigo_externo}
              onChange={(e) => setNewProduto({ ...newProduto, codigo_externo: e.target.value })}
              fullWidth
            />
          </Box>
          <TextField
            size="small"
            label="Descrição"
            value={newProduto.descricao}
            onChange={(e) => setNewProduto({ ...newProduto, descricao: e.target.value })}
            fullWidth
          />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Autocomplete
              size="small"
              options={marcaOptions}
              getOptionLabel={(option) => typeof option === 'string' ? option : option.nome}
              value={marcaOptions.find(m => m.nome === newProduto.marca_fornecedor) ?? (newProduto.marca_fornecedor || null)}
              onChange={(_e, value) => {
                if (!value) {
                  setNewProduto({ ...newProduto, marca_fornecedor: '' });
                  return;
                }
                if (typeof value === 'string') setNewProduto({ ...newProduto, marca_fornecedor: value });
                else setNewProduto({ ...newProduto, marca_fornecedor: value.nome });
              }}
              inputValue={marcaInputValue}
              onInputChange={(_e, v) => { setMarcaInputValue(v); searchMarcas(v); }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Marca/Fornecedor"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {marcaLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              onOpen={() => searchMarcas('')}
              filterOptions={(options, { inputValue }) =>
                options.filter((o) => o.nome.toLowerCase().includes(inputValue.toLowerCase()) || o.fornecedor.toLowerCase().includes(inputValue.toLowerCase()))
              }
              freeSolo
              fullWidth
            />
            <IconButton onClick={() => setMarcaModalOpen(true)} sx={{ color: theme.palette.secondary.main }}>
              <Add />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              label="Preço Custo"
              type="number"
              inputProps={{ step: '0.01' }}
              value={newProduto.preco_custo === 0 ? '' : newProduto.preco_custo}
              onChange={(e) => setNewProduto({ ...newProduto, preco_custo: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
              fullWidth
            />
            <TextField
              size="small"
              label="Preço Venda"
              type="number"
              inputProps={{ step: '0.01' }}
              value={newProduto.preco_venda === 0 ? '' : newProduto.preco_venda}
              onChange={(e) => setNewProduto({ ...newProduto, preco_venda: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
              fullWidth
            />
          </Box>
          <Box>
            <Autocomplete
              freeSolo
              options={tagOptions}
              getOptionLabel={(option) => typeof option === 'string' ? option : option.descricao}
              isOptionEqualToValue={(option, value) => {
                if (typeof option === 'string' || typeof value === 'string') return option === value;
                return option._id === value._id;
              }}
              inputValue={modalTagInput}
              onInputChange={(_e, v) => setModalTagInput(v)}
              onChange={async (_e, value) => {
                if (!value) return;
                let tagObj: Tag | null = null;
                if (typeof value === 'string') {
                  tagObj = await createTag(value);
                } else {
                  tagObj = value;
                }
                if (tagObj && !newProduto.tags.some((t) => t._id === tagObj._id)) {
                  setNewProduto({ ...newProduto, tags: [...newProduto.tags, tagObj] });
                }
                setModalTagInput('');
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Adicionar tag"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const v = modalTagInput.trim();
                      if (v) {
                        const created = await createTag(v);
                        if (created && !newProduto.tags.some((t) => t._id === created._id)) {
                          setNewProduto({ ...newProduto, tags: [...newProduto.tags, created] });
                        }
                        setModalTagInput('');
                      }
                    }
                  }}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingTags ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              loading={loadingTags}
              onOpen={() => searchTags('')}
              filterOptions={(options, params) => {
                const filtered = options.filter((option) =>
                  option.descricao.toLowerCase().includes(params.inputValue.toLowerCase())
                );
                return filtered;
              }}
            />
            {newProduto.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                {newProduto.tags.map((t) => (
                  <Chip
                    key={t._id}
                    label={t.descricao_case_insensitive ?? t.descricao}
                    title={t.descricao}
                    onDelete={() => setNewProduto({ ...newProduto, tags: newProduto.tags.filter(x => x._id !== t._id) })}
                    sx={{ bgcolor: theme.palette.secondary.main, color: theme.palette.primary.main }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 1 }}>
        <Button
          size="small"
          onClick={handleAddProduto}
          variant="contained"
          sx={{ bgcolor: theme.palette.secondary.main, color: theme.palette.primary.main, width: '100%' }}
          disabled={addingProduto}
        >
          {addingProduto ? 'Salvando...' : (editingId ? 'Salvar' : 'Adicionar')}
        </Button>
        <Button size="small" onClick={onClose} sx={{ color: theme.palette.primary.main, width: '100%' }}>
          Cancelar
        </Button>
      </DialogActions>
      <MarcaFornecedorModal
        open={marcaModalOpen}
        onClose={() => setMarcaModalOpen(false)}
        editingMarca={null}
        onSave={handleSaveMarca}
      />
    </Dialog>
  );
};

export default ProdutoModal;