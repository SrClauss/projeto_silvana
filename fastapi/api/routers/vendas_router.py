from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..database.vendas_db import (
    processar_venda_produto,
    get_estoque_disponivel_por_produto
)
from ..database.saidas_db import get_saidas_filtered
from ..database.clientes_db import get_cliente_by_id
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
    # If a cliente_id is provided, ensure it exists
    if venda.cliente_id:
        cliente = await get_cliente_by_id(venda.cliente_id)
        if not cliente:
            raise HTTPException(status_code=400, detail="cliente_id not found")

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

@router.post("/batch", dependencies=[Depends(get_current_user)])
async def criar_vendas_batch(vendas: list[VendaRequest]):
    """
    Cria múltiplas vendas em batch. Retorna lista de resultados por venda.
    Não é transacional: cada venda é processada individualmente e resultado agregado.
    """
    results = []
    for v in vendas:
        # validate cliente
        if v.cliente_id:
            cliente = await get_cliente_by_id(v.cliente_id)
            if not cliente:
                results.append({"error": "cliente_id not found", "venda": v.dict()})
                continue
        res = await processar_venda_produto(
            produto_id=v.produto_id,
            quantidade=v.quantidade,
            cliente_id=v.cliente_id,
            valor_total=v.valor_total,
            observacoes=v.observacoes
        )
        results.append(res)
    return {"results": results}

@router.get("/estoque/{produto_id}", dependencies=[Depends(get_current_user)])
async def get_estoque_disponivel(produto_id: str):
    """
    Retorna o estoque disponível de um produto (excluindo itens em condicional).
    """
    estoque = await get_estoque_disponivel_por_produto(produto_id)
    return {"produto_id": produto_id, "estoque_disponivel": estoque}

@router.get("/", dependencies=[Depends(get_current_user)])
async def listar_vendas(page: int = 1, per_page: int = 20, date_from: str | None = None, date_to: str | None = None,
                        produto_id: str | None = None, produto_query: str | None = None, tag_ids: str | None = None, sort_by: str = 'data', order: str = 'desc'):
    """
    Lista vendas (saidas tipo 'venda') com filtros, paginação e ordenação.

    Por padrão retorna as vendas de hoje quando nenhum filtro de data for fornecido.
    tag_ids (opcional): lista de ids separadas por vírgula para filtrar produtos que possuam qualquer uma das tags.
    """
    # Se não foi fornecido filtro de data, usar hoje como padrão
    from datetime import datetime
    if not date_from and not date_to:
        today = datetime.utcnow().date().isoformat()
        date_from = today
        date_to = today

    try:
        tag_list = [t for t in (tag_ids or '').split(',') if t]
        tag_list = tag_list if tag_list else None
        result = await get_saidas_filtered(page=page, per_page=per_page, date_from=date_from, date_to=date_to,
                                       produto_id=produto_id, produto_query=produto_query, tag_ids=tag_list, sort_by=sort_by, order=order)
        # debug logs
        print(f"listar_vendas called: page={page}, per_page={per_page}, date_from={date_from}, date_to={date_to}, produto_id={produto_id}, produto_query={produto_query}, tag_list={tag_list}")
        print("listar_vendas result:", result)
        return result
    except Exception as e:
        # Log for debugging in server logs
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
