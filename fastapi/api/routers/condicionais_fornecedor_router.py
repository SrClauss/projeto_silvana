from fastapi import APIRouter, Depends, HTTPException
from ..models.condicional_fornecedor import CondicionalFornecedor
from ..database.condicional_fornecedor_db import (
    create_condicional_fornecedor, get_condicional_fornecedores, get_condicional_fornecedor_by_id,
    update_condicional_fornecedor, delete_condicional_fornecedor
)
from ..routers.auth import get_current_user

router = APIRouter()

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