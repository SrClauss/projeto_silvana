import React from 'react';
import api from '../lib/axios'
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
  // @ts-ignore
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import type { Tag, Item, Sessao } from '../types';
import MarcaFornecedorModal from './MarcaFornecedorModal';
import SessaoModal from '../pages/Sessoes/components/SessaoModal';
import type { MarcaFornecedor } from '../types';


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface ProdutoModalProps {
  open: boolean;
  onClose: () => void;
  editingId: string | null;
  condicionalFornecedorId?: string;
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
  onAddProduto: (produto: {
    codigo_interno: string;
    codigo_externo: string;
    descricao: string;
    marca_fornecedor: string;
    sessao: string;
    preco_custo: number;
    preco_venda: number;
    tags: Tag[];
    itens: Item[];
  }) => void;
  modalTagInput: string;
  setModalTagInput: React.Dispatch<React.SetStateAction<string>>;
  tagOptions: Tag[];
  setTagOptions: React.Dispatch<React.SetStateAction<Tag[]>>;
  loadingTags: boolean;
  searchTags: (q: string) => Promise<void>;
  createTag: (descricao: string) => Promise<Tag | null>;
  defaultMarcaFornecedor?: MarcaFornecedor;
  defaultCodigo?: string;
  nextNumeration?: string;
}

