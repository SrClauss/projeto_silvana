import React from 'react';
import {
  Box,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface TagsModalProps {
  open: boolean;
  onClose: () => void;
  editingId: string | null;
  newTag: string;
  setNewTag: React.Dispatch<React.SetStateAction<string>>;
  creating: boolean;
  handleCreate: () => Promise<void>;
}

const TagsModal: React.FC<TagsModalProps> = ({
  open,
  onClose,
  editingId,
  newTag,
  setNewTag,
  creating,
  handleCreate,
}) => {
  const theme = useTheme();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.secondary.main }}>
        {editingId ? 'Editar Tag' : 'Adicionar Tag'}
      </DialogTitle>
      <DialogContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Descrição"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            fullWidth
            autoFocus
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 1 }}>
        <Button
          size="small"
          onClick={handleCreate}
          variant="contained"
          sx={{ bgcolor: theme.palette.secondary.main, color: theme.palette.primary.main, width: '100%' }}
          disabled={creating}
        >
          {creating ? 'Salvando...' : (editingId ? 'Salvar' : 'Adicionar')}
        </Button>
        <Button size="small" onClick={onClose} sx={{ color: theme.palette.primary.main, width: '100%' }}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TagsModal;