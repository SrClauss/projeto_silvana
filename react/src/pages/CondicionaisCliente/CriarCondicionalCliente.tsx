import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Paper, Typography, List, ListItem, ListItemText, Divider, Alert, Autocomplete, Chip, ToggleButtonGroup, ToggleButton, Fab, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip } from '@mui/material';
import { PersonAdd as PersonAddIcon, Add as AddIcon } from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import type { AutocompleteRenderInputParams } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/axios';
import type { Produto, Cliente, Item, Tag } from '../../types';
import ClienteModal from '../Clientes/components/ClienteModal';
import ShadowIconButton from '../../components/ShadowIconButton';  
import Title from '../../components/Title';
import ModalBuscaCliente from './components/ModalBuscaCliente';

type ItemCondicional = {
  id: string;
  produto: Produto | null;
  quantidade: number;
  valorTotal: number;
  observacao: string;
  expanded: boolean;
  query: string;
};

const CriarCondicionalCliente: React.FC = () => {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [openClienteModal, setOpenClienteModal] = useState(false);
  return (
    <Box>


      <Title text="Condicional para Cliente" subtitle='Criar'/>
      <ModalBuscaCliente open={openClienteModal} onClose={() => setOpenClienteModal(false)} onClientSelect={(cliente) => { setCliente([cliente]); setOpenClienteModal(false); }} />

        <Typography variant="h6" gutterBottom>
          {cliente}
        </Typography>

    </Box>
  )
}

export default CriarCondicionalCliente;