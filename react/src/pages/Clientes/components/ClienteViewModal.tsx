import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { Cliente } from '../../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  cliente: Cliente | null;
}

const ClienteViewModal: React.FC<Props> = ({ open, onClose, cliente }) => {
  const theme = useTheme();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.secondary.main }}>
        Detalhes do Cliente
      </DialogTitle>
      <DialogContent sx={{ p: 2, overflow: 'auto' }}>
        {!cliente ? (
          <Typography>Nenhum cliente selecionado.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary }}>Nome</Typography>
              <Typography variant="body1">{cliente.nome}</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary }}>Telefone</Typography>
              <Typography variant="body1">{cliente.telefone}</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary }}>CPF</Typography>
              <Typography variant="body1">{cliente.cpf}</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary }}>Endereço</Typography>
              <Typography variant="body1">
                {cliente.endereco.logradouro}, {cliente.endereco.numero}{cliente.endereco.complemento ? ` - ${cliente.endereco.complemento}` : ''}
                <br />
                {cliente.endereco.bairro} — {cliente.endereco.cidade}/{cliente.endereco.estado}
                <br />CEP: {cliente.endereco.cep}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary }}>Criado em</Typography>
              <Typography variant="body1">{cliente.created_at ? new Date(cliente.created_at).toLocaleString() : '-'}</Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: theme.palette.primary.main }}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClienteViewModal;
