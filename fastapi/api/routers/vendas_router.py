from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..database.vendas_db import (
    processar_venda_produto,
    get_estoque_disponivel_por_produto
)
from ..routers.auth import get_current_user

router = APIRouter()

class VendaRequest(BaseModel):
    produto_id: str
    quantidade: int
    cliente_id: Optional[str] = None
    valor_total: Optional[int] = None
    observacoes: Optional[str] = None

@router.post("/", dependencies=[Depends(get_current_user)])
async def criar_venda(venda: VendaRequest):
    """
    Cria uma venda seguindo lógica FIFO (First In, First Out).
    Remove itens mais antigos primeiro baseado em acquisition_date.
    """
    result = await processar_venda_produto(
        produto_id=venda.produto_id,
        quantidade=venda.quantidade,
        cliente_id=venda.cliente_id,
        valor_total=venda.valor_total,
        observacoes=venda.observacoes
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@router.get("/estoque/{produto_id}", dependencies=[Depends(get_current_user)])
async def get_estoque_disponivel(produto_id: str):
    """
    Retorna o estoque disponível de um produto (excluindo itens em condicional).
    """
    estoque = await get_estoque_disponivel_por_produto(produto_id)
    return {"produto_id": produto_id, "estoque_disponivel": estoque}
