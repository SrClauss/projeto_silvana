import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login/LoginPage'
import Dashboard from './pages/Dashboard/Dashboard';
import Produtos from './pages/Produtos/Produtos';
import Clientes from './pages/Clientes/Clientes';
import TagsPage from './pages/Tags/Tags';
import MarcasFornecedores from './pages/MarcasFornecedores/MarcasFornecedores';
import Sessoes from './pages/Sessoes/Sessoes';
import Vendas from './pages/Vendas/Vendas';
import CriarVenda from './pages/Vendas/CriarVenda';
import CondicionaisFornecedor from './pages/CondicionaisFornecedor/CondicionaisFornecedor';
import CriarCondicionalFornecedor from './pages/CondicionaisFornecedor/CriarCondicionalFornecedor';
import CondicionaisCliente from './pages/CondicionaisCliente/CondicionaisCliente';
import CriarCondicionalCliente from './pages/CondicionaisCliente/CriarCondicionalCliente';
import LoggedLayout from './components/LoggedLayout';
import DevolucaoCondicionalFornecedor from './pages/CondicionaisFornecedor/DevolucaoCondicionalFornecedor';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<LoggedLayout activePage="/dashboard"><Dashboard /></LoggedLayout>} />
        <Route path="/produtos" element={<LoggedLayout activePage="/produtos"><Produtos /></LoggedLayout>} />
        <Route path="/clientes" element={<LoggedLayout activePage="/clientes"><Clientes /></LoggedLayout>} />
        <Route path="/tags" element={<LoggedLayout activePage="/tags"><TagsPage /></LoggedLayout>} />
        <Route path="/marcas-fornecedores" element={<LoggedLayout activePage="/marcas-fornecedores"><MarcasFornecedores /></LoggedLayout>} />
        <Route path="/sessoes" element={<LoggedLayout activePage="/sessoes"><Sessoes /></LoggedLayout>} />
        <Route path="/vendas" element={<LoggedLayout activePage="/vendas"><Vendas /></LoggedLayout>} />
        <Route path="/vendas/criar" element={<LoggedLayout activePage="/vendas"><CriarVenda /></LoggedLayout>} />
        <Route path="/condicionais-fornecedor" element={<LoggedLayout activePage="/condicionais-fornecedor"><CondicionaisFornecedor /></LoggedLayout>} />
        <Route path="/condicionais-fornecedor/criar" element={<LoggedLayout activePage="/condicionais-fornecedor"><CriarCondicionalFornecedor /></LoggedLayout>} />
        <Route path="/condicionais-cliente" element={<LoggedLayout activePage="/condicionais-cliente"><CondicionaisCliente /></LoggedLayout>} />
        <Route path="/condicionais-cliente/criar" element={<LoggedLayout activePage="/condicionais-cliente"><CriarCondicionalCliente /></LoggedLayout>} />
        <Route path="/condicionais-fornecedor/devolucao" element={<LoggedLayout activePage="/condicionais-fornecedor"><DevolucaoCondicionalFornecedor /></LoggedLayout>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App
