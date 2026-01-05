from fastapi import APIRouter, Depends, HTTPException
from ..models.desejo_cliente import DesejoCliente
from ..database.desejo_cliente_db import (
    create_desejo_cliente, get_desejos_clientes, get_desejo_cliente_by_id,
    update_desejo_cliente, delete_desejo_cliente, get_desejos_by_cliente
)
from ..routers.auth import require_role
from ..models.users import Role

router = APIRouter(dependencies=[Depends(require_role(Role.VENDEDOR))])

@router.post("/")
async def create_desejo(desejo: DesejoCliente):
    desejo_id = await create_desejo_cliente(desejo)
    return {"id": desejo_id}

@router.get("/")
async def get_desejos():
    return await get_desejos_clientes()

@router.get("/{desejo_id}")
async def get_desejo(desejo_id: str):
    desejo = await get_desejo_cliente_by_id(desejo_id)
    if not desejo:
        raise HTTPException(status_code=404, detail="Desejo not found")
    return desejo

@router.put("/{desejo_id}")
async def update_desejo(desejo_id: str, update_data: dict):
    desejo = await update_desejo_cliente(desejo_id, update_data)
    if not desejo:
        raise HTTPException(status_code=404, detail="Desejo not found")
    return desejo

@router.delete("/{desejo_id}")
async def delete_desejo(desejo_id: str):
    result = await delete_desejo_cliente(desejo_id)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Desejo not found")
    return {"message": "Desejo deleted"}

@router.get("/cliente/{cliente_id}")
async def get_desejos_cliente(cliente_id: str):
    return await get_desejos_by_cliente(cliente_id)