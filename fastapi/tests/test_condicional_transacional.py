"""
Tests for transactional conditional cliente creation with rollback and idempotency.

Prerequisites:
- MongoDB instance must be running
- For transaction tests to fully pass, MongoDB must be configured as a replica set
- Set MONGODB_URL environment variable to point to test MongoDB instance

Run tests with:
    pytest tests/test_condicional_transacional.py -v
"""

import pytest
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from bson import ObjectId

# Import functions to test
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from api.database.condicional_cliente_db import (
    create_condicional_cliente,
    enviar_produto_condicional_cliente,
    get_condicional_cliente_by_id,
    supports_transactions,
    db
)
from api.models.condicional_cliente import CondicionalCliente, ProdutoQuantity


# Test MongoDB connection
TEST_MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
test_client = AsyncIOMotorClient(TEST_MONGODB_URL)
test_db = test_client["projeto_silvana_test"]


@pytest.fixture
async def cleanup_db():
    """Cleanup test database before and after tests"""
    # Cleanup before test
    await test_db.condicional_clientes.delete_many({})
    await test_db.produtos.delete_many({})
    await test_db.saidas.delete_many({})
    
    yield
    
    # Cleanup after test
    await test_db.condicional_clientes.delete_many({})
    await test_db.produtos.delete_many({})
    await test_db.saidas.delete_many({})


