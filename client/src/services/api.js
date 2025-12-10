const API_URL = "http://localhost:3000/api/users";
const WALLS_API_URL = "http://localhost:3000/api/walls";
const NOTES_API_URL = "http://localhost:3000/api/notes";
const EDGES_API_URL = "http://localhost:3000/api/edges";
const UPLOADS_API_URL = "http://localhost:3000/api/uploads";

// --- FUNÇÕES AUXILIARES ---

async function handleResponse(response) {
    const text = await response.text();
    // Tenta fazer o parse apenas se tiver texto, para evitar erro em respostas vazias (204)
    const data = text ? JSON.parse(text) : {};
    
    if(!response.ok) {
        if (response.status === 401) {
            // Opcional: Auto-logout se o token for inválido
            // localStorage.removeItem('userData');
            // location.href = '/auth';
        }
        const error = data.message || `Erro ${response.status}`;
        throw new Error(error);
    }
    return data;
}

/**
 * Gera os headers de autenticação automaticamente.
 * Inclui o Token JWT (Bearer) e o Token de Compartilhamento (x-share-token)
 * @param {Object} extraHeaders - Headers adicionais (ex: Content-Type)
 */
function getAuthHeaders(extraHeaders = {}) {
    const headers = { ...extraHeaders };
    const userData = JSON.parse(localStorage.getItem('userData'));
    const token = userData ? userData.token : null;
    const shareToken = localStorage.getItem('shareToken') || null;

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (shareToken) headers['x-share-token'] = shareToken;
    
    return headers;
}

// --- USUÁRIOS (AUTH) ---

export async function register(userData) {
    const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
    });
    return handleResponse(response);
}

export async function login(credentials) {
    const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
    });
    return handleResponse(response);
}

// --- MURAIS (WALLS) ---

export async function getUserWalls() {
    // Usa getAuthHeaders para pegar o token automaticamente
    const response = await fetch(WALLS_API_URL, {
        method: 'GET',
        headers: getAuthHeaders()
    });

    return handleResponse(response);
}

export async function createWall(wallData) {
    const response = await fetch(WALLS_API_URL, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(wallData)
    })
    return handleResponse(response);
}

export async function getWallById(id, shareToken = null) {
  // Envia shareToken na Query string (URL) E nos Headers
  const query = shareToken ? `?shareLink=${shareToken}` : '';
  
  const response = await fetch(`${WALLS_API_URL}/${id}${query}`, {
    method: 'GET',
    // Correção: Usa a função getAuthHeaders que definimos lá em cima
    headers: getAuthHeaders(), 
  });
  return handleResponse(response);
}

export async function getPublicWall(wallId) {
    const response = await fetch(`${WALLS_API_URL}/share/${wallId}`, {
        method: 'GET'
    });
    return handleResponse(response);
}

export async function generateShareLink(wallId) {
    const response = await fetch(`${WALLS_API_URL}/${wallId}/share`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
}

export async function deleteWall(wallId) {
    const response = await fetch(`${WALLS_API_URL}/${wallId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });

    // delete geralmente retorna 204 (sem conteudo), mas handleResponse trata isso
    return true; 
}

export async function updateWall(wallId, wallData) {
    const response = await fetch(`${WALLS_API_URL}/${wallId}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(wallData)
    });
    return handleResponse(response);
}

// --- NOTAS (NOTES) ---

export async function createNote(noteData) {
    const response = await fetch(NOTES_API_URL, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ 
            ...noteData, 
            shareLink: localStorage.getItem('shareToken') || undefined 
        })
    });
    return handleResponse(response);
}

export async function updateNote(noteId, noteData) {
    const response = await fetch(`${NOTES_API_URL}/${noteId}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(noteData)
    });
    return handleResponse(response);
}

export async function updateNotePosition(noteId, position) {
    const response = await fetch(`${NOTES_API_URL}/${noteId}/position`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ 
            position, 
            shareLink: localStorage.getItem('shareToken') || undefined 
        })
    });
    return handleResponse(response);
}

export async function deleteNote(noteId) {
    const response = await fetch(`${NOTES_API_URL}/${noteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    
    // Se chegou aqui sem erro do fetch, deu certo
    return true;
}

// --- ARESTAS / CONEXÕES (EDGES) ---

export async function createEdge(edgeData) {
    const response = await fetch(EDGES_API_URL, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ 
            ...edgeData, 
            shareLink: localStorage.getItem('shareToken') || undefined 
        })
    });
    return handleResponse(response);
}

export async function deleteEdge(edgeData) {
    const response = await fetch(EDGES_API_URL, {
        method: 'DELETE',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ 
            ...edgeData, 
            shareLink: localStorage.getItem('shareToken') || undefined 
        })
    });
    return true;
}

// --- PERFIL E UPLOAD ---

export async function updateUserAvatar(userId, avatarUrl) {
    const response = await fetch(`${API_URL}/${userId}/avatar`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ avatarUrl })
    });
    return handleResponse(response);
}

export async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    // IMPORTANTE: Para upload de arquivo com FormData, NÃO definimos 'Content-Type'.
    // O navegador define automaticamente como 'multipart/form-data' com o boundary correto.
    // Usamos getAuthHeaders SEM passar objeto extra, apenas para pegar o token.
    const headers = getAuthHeaders();

    const response = await fetch(UPLOADS_API_URL, {
        method: 'POST',
        headers: headers,
        body: formData
    });

    return handleResponse(response);
}