import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import UserProfilePage from './pages/UserProfilePage';
import DashboardPage from './pages/DashboardPage';
import SavedPostsPage from './pages/SavedPostsPage';
import SearchResultsPage from './pages/SearchResultsPage';
import PostDetailPage from './pages/PostDetailPage';
import AdminPage from './pages/admin/AdminPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const ProtectedLayout = () => (
  <ProtectedRoute>
    <WebSocketProvider>
      <Outlet />
    </WebSocketProvider>
  </ProtectedRoute>
);

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  const role = String(user?.role || '').replace(/^ROLE_/, '');
  if (role !== 'ADMIN') {
    return <Navigate to="/home" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/home" element={<DashboardPage />} />
          <Route path="/home/profile" element={<UserProfilePage />} />
          <Route path="/chat/*" element={<Home />} />
          <Route path="/friends" element={<Home />} />
          <Route path="/profile" element={<UserProfilePage />} />
          <Route path="/saved" element={<SavedPostsPage />} />
          <Route path="/notifications" element={<Home />} />
          <Route path="/profile/:userId" element={<UserProfilePage />} />
          <Route path="/posts/:postId" element={<PostDetailPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
        </Route>
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="*"
          element={
            <Navigate to="/home" replace />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
