import type React from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Typography, Box } from "@mui/material";
import type { Produto } from "../../types";
import { useCallback } from "react";
import axios from "../../lib/axios"

const DevolucaoCondicionalFornecedor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const condicionalId = searchParams.get("id");
  const [produtos, setProdutos] = useState<Produto[]>([]);



  const handleChargeProducts = useCallback(() => {
    if (!condicionalId) return;

    axios.get<Produto[]>(`/condicionais-fornecedor/${condicionalId}/produtos`)
      .then((response) => {
        setProdutos(response.data);
        console.log("Produtos carregados:", response.data);
      })
      .catch((error) => {
        console.error("Erro ao carregar produtos:", error);
      });

  }, [condicionalId]);
 


  useEffect(() => {
    handleChargeProducts();
  }, [handleChargeProducts]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Devolução Condicional Fornecedor
      </Typography>
      {produtos.length === 0 ? (
        <Typography variant="body1">Nenhum produto encontrado para devolução.</Typography>
      ) : (
        produtos.map((produto) => (
          <Box key={produto._id} sx={{ mb: 2, p: 2, border: '1px solid #ccc', borderRadius: '4px' }}>
            <Typography variant="h6">{produto.descricao}</Typography>
            <Typography variant="body2">Quantidade: {produto.itens.reduce((acc, item) => acc + item.quantity, 0)}</Typography>
            <Typography variant="body2">Preço: R$ {produto.preco_custo.toFixed(2)}</Typography>
            

          </Box>
        ))
      )}


    </Box>
  );
};



export default DevolucaoCondicionalFornecedor;