import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    MenuItem,
    FormControl,
    Select,
    InputLabel,
    TablePagination,
    Alert,
    useTheme,
    useMediaQuery,
    IconButton,
} from '@mui/material';
import { AxiosError } from 'axios';

import api from '../../lib/axios';
import { useParams } from 'react-router-dom';
import type { Saida } from '../../types';
import { Delete } from '@mui/icons-material';
import Title from '../../components/Title';

function VendasCliente() {
    const today = new Date();
    const isoDate = (d: Date) => d.toISOString().split('T')[0];
    const { cliente_id } = useParams<{ cliente_id: string }>();

    const [vendas, setVendas] = useState<Array<Saida & { produto_descricao?: string; produto_codigo_interno?: string; preco_venda?: number; cliente_nome?: string; cliente_telefone?: string; cliente_cpf?: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Filters
    const [dateFrom, setDateFrom] = useState<string>(isoDate(today));
    const [dateTo, setDateTo] = useState<string>(isoDate(today));
    const [sortBy, setSortBy] = useState<'data' | 'valor'>('data');
    const [order, setOrder] = useState<'desc' | 'asc'>('desc');

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const fetchVendas = useCallback(async () => {
        if (!cliente_id) return;
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string | number | undefined> = {
                page: page + 1,
                per_page: rowsPerPage,
                date_from: dateFrom,
                date_to: dateTo,
                sort_by: sortBy,
                order: order,
            };

            const res = await api.get(`/vendas/cliente/${cliente_id}`, { params });
            console.debug('fetchVendas response', res.status, res.data);
            const data = res.data ?? { items: [], total: 0 };
            if (!data || typeof data !== 'object') {
                console.warn('Vendas: resposta inesperada do servidor', res);
                setVendas([]);
                setTotal(0);
            } else {
                setVendas(data.items ?? []);
                setTotal(data.total ?? 0);
            }
        } catch (err: unknown) {
            console.error('Erro ao buscar vendas:', err);
            const errorMessage = err instanceof AxiosError ? err.response?.data?.detail : 'Erro ao carregar vendas';
            setError(errorMessage);
            setVendas([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [cliente_id, page, rowsPerPage, dateFrom, dateTo, sortBy, order]);

    useEffect(() => {
        if (cliente_id) {
            fetchVendas();
        }
    }, [page, rowsPerPage, dateFrom, dateTo, sortBy, order, cliente_id, fetchVendas]);


    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleDelete = async (vendaId: string) => {
        if (!window.confirm('Confirma exclusão desta venda?')) return;
        try {
            await api.delete(`/vendas/${vendaId}`);
            fetchVendas(); // Refresh list
        } catch (err: unknown) {
            const errorMessage = err instanceof AxiosError ? err.response?.data?.detail : 'Erro ao deletar venda';
            setError(errorMessage);
        }
    };

    const formatCurrency = (cents: number) => {
        const reais = cents / 100;
        return reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    };

    if (!cliente_id) {
        return <Alert severity="error">Cliente não especificado</Alert>;
    }

    return (
        <Box sx={{ width: '100%' }}>
            <Title text="Histórico de Vendas do Cliente" />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper sx={{ p: { xs: 2, md: 3 }, mb: { xs: 2, md: 3 }, borderRadius: 2, maxWidth: '100%' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}>
                        <Typography variant="h6">Filtros</Typography>
                    </Box>

                    <Box sx={{ width: '100%', gap: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
                        <TextField
                            label="Data Início"
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            label="Data Fim"
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: 1 }}
                        />
                        <FormControl sx={{ minWidth: 120 }}>
                            <InputLabel>Ordenar por</InputLabel>
                            <Select value={sortBy} label="Ordenar por" onChange={(e) => setSortBy(e.target.value as 'data' | 'valor')}>
                                <MenuItem value="data">Data</MenuItem>
                                <MenuItem value="valor">Valor</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl sx={{ minWidth: 120 }}>
                            <InputLabel>Ordem</InputLabel>
                            <Select value={order} label="Ordem" onChange={(e) => setOrder(e.target.value as 'desc' | 'asc')}>
                                <MenuItem value="desc">Decrescente</MenuItem>
                                <MenuItem value="asc">Crescente</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Box>
            </Paper>

            <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2, borderRadius: 2, maxWidth: '100%' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
                        <Typography>Carregando vendas...</Typography>
                    </Box>
                ) : vendas.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
                        <Typography>Nenhuma venda encontrada</Typography>
                    </Box>
                ) : (
                    <>
                        <TableContainer sx={{ width: '100%' }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Data</TableCell>
                                        <TableCell>Produto</TableCell>
                                        <TableCell>Quantidade</TableCell>
                                        <TableCell>Valor Total</TableCell>
                                        {!isMobile && <TableCell>Observações</TableCell>}
                                        <TableCell>Ações</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {vendas.map((v) => (
                                        <TableRow key={v._id}>
                                            <TableCell>{formatDate(v.data_saida)}</TableCell>
                                            <TableCell>
                                                <div><strong>{v.produto_descricao ?? v.produtos_id}</strong></div>
                                                <div style={{ fontSize: '0.8em', color: 'gray' }}>{v.produto_codigo_interno}</div>
                                            </TableCell>
                                            <TableCell>{v.quantidade}</TableCell>
                                            <TableCell>{formatCurrency(v.valor_total ?? 0)}</TableCell>
                                            {!isMobile && <TableCell>{v.observacoes || '-'}</TableCell>}
                                            <TableCell>
                                                <IconButton size="small" onClick={() => handleDelete(v._id)} sx={{ color: theme.palette.error?.main || 'red' }}>
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25]}
                            component="div"
                            count={total}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                        />
                    </>
                )}
            </Paper>
        </Box>
    );
}

export default VendasCliente;