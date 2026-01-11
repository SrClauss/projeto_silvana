import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import axios from 'axios';
import VendaModal from './components/VendaModal';
import { Produto } from '../../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Vendas() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProdutos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/produtos/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setProdutos(response.data);
      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar produtos');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  const getEstoqueDisponivel = (produto: Produto) => {
    return produto.itens
      .filter(item => !item.condicional_fornecedor_id && !item.condicional_cliente_id)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const filteredProdutos = produtos.filter(
    (produto) =>
      produto.codigo_interno.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (produto: Produto) => {
    setSelectedProduto(produto);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedProduto(null);
  };

  const handleSuccess = () => {
    fetchProdutos();
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
          Sistema de Vendas
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Criar Nova Venda
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            O sistema utiliza lógica FIFO (First In, First Out) - os itens mais antigos são vendidos primeiro.
          </Typography>
          <TextField
            fullWidth
            label="Buscar produto"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="Digite o código interno ou descrição"
          />
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Código Interno</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Estoque Disponível</TableCell>
              <TableCell>Em Condicional</TableCell>
              <TableCell>Preço Venda</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProdutos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredProdutos.map((produto) => {
                const estoqueDisponivel = getEstoqueDisponivel(produto);
                return (
                  <TableRow key={produto._id}>
                    <TableCell>{produto.codigo_interno}</TableCell>
                    <TableCell>{produto.descricao}</TableCell>
                    <TableCell>
                      <Chip 
                        label={estoqueDisponivel} 
                        color={estoqueDisponivel > 0 ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {produto.em_condicional > 0 && (
                        <Chip 
                          label={produto.em_condicional} 
                          color="warning"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      R$ {(produto.preco_venda / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenModal(produto)}
                        disabled={estoqueDisponivel === 0}
                      >
                        Vender
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedProduto && (
        <VendaModal
          open={modalOpen}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
          produtoId={selectedProduto._id}
          produtoDescricao={selectedProduto.descricao}
        />
      )}
    </Box>
  );
}

export default Vendas;
