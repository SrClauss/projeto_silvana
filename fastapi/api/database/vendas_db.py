from motor.motor_asyncio import AsyncIOMotorClient
from ..models.saidas import Saida
from datetime import datetime
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

async def get_estoque_disponivel_por_produto(produto_id: str):
    """
    Calcula o estoque disponível de um produto.
    Items em condicional_cliente NÃO são considerados disponíveis; itens em condicional_fornecedor SÃO (podem ser vendidos pelo lojista).
    """
    produto = await db.produtos.find_one({"_id": produto_id})
    if not produto:
        return 0
    
    total = 0
    for item in produto.get("itens", []):
        # Conta itens que não estão em condicional cliente (itens em condicional fornecedor são vendáveis)
        if not item.get("condicional_cliente_id"):
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
    
    # Verifica estoque disponível (excluindo itens em condicional cliente)
    itens_disponiveis = [
        item for item in produto.get("itens", [])
        if not item.get("condicional_cliente_id")
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
    condicional_sold = {}  # condicional_fornecedor_id -> quantidade vendida
    for item in itens_ordenados:
        if quantidade_restante <= 0:
            break
        
        # Encontra o índice do item na lista original usando múltiplos critérios (agora aceitamos condicional_fornecedor)
        idx = None
        for i, it in enumerate(itens_atualizados):
            if (it.get("acquisition_date") == item.get("acquisition_date") and
                it.get("quantity") == item.get("quantity") and
                not it.get("condicional_cliente_id") and
                i not in items_to_remove):
                idx = i
                break
        
        if idx is None:
            continue
        
        item_quantity = itens_atualizados[idx].get("quantity", 0)
        cond_id = itens_atualizados[idx].get("condicional_fornecedor_id")
        
        if item_quantity <= quantidade_restante:
            # Remove o item completamente
            quantidade_restante -= item_quantity
            items_to_remove.append(idx)
            if cond_id:
                condicional_sold[cond_id] = condicional_sold.get(cond_id, 0) + item_quantity
        else:
            # Diminui a quantidade do item
            itens_atualizados[idx]["quantity"] = item_quantity - quantidade_restante
            if cond_id:
                condicional_sold[cond_id] = condicional_sold.get(cond_id, 0) + quantidade_restante
            quantidade_restante = 0

    # Remove items marcados para remoção (em ordem reversa para não afetar índices)
    for idx in sorted(items_to_remove, reverse=True):
        itens_atualizados.pop(idx)
    
    # Remove items marcados para remoção (em ordem reversa para não afetar índices)
    for idx in sorted(items_to_remove, reverse=True):
        itens_atualizados.pop(idx)
    
    # Atualiza o produto com os itens modificados
    await db.produtos.update_one(
        {"_id": produto_id},
        {"$set": {"itens": itens_atualizados, "updated_at": datetime.utcnow()},
         "$inc": {"em_condicional": -sum(condicional_sold.values()) if condicional_sold else 0}}
    )
    
    # Cria saídas (vendas) - se parte da venda veio de condicionais, registrar uma saida por condicional para rastreio
    vendas_criadas = []
    total_vendido = quantidade
    total_from_cond = sum(condicional_sold.values()) if condicional_sold else 0

    # Inserir saídas para quantidades vendidas originadas de condicionais
    for cond_id, q in condicional_sold.items():
        saida = Saida(
            produtos_id=produto_id,
            cliente_id=cliente_id,
            condicional_fornecedor_id=cond_id,
            quantidade=q,
            tipo="venda",
            data_saida=datetime.utcnow(),
            valor_total=valor_total if q == total_vendido else None,
            observacoes=observacoes
        )
        res = await db.saidas.insert_one(saida.dict(by_alias=True))
        vendas_criadas.append({"saida_id": str(res.inserted_id), "quantidade": q, "condicional_fornecedor_id": cond_id})

    # Inserir saida para o restante (não de condicional)
    restante = total_vendido - total_from_cond
    if restante > 0:
        saida = Saida(
            produtos_id=produto_id,
            cliente_id=cliente_id,
            quantidade=restante,
            tipo="venda",
            data_saida=datetime.utcnow(),
            valor_total=valor_total,
            observacoes=observacoes
        )
        res = await db.saidas.insert_one(saida.dict(by_alias=True))
        vendas_criadas.append({"saida_id": str(res.inserted_id), "quantidade": restante})

    return {
        "success": True,
        "vendas": vendas_criadas,
        "quantidade_vendida": quantidade,
        "estoque_restante": estoque_disponivel - quantidade
    }
