from motor.motor_asyncio import AsyncIOMotorClient
from ..models.saidas import Saida
from datetime import datetime
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

async def get_estoque_disponivel_por_produto(produto_id: str):
    """
    Calcula o estoque disponível de um produto (excluindo itens em condicional).
    """
    produto = await db.produtos.find_one({"_id": produto_id})
    if not produto:
        return 0
    
    total = 0
    for item in produto.get("itens", []):
        # Apenas conta itens que não estão em condicional
        if not item.get("condicional_fornecedor_id") and not item.get("condicional_cliente_id"):
            total += item.get("quantity", 0)
    
    return total

async def processar_venda_produto(produto_id: str, quantidade: int, cliente_id: str = None, 
                                   valor_total: int = None, observacoes: str = None):
    """
    Processa uma venda seguindo lógica FIFO (First In, First Out).
    Remove itens mais antigos primeiro baseado em acquisition_date.
    Remove completamente itens quando sua quantidade chega a 0.
    """
    produto = await db.produtos.find_one({"_id": produto_id})
    if not produto:
        return {"error": "Produto não encontrado"}
    
    # Verifica estoque disponível (excluindo itens em condicional)
    itens_disponiveis = [
        item for item in produto.get("itens", [])
        if not item.get("condicional_fornecedor_id") and not item.get("condicional_cliente_id")
    ]
    
    estoque_disponivel = sum(item.get("quantity", 0) for item in itens_disponiveis)
    
    if estoque_disponivel < quantidade:
        return {"error": f"Estoque insuficiente. Disponível: {estoque_disponivel}, Solicitado: {quantidade}"}
    
    # Ordena itens por acquisition_date (mais antigo primeiro - FIFO)
    itens_ordenados = sorted(
        itens_disponiveis,
        key=lambda x: x.get("acquisition_date", datetime.utcnow())
    )
    
    quantidade_restante = quantidade
    itens_atualizados = list(produto.get("itens", []))
    
    # Processa remoção FIFO
    items_to_remove = []
    for item in itens_ordenados:
        if quantidade_restante <= 0:
            break
        
        # Encontra o índice do item na lista original usando múltiplos critérios
        idx = None
        for i, it in enumerate(itens_atualizados):
            if (it.get("acquisition_date") == item.get("acquisition_date") and
                it.get("quantity") == item.get("quantity") and
                not it.get("condicional_fornecedor_id") and
                not it.get("condicional_cliente_id") and
                i not in items_to_remove):
                idx = i
                break
        
        if idx is None:
            continue
        
        item_quantity = itens_atualizados[idx].get("quantity", 0)
        
        if item_quantity <= quantidade_restante:
            # Remove o item completamente
            quantidade_restante -= item_quantity
            items_to_remove.append(idx)
        else:
            # Diminui a quantidade do item
            itens_atualizados[idx]["quantity"] = item_quantity - quantidade_restante
            quantidade_restante = 0
    
    # Remove items marcados para remoção (em ordem reversa para não afetar índices)
    for idx in sorted(items_to_remove, reverse=True):
        itens_atualizados.pop(idx)
    
    # Atualiza o produto com os itens modificados
    await db.produtos.update_one(
        {"_id": produto_id},
        {"$set": {"itens": itens_atualizados, "updated_at": datetime.utcnow()}}
    )
    
    # Cria a saída (venda)
    saida = Saida(
        produtos_id=produto_id,
        cliente_id=cliente_id,
        quantidade=quantidade,
        tipo="venda",
        data_saida=datetime.utcnow(),
        valor_total=valor_total,
        observacoes=observacoes
    )
    
    result = await db.saidas.insert_one(saida.dict(by_alias=True))
    
    return {
        "success": True,
        "saida_id": str(result.inserted_id),
        "quantidade_vendida": quantidade,
        "estoque_restante": estoque_disponivel - quantidade
    }
