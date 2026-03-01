import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import RecipePage from './pages/RecipePage';
import AddRecipePage from './pages/AddRecipePage';
import EditRecipePage from './pages/EditRecipePage';
import GroceryPage from './pages/GroceryPage';
import AdminPage from './pages/AdminPage';
import BulkImportPage from './pages/BulkImportPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  {({ searchQuery }) => <HomePage searchQuery={searchQuery} />}
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/recipe/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <RecipePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/add"
            element={
              <ProtectedRoute>
                <Layout>
                  <AddRecipePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <EditRecipePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bulk-import"
            element={
              <ProtectedRoute>
                <Layout>
                  <BulkImportPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grocery"
            element={
              <ProtectedRoute>
                <Layout>
                  <GroceryPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <Layout>
                  <AdminPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
