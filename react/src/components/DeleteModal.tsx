import { Modal, Box, Typography, Button } from "@mui/material";




export default function DeleteModal({ open, onClose, onConfirm, title, message, entityId }: { open: boolean; onClose: () => void; onConfirm: (entityId?: string) => void; title: string; message: string, entityId?: string }) { 
    return (

        <Modal open={open} onClose={onClose} >
            <Box sx={{ position: 'absolute' , top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4, }}>
                <Typography variant="h6" component="h2" gutterBottom>
                    {title}
                </Typography>
                <Typography sx={{ mb: 2 }}>
                    {message}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                   <Button variant="outlined" onClick={onClose}>Cancelar</Button>
                   <Button variant="contained" color="error" onClick={() => onConfirm(entityId)}>Deletar</Button>
                </Box>
            </Box>
        </Modal>
    );  



}