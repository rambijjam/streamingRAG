import api from './api';

export const decodeToken = (token) => {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const login = async (email, password) => {
  const body = new URLSearchParams();
  body.append('username', email);
  body.append('password', password);

  const { data } = await api.post('/auth/login', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  
  const claims = decodeToken(data.access_token);
  const user = { email: claims?.sub || email, role: data.role || claims?.role };
  return { token: data.access_token, user };
}

export const registerUser = async ({ full_name, email, password, role_name }) => {
  const { data } = await api.post('/auth/register', { full_name, email, password, role_name });
  return data;
}

export const listUsers = async ({ role, is_active, search } = {}) => {
  const params = {};
  if (role) params.role = role;
  if (is_active !== undefined) params.is_active = is_active;
  if (search) params.search = search;
  const { data } = await api.get('/admin/users', { params });
  return data;
}

export const updateUserRole = async (userId, newRole) => {
  const { data } = await api.put(`/admin/users/${userId}/role`, { new_role: newRole });
  return data;
}

export const setUserStatus = async (email, isActive) => {
  const { data } = await api.put('/admin/users/status', { email, is_active: isActive });
  return data;
}

export async function uploadDocument({ file, roles, topic }) {
  const form = new FormData();
  form.append('file', file);
  form.append('allowed_roles', roles.join(','));
  form.append('document_topic', topic);

  const { data } = await api.post('/admin/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export const askQuestion = async (question)=>{
  const {data } = await api.post('/ask', {question});
  return data;
}

export const getChatHistory = async (limit = 50) => {
  const { data } = await api.get('/chat/history', { params: { limit } });
  return data.history || [];
}

export const submitFeedback = async (chatId, score, text) => {
  const { data } = await api.put(`/chat/${chatId}/feedback`, { score, text: text || null });
  return data;
}

export const getFeedback = async (chatId)=>{
  const {data} = await api.get('/admin/feedback');
  return data.feedback_logs || [];
}

export const  getAdminDocuments = async ()=> {
  const { data } = await api.get('/admin/documents');
  return data.documents || [];
}

export const updateDocumentPermissions = async (docId, allowedRoles)=> {
  const { data } = await api.put(`/admin/documents/${docId}/permissions`, { allowed_roles: allowedRoles });
  return data;
}

export const  deleteDocument = async (docId)=> {
  const { data } = await api.delete(`/admin/documents/${docId}`);
  return data;
}