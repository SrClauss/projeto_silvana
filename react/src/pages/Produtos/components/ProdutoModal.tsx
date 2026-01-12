import React from 'react';
import {
  Box,
  Typography,
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
import { Add, Delete } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import type { Tag, Item, Sessao } from '../../../types';
import MarcaFornecedorModal from '../../../components/MarcaFornecedorModal';
import SessaoModal from '../../Sessoes/components/SessaoModal';
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
    itens: Item[];
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
    itens: Item[];
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
  const [selectedMarca, setSelectedMarca] = React.useState<MarcaFornecedor | null>(null);

  const [sessaoModalOpen, setSessaoModalOpen] = React.useState(false);
  const [sessaoOptions, setSessaoOptions] = React.useState<Sessao[]>([]);
  const [sessaoLoading, setSessaoLoading] = React.useState(false);
  const [sessaoInputValue, setSessaoInputValue] = React.useState('');

  const [tempItens, setTempItens] = React.useState<Item[]>([]);

  React.useEffect(() => {
    setTempItens(newProduto.itens);
  }, [newProduto.itens, open]);

  const addItem = () => {
    setTempItens([...tempItens, { quantity: 1, acquisition_date: new Date().toISOString().split('T')[0] }]);
  };

  const removeItem = (index: number) => {
    setTempItens(tempItens.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof Item, value: string | number) => {
    setTempItens(tempItens.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleAddProdutoLocal = async () => {
    let finalItens = tempItens;
    if (finalItens.length === 0) {
      finalItens = [{ quantity: 0, acquisition_date: new Date().toISOString().split('T')[0] }];
    }
    setNewProduto({ ...newProduto, itens: finalItens });
    await handleAddProduto();
  };

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

  // Helper para label consistente
  const marcaLabel = (option: string | MarcaFornecedor | null) => {
    if (!option) return '';
    if (typeof option === 'string') return option;
    const nome = option.nome || '';
    const fornecedor = option.fornecedor || '';
    return fornecedor && fornecedor !== nome ? `${nome} / ${fornecedor}` : nome;
  };

  const searchSessoes = async (q: string) => {
    setSessaoLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/sessoes/', { headers: { Authorization: `Bearer ${token}` } });
      const list: Sessao[] = res.data;
      const filtered = q ? list.filter(s => (s.nome || '').toLowerCase().includes(q.toLowerCase()) || (s.localizacao || '').toLowerCase().includes(q.toLowerCase())) : list;
      setSessaoOptions(filtered);
    } catch (e) {
      console.error('Erro ao buscar sessões:', e);
      setSessaoOptions([]);
    } finally {
      setSessaoLoading(false);
    }
  };

  const handleSaveMarca = (marca: MarcaFornecedor) => {
    // Ao criar/editar uma marca, NÃO predefinir o select: limpar o valor para o usuário escolher
    setNewProduto({ ...newProduto, marca_fornecedor: '' });
    setSelectedMarca(null);
    setMarcaInputValue('');
    // adicionar a lista local de options (deixa disponível para seleção)
    setMarcaOptions(prev => [marca, ...prev.filter(m => m._id !== marca._id)]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth sx={{ '& .MuiDialog-paper': { height: '90vh' } }}>
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
              getOptionLabel={(option) => marcaLabel(option as any)}
              isOptionEqualToValue={(option, value) => {
                if (!option || !value) return false;
                const optId = (option as MarcaFornecedor)._id;
                const valId = (value as MarcaFornecedor)._id;
                if (optId && valId) return optId === valId;
                // fallback to name equality
                return (option as any).nome === (value as any).nome;
              }}
              value={selectedMarca}
              onChange={(_e, value) => {
                if (!value) {
                  setSelectedMarca(null);
                  setMarcaInputValue('');
                  setNewProduto({ ...newProduto, marca_fornecedor: '' });
                  return;
                }
                if (typeof value === 'string') {
                  // free text typed/selected
                  setSelectedMarca(null);
                  setMarcaInputValue(value);
                  setNewProduto({ ...newProduto, marca_fornecedor: value });
                } else {
                  setSelectedMarca(value);
                  setMarcaInputValue(marcaLabel(value));
                  setNewProduto({ ...newProduto, marca_fornecedor: value.nome });
                }
              }}
              inputValue={marcaInputValue}
              onInputChange={(_e, v, reason) => {
                setMarcaInputValue(v);
                if (reason === 'input') searchMarcas(v);
              }}
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

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Autocomplete
              size="small"
              options={sessaoOptions}
              getOptionLabel={(option) => typeof option === 'string' ? option : option.nome}
              value={sessaoOptions.find(s => s.nome === newProduto.sessao) ?? (newProduto.sessao || null)}
              onChange={(_e, value) => {
                if (!value) {
                  setNewProduto({ ...newProduto, sessao: '' });
                  return;
                }
                if (typeof value === 'string') setNewProduto({ ...newProduto, sessao: value });
                else setNewProduto({ ...newProduto, sessao: value.nome });
              }}
              inputValue={sessaoInputValue}
              onInputChange={(_e, v) => { setSessaoInputValue(v); searchSessoes(v); }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Sessão"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {sessaoLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              onOpen={() => searchSessoes('')}
              filterOptions={(options, { inputValue }) =>
                options.filter((o) => o.nome.toLowerCase().includes(inputValue.toLowerCase()) || (o.localizacao || '').toLowerCase().includes(inputValue.toLowerCase()))
              }
              freeSolo
              fullWidth
            />
            <IconButton onClick={() => setSessaoModalOpen(true)} sx={{ color: theme.palette.secondary.main }}>
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
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6">Itens no Estoque</Typography>
          {tempItens.map((item, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
              <TextField
                label="Quantidade"
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                size="small"
              />
              <TextField
                label="Data de Aquisição"
                type="date"
                value={item.acquisition_date}
                onChange={(e) => updateItem(index, 'acquisition_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <IconButton onClick={() => removeItem(index)} size="small">
                <Delete />
              </IconButton>
            </Box>
          ))}
          <Button onClick={addItem} size="small" sx={{ mt: 1 }}>
            Adicionar Item
          </Button>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 1 }}>
        <Button
          size="small"
          onClick={handleAddProdutoLocal}
          variant="contained"
          sx={{  width: '100%' }}
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

      <SessaoModal
        open={sessaoModalOpen}
        onClose={() => setSessaoModalOpen(false)}
        editingSessao={null}
        onSave={(sessao) => {
          // atualizar sessao no produto (nome) e na lista local de sessoes
          setNewProduto({ ...newProduto, sessao: sessao.nome });
          setSessaoOptions(prev => [sessao, ...prev.filter(s => s._id !== sessao._id)]);
        }}
      />
    </Dialog>
  );
};

export default ProdutoModal;