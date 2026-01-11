from fastapi import APIRouter, Depends, HTTPException
from ..models.marcas_fornecedores import MarcaFornecedor
from ..database.marcas_fornecedores_db import (
    create_marca_fornecedor, get_marcas_fornecedores, get_marca_fornecedor_by_id,
    update_marca_fornecedor, delete_marca_fornecedor
)
from ..routers.auth import get_current_user

router = APIRouter()

@router.post("/", dependencies=[Depends(get_current_user)])
async def create_marca_fornecedor_endpoint(marca: MarcaFornecedor):
    marca_id = await create_marca_fornecedor(marca)
    return {"id": marca_id}

@router.get("/", dependencies=[Depends(get_current_user)])
async def get_marcas_fornecedores_endpoint():
    return await get_marcas_fornecedores()

@router.get("/{marca_id}", dependencies=[Depends(get_current_user)])
async def get_marca_fornecedor(marca_id: str):
    marca = await get_marca_fornecedor_by_id(marca_id)
    if not marca:
        raise HTTPException(status_code=404, detail="Marca/Fornecedor not found")
    return marca

@router.put("/{marca_id}", dependencies=[Depends(get_current_user)])
async def update_marca_fornecedor_endpoint(marca_id: str, update_data: dict):
    marca = await update_marca_fornecedor(marca_id, update_data)
    if not marca:
        raise HTTPException(status_code=404, detail="Marca/Fornecedor not found")
    return marca

@router.delete("/{marca_id}", dependencies=[Depends(get_current_user)])
async def delete_marca_fornecedor_endpoint(marca_id: str):
    result = await delete_marca_fornecedor(marca_id)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Marca/Fornecedor not found")
    return {"message": "Marca/Fornecedor deleted"}