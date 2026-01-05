from fastapi import APIRouter, Depends, HTTPException
from ..models.desejo_cliente import DesejoCliente
from ..database.desejo_cliente_db import (
    create_desejo_cliente, get_desejos_clientes, get_desejo_cliente_by_id,
    update_desejo_cliente, delete_desejo_cliente
)
from ..routers.auth import get_current_user

router = APIRouter()

@router.post("/", dependencies=[Depends(get_current_user)])
async def create_desejo_cliente_endpoint(desejo: DesejoCliente):
    desejo_id = await create_desejo_cliente(desejo)
    return {"id": desejo_id}

@router.get("/", dependencies=[Depends(get_current_user)])
async def get_desejos_clientes_endpoint():
    return await get_desejos_clientes()

@router.get("/{desejo_id}", dependencies=[Depends(get_current_user)])
async def get_desejo_cliente(desejo_id: str):
    desejo = await get_desejo_cliente_by_id(desejo_id)
    if not desejo:
        raise HTTPException(status_code=404, detail="Desejo Cliente not found")
    return desejo

@router.put("/{desejo_id}", dependencies=[Depends(get_current_user)])
async def update_desejo_cliente_endpoint(desejo_id: str, update_data: dict):
    desejo = await update_desejo_cliente(desejo_id, update_data)
    if not desejo:
        raise HTTPException(status_code=404, detail="Desejo Cliente not found")
    return desejo

@router.delete("/{desejo_id}", dependencies=[Depends(get_current_user)])
async def delete_desejo_cliente_endpoint(desejo_id: str):
    result = await delete_desejo_cliente(desejo_id)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Desejo Cliente not found")
    return {"message": "Desejo Cliente deleted"}