import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, TextField, CircularProgress, IconButton } from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import axios from 'axios';
import type { Tag } from '../../types';

const TagsPage: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/produtos/tags/', { headers: { Authorization: `Bearer ${token}` } });
      setTags(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTags(); }, []);

  const handleCreate = async () => {
    if (!newTag.trim()) return;
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/produtos/tags/', { descricao: newTag.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      setTags((t) => [...t, res.data]);
      setNewTag('');
    } catch (e) {
      console.error(e);
    } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirma exclusão da tag?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/produtos/tags/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setTags((t) => t.filter(x => x._id !== id));
    } catch (e) { console.error(e); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
      <Typography variant="h4" sx={{ mb: 2, color: '#3D2B1F', fontFamily: 'serif', fontWeight: 700 }}>Tags</Typography>
      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2, borderRadius: 2, maxWidth: '100%' }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField size="small" value={newTag} onChange={(e) => setNewTag(e.target.value)} label="Nova tag" fullWidth />
          <Button variant="contained" startIcon={<Add />} onClick={handleCreate} disabled={creating}>
            {creating ? 'Criando...' : 'Criar'}
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, maxWidth: '100%' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {tags.map(t => (
              <Box key={t._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography>{t.descricao}</Typography>
                <IconButton size="small" onClick={() => handleDelete(t._id)}><Delete /></IconButton>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default TagsPage;
