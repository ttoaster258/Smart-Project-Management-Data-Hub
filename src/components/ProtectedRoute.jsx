import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, isAdminUser, hasPermission } from '../../services/AuthService';

export default function ProtectedRoute({ children, adminOnly = false, requiredPermission = null }) {
  const navigate = useNavigate();

  useEffect(() => {
    // 检查是否已认证
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    // 如果需要管理员权限
    if (adminOnly && !isAdminUser()) {
      navigate('/');
      return;
    }

    // 如果需要特定权限
    if (requiredPermission && !hasPermission(requiredPermission)) {
      navigate('/');
      return;
    }
  }, [navigate, adminOnly, requiredPermission]);

  // 未认证时不渲染内容
  if (!isAuthenticated()) {
    return null;
  }

  // 需要管理员权限但不是管理员时不渲染
  if (adminOnly && !isAdminUser()) {
    return null;
  }

  // 需要特定权限但没有时不渲染
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return null;
  }

  return children;
}