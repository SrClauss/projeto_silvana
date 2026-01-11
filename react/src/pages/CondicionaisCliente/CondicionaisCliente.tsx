import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { CheckCircle as CheckCircleIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ProdutoQuantity {
  produto_id: string;
  quantidade: number;
}

interface CondicionalCliente {
  _id: string;
  cliente_id: string;
  produtos: ProdutoQuantity[];
  data_condicional: string;
  data_devolucao?: string;
  ativa: boolean;
  observacoes?: string;
}

function CondicionaisCliente() {
  const [condicionais, setCondicionais] = useState<CondicionalCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [processarModalOpen, setProcessarModalOpen] = useState(false);
  const [selectedCondicional, setSelectedCondicional] = useState<CondicionalCliente | null>(null);
  const [codigosDevolvidos, setCodigosDevolvidos] = useState<string[]>([]);
  const [novoCodigoInput, setNovoCodigoInput] = useState('');

  const fetchCondicionais = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/condicionais-cliente/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCondicionais(response.data);
      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar condicionais de cliente');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCondicionais();
  }, []);

  const handleOpenProcessarModal = (condicional: CondicionalCliente) => {
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

  const handleProcessarRetorno = async () => {
    if (!selectedCondicional) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/condicionais-cliente/${selectedCondicional._id}/processar-retorno`,
        { produtos_devolvidos_codigos: codigosDevolvidos },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setProcessarModalOpen(false);
      fetchCondicionais();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao processar retorno');
    }
  };

  const getTotalProdutos = (produtos: ProdutoQuantity[]) => {
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Condicionais de Cliente
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Gerenciar produtos enviados em condicional para clientes. 
            Ao processar o retorno, informe os códigos internos dos produtos devolvidos. 
            Os produtos não devolvidos serão automaticamente registrados como vendas.
          </Typography>
        </CardContent>
      </Card>

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
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleOpenProcessarModal(condicional)}
                      disabled={!condicional.ativa}
                    >
                      Processar Retorno
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

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

            {selectedCondicional && (
              <Alert severity="warning">
                Produtos que serão vendidos: {getTotalProdutos(selectedCondicional.produtos) - codigosDevolvidos.length}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProcessarModalOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleProcessarRetorno}
            variant="contained"
            color="success"
          >
            Confirmar e Processar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CondicionaisCliente;
