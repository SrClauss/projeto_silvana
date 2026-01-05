from fastapi import APIRouter, Depends, HTTPException
from ..models.faturamento_item import FaturamentoItem
from ..database.faturamento_item_db import (
    create_faturamento_item, get_faturamento_itens, get_faturamento_item_by_id,
    update_faturamento_item, delete_faturamento_item
)
from ..routers.auth import get_current_user

router = APIRouter()

@router.post("/", dependencies=[Depends(get_current_user)])
async def create_faturamento_item_endpoint(faturamento: FaturamentoItem):
    faturamento_id = await create_faturamento_item(faturamento)
    return {"id": faturamento_id}

@router.get("/", dependencies=[Depends(get_current_user)])
async def get_faturamento_itens_endpoint():
    return await get_faturamento_itens()

@router.get("/{faturamento_id}", dependencies=[Depends(get_current_user)])
async def get_faturamento_item(faturamento_id: str):
    faturamento = await get_faturamento_item_by_id(faturamento_id)
    if not faturamento:
        raise HTTPException(status_code=404, detail="Faturamento Item not found")
    return faturamento

@router.put("/{faturamento_id}", dependencies=[Depends(get_current_user)])
async def update_faturamento_item_endpoint(faturamento_id: str, update_data: dict):
    faturamento = await update_faturamento_item(faturamento_id, update_data)
    if not faturamento:
        raise HTTPException(status_code=404, detail="Faturamento Item not found")
    return faturamento

@router.delete("/{faturamento_id}", dependencies=[Depends(get_current_user)])
async def delete_faturamento_item_endpoint(faturamento_id: str):
    result = await delete_faturamento_item(faturamento_id)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Faturamento Item not found")
    return {"message": "Faturamento Item deleted"}