import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login/LoginPage'
import Dashboard from './pages/Dashboard/Dashboard';
import Produtos from './pages/Produtos/Produtos';
import Clientes from './pages/Clientes/Clientes';
import TagsPage from './pages/Tags/Tags';
import MarcasFornecedores from './pages/MarcasFornecedores/MarcasFornecedores';
import LoggedLayout from './components/LoggedLayout';

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
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App
