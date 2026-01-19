from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..models.condicional_fornecedor import CondicionalFornecedor
from ..database.condicional_fornecedor_db import (
    create_condicional_fornecedor, get_condicional_fornecedores, get_condicional_fornecedor_by_id,
    update_condicional_fornecedor, delete_condicional_fornecedor, create_condicional_with_produtos,
    adicionar_produto_condicional_fornecedor, devolver_itens_condicional_fornecedor,
    get_status_devolucao_condicional_fornecedor, listar_produtos_em_condicional_fornecedor,
    get_condicional_fornecedor_completa, processar_condicional_fornecedor
)
from ..routers.auth import get_current_user
import logging
import traceback

router = APIRouter()

class AdicionarProdutoRequest(BaseModel):
    produto_id: str
    quantidade: int

class DevolverItensRequest(BaseModel):
    produto_id: str
    quantidade: int

class ProcessarRetornoFornecedorRequest(BaseModel):
    produtos_devolvidos_ids: list[str]

class CondicionalBatchRequest(BaseModel):
    condicional: dict
    produtos: list

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

@router.post("/batch-create", dependencies=[Depends(get_current_user)])
async def create_condicional_with_products_endpoint(request: CondicionalBatchRequest):
    """
    Cria uma condicional e insere múltiplos produtos associados em uma única chamada.

    Payload exemplo:
    {
      "condicional": { "fornecedor_id": "...", "quantidade_max_devolucao": 10, "prazo_devolucao": 30, "observacoes": "..." },
      "produtos": [ { "codigo_interno": "...", "descricao": "...", "itens": [ { "quantity": 2 } ] }, ... ]
    }
    """
    try:
        result = await create_condicional_with_produtos(request.condicional, request.produtos)
        return result
    except Exception as e:
        # Log full traceback for debugging purposes
        logging.exception('Error in batch-create condicional with products')
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{condicional_id}/status-devolucao", dependencies=[Depends(get_current_user)])
async def get_status_devolucao_endpoint(condicional_id: str, produto_id: str = None):
    """
    Retorna o status de devolução mostrando quantos itens ainda podem ser devolvidos.
    """
    result = await get_status_devolucao_condicional_fornecedor(condicional_id, produto_id)
    
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result

@router.get("/{condicional_id}/produtos", dependencies=[Depends(get_current_user)])
async def listar_produtos_endpoint(condicional_id: str):
    """
    Lista os produtos associados a uma condicional de fornecedor.
    """
    try:
        result = await listar_produtos_em_condicional_fornecedor(condicional_id)
        return result
    except Exception as e:
        logging.exception('Error listing products in condicional fornecedor')
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
  

@router.post("/{condicional_id}/processar-retorno", dependencies=[Depends(get_current_user)])
async def processar_retorno_fornecedor_endpoint(condicional_id: str, request: ProcessarRetornoFornecedorRequest):
    """
    Processa o retorno/finalização de uma condicional de fornecedor.
    Recebe lista de IDs de produtos devolvidos (pode ser vazia).
    """
    result = await processar_condicional_fornecedor(condicional_id, request.produtos_devolvidos_ids)

    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])

    return result
@router.get("/produto-vendido/{produto_id}", dependencies=[Depends(get_current_user)])
async def produto_vendido_fornecedor(produto_id: str):
    """Retorna as saídas (vendas/devoluções) registradas para um produto (usado pela UI para mostrar vendas)."""
    from ..database.vendas_db import produto_foi_vendido
    saidas = await produto_foi_vendido(produto_id)
    return saidas or []
