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
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Undo as UndoIcon } from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
  
  const [devolverModalOpen, setDevolverModalOpen] = useState(false);
  const [selectedCondicional, setSelectedCondicional] = useState<CondicionalFornecedor | null>(null);
  const [devolverForm, setDevolverForm] = useState({
    produto_id: '',
    quantidade: 1,
  });

  const fetchCondicionais = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/condicionais-fornecedor/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCondicionais(response.data);
      
      // Fetch status for each condicional
      const statusPromises = response.data.map((c: CondicionalFornecedor) =>
        axios.get(`${API_URL}/condicionais-fornecedor/${c._id}/status-devolucao`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );
      
      const statusResponses = await Promise.all(statusPromises);
      const newStatusMap = new Map();
      statusResponses.forEach(res => {
        newStatusMap.set(res.data.condicional_id, res.data);
      });
      setStatusMap(newStatusMap);
      
      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar condicionais de fornecedor');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCondicionais();
  }, []);

  const handleOpenDevolverModal = (condicional: CondicionalFornecedor) => {
    setSelectedCondicional(condicional);
    setDevolverForm({
      produto_id: condicional.produtos_id[0] || '',
      quantidade: 1,
    });
    setDevolverModalOpen(true);
  };

  const handleDevolver = async () => {
    if (!selectedCondicional) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/condicionais-fornecedor/${selectedCondicional._id}/devolver-itens`,
        devolverForm,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setDevolverModalOpen(false);
      fetchCondicionais();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao devolver itens');
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Condicionais de Fornecedor
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Gerenciar produtos recebidos em condicional de fornecedores. O sistema controla o limite de devolução de cada condicional.
          </Typography>
        </CardContent>
      </Card>

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
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<UndoIcon />}
                        onClick={() => handleOpenDevolverModal(condicional)}
                        disabled={!status || status.quantidade_pode_devolver === 0}
                      >
                        Devolver
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Devolver Modal */}
      <Dialog open={devolverModalOpen} onClose={() => setDevolverModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Devolver Itens ao Fornecedor</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {selectedCondicional && statusMap.get(selectedCondicional._id) && (
              <Alert severity="info">
                Pode devolver ainda: {statusMap.get(selectedCondicional._id)?.quantidade_pode_devolver} item(s)
              </Alert>
            )}
            
            <TextField
              label="Produto ID"
              value={devolverForm.produto_id}
              onChange={(e) => setDevolverForm({ ...devolverForm, produto_id: e.target.value })}
              required
            />

            <TextField
              label="Quantidade"
              type="number"
              value={devolverForm.quantidade}
              onChange={(e) => setDevolverForm({ ...devolverForm, quantidade: parseInt(e.target.value) })}
              required
              inputProps={{ min: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDevolverModalOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleDevolver}
            variant="contained"
            disabled={!devolverForm.produto_id || devolverForm.quantidade < 1}
          >
            Devolver
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CondicionaisFornecedor;