const ProdutoModal: React.FC<ProdutoModalProps> = ({
  open,
  onClose,
  editingId,
  condicionalFornecedorId,
  newProduto,
  setNewProduto,
  onAddProduto,
  modalTagInput,
  setModalTagInput,
  tagOptions,
  setTagOptions,
  loadingTags,
  searchTags,
  createTag,
  defaultMarcaFornecedor,
  defaultCodigo,
  nextNumeration,
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

  const [confirmTagModalOpen, setConfirmTagModalOpen] = React.useState(false);
  const [pendingTag, setPendingTag] = React.useState<string>('');

  const [tempItens, setTempItens] = React.useState<Item[]>([]);

  React.useEffect(() => {
    const formattedItens = (newProduto.itens || []).map(item => ({
      ...item,
      acquisition_date: item.acquisition_date ? new Date(item.acquisition_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    }));
    setTempItens(formattedItens);
    if (defaultMarcaFornecedor) {
      setNewProduto((p) => ({ ...p, marca_fornecedor: defaultMarcaFornecedor.fornecedor }));
    }
  }, [newProduto.itens, open, defaultMarcaFornecedor, setNewProduto]);

  React.useEffect(() => {
    // Pre-fill suggested codigo when opening modal for new product (not editing)
    if (open && !editingId) {
      if (nextNumeration && nextNumeration !== '') {
        setNewProduto((p) => ({ ...p, codigo_interno: nextNumeration }));
        return;
      }

      // If no nextNumeration provided, fall back to backend suggestion
      (async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await api.get('/produtos/codigo-interno/last', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          const suggested = String(res.data?.suggested ?? res.data?.last ?? '');
          if (suggested) setNewProduto((p) => ({ ...p, codigo_interno: suggested }));
        } catch (e) {
          console.error('Erro ao buscar sugestão de código no modal:', e);
        }
      })();
    }
  }, [open, defaultCodigo, editingId, setNewProduto, nextNumeration]);

  React.useEffect(() => {
    if (open) {
      searchMarcas('');
    }
  }, [open]);

  React.useEffect(() => {
    if (defaultMarcaFornecedor && marcaOptions.length > 0 && !selectedMarca) {
      const found = marcaOptions.find(m => m._id === defaultMarcaFornecedor._id);
      if (found) {
        setSelectedMarca(found);
      }
    }
  }, [marcaOptions, defaultMarcaFornecedor, selectedMarca]);

  const addItem = () => {
    setTempItens([...tempItens, { quantity: 1, acquisition_date: new Date().toISOString().split('T')[0], condicionais_fornecedor: condicionalFornecedorId ? [condicionalFornecedorId] : [], condicionais_cliente: [] }]);
  };

  const removeItem = (index: number) => {
    setTempItens(tempItens.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof Item, value: string | number) => {
    setTempItens(tempItens.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleAddProdutoLocal = () => {
    let finalItens = tempItens;
    if (finalItens.length === 0) {
      finalItens = [{ quantity: 1, acquisition_date: new Date().toISOString().split('T')[0], condicionais_fornecedor: condicionalFornecedorId ? [condicionalFornecedorId] : [], condicionais_cliente: [] }];
    }
    const produtoData = {
      codigo_interno: newProduto.codigo_interno,
      codigo_externo: newProduto.codigo_externo,
      descricao: newProduto.descricao,
      marca_fornecedor: newProduto.marca_fornecedor,
      sessao: newProduto.sessao,
      preco_custo: Math.round((newProduto.preco_custo || 0) * 100),
      preco_venda: Math.round((newProduto.preco_venda || 0) * 100),
      tags: newProduto.tags,
      itens: finalItens,
    };
    onAddProduto(produtoData);
    onClose();
    setNewProduto({ codigo_interno: '', codigo_externo: '', descricao: '', marca_fornecedor: '', sessao: '', preco_custo: 0, preco_venda: 0, tags: [], itens: [] });
  };

  const searchMarcas = async (q: string) => {
    setMarcaLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/marcas-fornecedores/', { headers: { Authorization: `Bearer ${token}` } });
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

  // chamada quando o campo abre
  const onOpenMarcas = () => searchMarcas('');


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
      const res = await api.get('/sessoes/', { headers: { Authorization: `Bearer ${token}` } });
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

  const onOpenSessoes = () => searchSessoes('');

  const handleSaveMarca = (marca: MarcaFornecedor) => {
    setNewProduto({ ...newProduto, marca_fornecedor: '' });
    setSelectedMarca(null);
    setMarcaInputValue('');
    setMarcaOptions(prev => [marca, ...prev.filter(m => m._id !== marca._id)]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth container={document.body} sx={{ '& .MuiDialog-paper': { height: '90vh' } }}>
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
              onChange={(e) => setNewProduto({ ...newProduto, codigo_interno: e.target.value })}
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

          {/* Marca / Fornecedor */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Autocomplete
              size="small"
              options={marcaOptions}
              getOptionLabel={(option) => marcaLabel(option as MarcaFornecedor | string | null)}
              isOptionEqualToValue={(option, value) => {
                if (!option || !value) return false;
                const optId = (option as MarcaFornecedor)._id;
                const valId = (value as MarcaFornecedor)._id;
                if (optId && valId) return optId === valId;
                return (option as MarcaFornecedor).nome === (value as MarcaFornecedor).nome; 
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
              onInputChange={(_e, v) => { setMarcaInputValue(v); if (v && v.length >= 2) searchMarcas(v); }}
              onOpen={onOpenMarcas}
              renderInput={(params) => (
                <TextField {...params} label="Marca / Fornecedor" size="small" InputProps={{ ...params.InputProps, endAdornment: (<>{marcaLoading ? <CircularProgress color="inherit" size={16} /> : null}{params.InputProps.endAdornment}</>) }} />
              )}
              sx={{ flex: 1 }}
            />
            <Tooltip title="Nova Marca">
              <IconButton size="small" onClick={() => setMarcaModalOpen(true)}>
                <Add />
              </IconButton>
            </Tooltip>
          </Box>


          {/* Sessão */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Autocomplete
              size="small"
              options={sessaoOptions}
              getOptionLabel={(opt) => opt.nome}
              value={sessaoOptions.find(s => s.nome === newProduto.sessao) || null}
              onChange={(_e, value) => setNewProduto({ ...newProduto, sessao: value ? value.nome : '' })}
              inputValue={sessaoInputValue}
              onInputChange={(_e, v) => { setSessaoInputValue(v); if (v && v.length >= 2) searchSessoes(v); }}
              onOpen={onOpenSessoes}
              renderInput={(params) => (
                <TextField {...params} label="Sessão" size="small" InputProps={{ ...params.InputProps, endAdornment: (<>{sessaoLoading ? <CircularProgress color="inherit" size={16} /> : null}{params.InputProps.endAdornment}</>) }} />
              )}
              sx={{ flex: 1 }}
            />
            <Tooltip title="Nova Sessão">
              <IconButton size="small" onClick={() => setSessaoModalOpen(true)}>
                <Add />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Tags */}
          <Autocomplete
            multiple
            freeSolo
            options={tagOptions}
            getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.descricao)}
            value={newProduto.tags || []}
            onChange={(_e, value) => {
              const newTags: Tag[] = [];
              for (const v of value) {
                if (typeof v === 'object' && v !== null) {
                  if ((v as any)._id === 'create') {
                    // Trigger create
                    const tagToCreate = modalTagInput.trim();
                    if (tagToCreate) {
                      setPendingTag(tagToCreate);
                      setConfirmTagModalOpen(true);
                    }
                    return; // Don't add to tags yet
                  } else {
                    newTags.push(v);
                  }
                }
              }
              setNewProduto({ ...newProduto, tags: newTags });
            }}
            inputValue={modalTagInput}
            onInputChange={async (_e, v) => {
              setModalTagInput(v);
              if (v.trim()) {
                await searchTags(v.trim());
                // After searching, add create option if no exact match
                const hasExactMatch = tagOptions.some(t => t.descricao.toLowerCase() === v.trim().toLowerCase());
                if (!hasExactMatch) {
                  setTagOptions(prev => [...prev, { _id: 'create', descricao: `+ Criar "${v.trim()}"` } as any]);
                }
              } else {
                setTagOptions([]);
              }
            }}
            onKeyDown={() => {
              // Removed Enter handling, now creation is via the "+ Criar" option
            }}
            renderOption={(props, option) => {
              if ((option as any)._id === 'create') {
                return (
                  <li {...props} style={{ justifyContent: 'center', fontWeight: 'bold' }}>
                    {option.descricao}
                  </li>
                );
              }
              return <li {...props}>{option.descricao}</li>;
            }}
            renderInput={(params) => (
              <TextField {...params} label="Tags" size="small" InputProps={{ ...params.InputProps, endAdornment: (<>{loadingTags ? <CircularProgress color="inherit" size={16} /> : null}{params.InputProps.endAdornment}</>) }} />
            )}
          />

          {/* Itens */}
          <Box>
            <Typography variant="subtitle1">Itens</Typography>
            {tempItens.map((it, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                <TextField size="small" type="number" label="Quantidade" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} sx={{ width: 140 }} />
                <TextField size="small" type="date" label="Data" value={it.acquisition_date} onChange={(e) => updateItem(idx, 'acquisition_date', e.target.value)} sx={{ width: 180 }} />
                <IconButton onClick={() => removeItem(idx)}>
                  <Delete />
                </IconButton>
              </Box>
            ))}
            <Tooltip title="Adicionar Item">
              <IconButton size="small" onClick={addItem} sx={{ mt: 1 }}>
                <Add />
              </IconButton>
            </Tooltip>
          </Box>

        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 1 }}>
        <Button
          size="small"
          onClick={handleAddProdutoLocal}
          variant="contained"
          sx={{  width: '100%' }}
        >
          {editingId ? 'Salvar' : 'Adicionar'}
        </Button>
        <Button size="small" onClick={onClose} sx={{ color: theme.palette.primary.main, width: '100%' }}>
          Cancelar
        </Button>
      </DialogActions>

      <MarcaFornecedorModal open={marcaModalOpen} onClose={() => setMarcaModalOpen(false)} onSave={handleSaveMarca} />
      <SessaoModal open={sessaoModalOpen} onClose={() => setSessaoModalOpen(false)} editingSessao={null} onSave={(s) => setSessaoOptions(prev => [s, ...prev])} />

      {/* Confirm Tag Creation Modal */}
      <Dialog open={confirmTagModalOpen} onClose={() => setConfirmTagModalOpen(false)} container={document.body}>
        <DialogTitle>Criar Nova Tag</DialogTitle>
        <DialogContent>
          <Typography>
            A tag "{pendingTag}" não existe. Deseja criá-la?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmTagModalOpen(false)}>Cancelar</Button>
          <Button onClick={async () => {
            if (pendingTag && typeof createTag === 'function') {
              try {
                const newTag = await createTag(pendingTag);
                if (newTag) {
                  setTagOptions(prev => [newTag, ...prev]);
                  setNewProduto(prev => ({ ...prev, tags: [...(prev.tags || []), newTag] }));
                }
                setConfirmTagModalOpen(false);
                setPendingTag('');
                setModalTagInput('');
              } catch (error) {
                console.error('Erro ao criar tag:', error);
                // Optionally show error message
              }
            }
          }} variant="contained">
            Criar
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default ProdutoModal;