@pytest.fixture
async def sample_produto():
    """Create a sample produto for testing"""
    produto_id = str(ObjectId())
    produto = {
        "_id": produto_id,
        "codigo_interno": "TEST001",
        "descricao": "Produto Teste",
        "itens": [
            {
                "quantity": 10,
                "acquisition_date": datetime.utcnow(),
                "condicionais_fornecedor": [],
                "condicionais_cliente": []
            }
        ],
        "em_condicional_cliente": False,
        "em_condicional_fornecedor": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Insert into test db (using the actual db from the module for now)
    await db.produtos.insert_one(produto)
    
    yield produto_id
    
    # Cleanup
    await db.produtos.delete_one({"_id": produto_id})


@pytest.mark.asyncio
async def test_transaction_support_detection():
    """Test if transaction support detection works"""
    support = await supports_transactions()
    # This should return True for replica set, False for standalone
    assert isinstance(support, bool)
    print(f"Transaction support: {support}")


@pytest.mark.asyncio
async def test_create_condicional_success(cleanup_db, sample_produto):
    """Test successful creation of condicional with products"""
    cliente_id = str(ObjectId())
    
    condicional = CondicionalCliente(
        cliente_id=cliente_id,
        produtos=[
            ProdutoQuantity(produto_id=sample_produto, quantidade=3)
        ],
        observacoes="Test condicional"
    )
    
    result = await create_condicional_cliente(condicional)
    
    # Should return condicional_id, not error dict
    assert not isinstance(result, dict) or not result.get("error")
    assert isinstance(result, (str, ObjectId))
    
    # Verify condicional was created
    created_cond = await get_condicional_cliente_by_id(str(result))
    assert created_cond is not None
    assert created_cond["cliente_id"] == cliente_id
    assert len(created_cond["produtos"]) == 1
    assert created_cond["produtos"][0]["quantidade"] == 3
    
    # Verify product items were marked
    produto = await db.produtos.find_one({"_id": sample_produto})
    assert produto is not None
    assert produto["em_condicional_cliente"] is True
    
    # Check that items have condicional markings
    marked_items = [item for item in produto["itens"] if item.get("condicionais_cliente")]
    assert len(marked_items) > 0
    total_marked = sum(len(item.get("condicionais_cliente", [])) for item in marked_items)
    assert total_marked == 3


@pytest.mark.asyncio
async def test_create_condicional_insufficient_stock(cleanup_db, sample_produto):
    """Test creation fails with insufficient stock and rolls back"""
    cliente_id = str(ObjectId())
    
    condicional = CondicionalCliente(
        cliente_id=cliente_id,
        produtos=[
            ProdutoQuantity(produto_id=sample_produto, quantidade=20)  # More than available
        ]
    )
    
    result = await create_condicional_cliente(condicional)
    
    # Should return error dict
    assert isinstance(result, dict)
    assert "error" in result
    assert "insuficiente" in result["error"].lower()
    
    # Verify condicional was NOT created (rollback worked)
    all_condicionais = await db.condicional_clientes.find({"cliente_id": cliente_id}).to_list(None)
    assert len(all_condicionais) == 0
    
    # Verify product was NOT marked
    produto = await db.produtos.find_one({"_id": sample_produto})
    assert produto is not None
    assert produto.get("em_condicional_cliente", False) is False


@pytest.mark.asyncio
async def test_enviar_produto_idempotency(cleanup_db, sample_produto):
    """Test idempotency: adding same product twice increments quantity"""
    cliente_id = str(ObjectId())
    
    # Create condicional first without products
    condicional = CondicionalCliente(
        cliente_id=cliente_id,
        produtos=[],
        observacoes="Test idempotency"
    )
    
    # Manually insert condicional
    result = await db.condicional_clientes.insert_one(condicional.dict(by_alias=True, exclude={"produtos"}))
    condicional_id = str(result.inserted_id)
    
    # First call: add 3 items
    result1 = await enviar_produto_condicional_cliente(condicional_id, sample_produto, 3)
    assert result1.get("success") is True
    
    # Second call: add 2 more items (should increment)
    result2 = await enviar_produto_condicional_cliente(condicional_id, sample_produto, 2)
    assert result2.get("success") is True
    
    # Verify total quantity is 5 (3 + 2)
    cond = await get_condicional_cliente_by_id(condicional_id)
    assert len(cond["produtos"]) == 1
    assert cond["produtos"][0]["quantidade"] == 5
    
    # Verify product has 5 items marked
    produto = await db.produtos.find_one({"_id": sample_produto})
    marked_items = [item for item in produto["itens"] if item.get("condicionais_cliente")]
    total_marked = sum(len(item.get("condicionais_cliente", [])) for item in marked_items)
    assert total_marked == 5


@pytest.mark.asyncio
async def test_create_condicional_with_nonexistent_product(cleanup_db):
    """Test creation fails gracefully with nonexistent product"""
    cliente_id = str(ObjectId())
    fake_produto_id = str(ObjectId())
    
    condicional = CondicionalCliente(
        cliente_id=cliente_id,
        produtos=[
            ProdutoQuantity(produto_id=fake_produto_id, quantidade=1)
        ]
    )
    
    result = await create_condicional_cliente(condicional)
    
    # Should return error
    assert isinstance(result, dict)
    assert "error" in result
    
    # Verify rollback: no condicional created
    all_condicionais = await db.condicional_clientes.find({"cliente_id": cliente_id}).to_list(None)
    assert len(all_condicionais) == 0


@pytest.mark.asyncio
async def test_enviar_produto_to_inactive_condicional(cleanup_db, sample_produto):
    """Test that enviar_produto fails for inactive condicional"""
    cliente_id = str(ObjectId())
    
    # Create inactive condicional
    condicional = CondicionalCliente(
        cliente_id=cliente_id,
        produtos=[],
        ativa=False
    )
    
    result = await db.condicional_clientes.insert_one(condicional.dict(by_alias=True, exclude={"produtos"}))
    condicional_id = str(result.inserted_id)
    
    # Try to add product
    result = await enviar_produto_condicional_cliente(condicional_id, sample_produto, 1)
    
    # Should return error
    assert result.get("error") is not None
    assert "ativa" in result["error"].lower()


@pytest.mark.asyncio
async def test_multiple_products_partial_failure(cleanup_db, sample_produto):
    """Test that if one product fails, entire operation rolls back"""
    cliente_id = str(ObjectId())
    fake_produto_id = str(ObjectId())
    
    condicional = CondicionalCliente(
        cliente_id=cliente_id,
        produtos=[
            ProdutoQuantity(produto_id=sample_produto, quantidade=2),  # Valid
            ProdutoQuantity(produto_id=fake_produto_id, quantidade=1)   # Invalid - doesn't exist
        ]
    )
    
    result = await create_condicional_cliente(condicional)
    
    # Should return error (second product doesn't exist)
    assert isinstance(result, dict)
    assert "error" in result
    
    # Verify complete rollback: no condicional created
    all_condicionais = await db.condicional_clientes.find({"cliente_id": cliente_id}).to_list(None)
    assert len(all_condicionais) == 0
    
    # Verify first product was NOT marked (rollback worked)
    produto = await db.produtos.find_one({"_id": sample_produto})
    assert produto.get("em_condicional_cliente", False) is False
    marked_items = [item for item in produto["itens"] if item.get("condicionais_cliente")]
    total_marked = sum(len(item.get("condicionais_cliente", [])) for item in marked_items)
    assert total_marked == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
