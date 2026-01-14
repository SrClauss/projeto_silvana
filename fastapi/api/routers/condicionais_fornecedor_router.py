from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..models.condicional_fornecedor import CondicionalFornecedor
from ..database.condicional_fornecedor_db import (
    create_condicional_fornecedor, get_condicional_fornecedores, get_condicional_fornecedor_by_id,
    update_condicional_fornecedor, delete_condicional_fornecedor,
    adicionar_produto_condicional_fornecedor, devolver_itens_condicional_fornecedor,
    get_status_devolucao_condicional_fornecedor
)
from ..routers.auth import get_current_user

router = APIRouter()

class AdicionarProdutoRequest(BaseModel):
    produto_id: str
    quantidade: int

class DevolverItensRequest(BaseModel):
    produto_id: str
    quantidade: int

@router.post("/", dependencies=[Depends(get_current_user)])
async def create_condicional_fornecedor_endpoint(condicional: CondicionalFornecedor):
    condicional_id = await create_condicional_fornecedor(condicional)
    return {"id": condicional_id}

@router.get("/", dependencies=[Depends(get_current_user)])
async def get_condicional_fornecedores_endpoint():
    return await get_condicional_fornecedores()

@router.get("/{condicional_id}", dependencies=[Depends(get_current_user)])
async def get_condicional_fornecedor(condicional_id: str):
    condicional = await get_condicional_fornecedor_by_id(condicional_id)
    if not condicional:
        raise HTTPException(status_code=404, detail="Condicional Fornecedor not found")
    return condicional

@router.get("/{condicional_id}/completa", dependencies=[Depends(get_current_user)])
async def get_condicional_fornecedor_completa_endpoint(condicional_id: str):
    """
    Retorna a condicional fornecedor com os dados completos dos produtos e fornecedor.
    """
    result = await get_condicional_fornecedor_completa(condicional_id)
    if not result:
        raise HTTPException(status_code=404, detail="Condicional Fornecedor not found")
    return result[0]

@router.put("/{condicional_id}", dependencies=[Depends(get_current_user)])
async def update_condicional_fornecedor_endpoint(condicional_id: str, update_data: dict):
    condicional = await update_condicional_fornecedor(condicional_id, update_data)
    if not condicional:
        raise HTTPException(status_code=404, detail="Condicional Fornecedor not found")
    return condicional

@router.delete("/{condicional_id}", dependencies=[Depends(get_current_user)])
async def delete_condicional_fornecedor_endpoint(condicional_id: str):
    result = await delete_condicional_fornecedor(condicional_id)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Condicional Fornecedor not found")
    return {"message": "Condicional Fornecedor deleted"}

@router.post("/{condicional_id}/adicionar-produto", dependencies=[Depends(get_current_user)])
async def adicionar_produto_endpoint(condicional_id: str, request: AdicionarProdutoRequest):
    """
    Adiciona um produto ao condicional de fornecedor.
    Cria itens no produto marcados com condicional_fornecedor_id.
    """
    result = await adicionar_produto_condicional_fornecedor(
        condicional_id, request.produto_id, request.quantidade
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@router.post("/{condicional_id}/devolver-itens", dependencies=[Depends(get_current_user)])
async def devolver_itens_endpoint(condicional_id: str, request: DevolverItensRequest):
    """
    Devolve itens de um condicional de fornecedor.
    Remove os itens e cria uma saída de devolução.
    """
    result = await devolver_itens_condicional_fornecedor(
        condicional_id, request.produto_id, request.quantidade
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@router.get("/{condicional_id}/status-devolucao", dependencies=[Depends(get_current_user)])
async def get_status_devolucao_endpoint(condicional_id: str, produto_id: str = None):
    """
    Retorna o status de devolução mostrando quantos itens ainda podem ser devolvidos.
    """
    result = await get_status_devolucao_condicional_fornecedor(condicional_id, produto_id)
    
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result