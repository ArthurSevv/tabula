const API_URL = "http://localhost:3000/api/users";
const WALLS_API_URL = "http://localhost:3000/api/walls";
const NOTES_API_URL = "http://localhost:3000/api/notes";
const EDGES_API_URL = "http://localhost:3000/api/edges";
const UPLOADS_API_URL = "http://localhost:3000/api/uploads";

// ---------------------------------------------------------
// funcoes auxiliares
// ---------------------------------------------------------

async function handleResponse(response) {
    const text = await response.text();
    // tenta fazer o parse apenas se tiver texto, para evitar erro em respostas vazias (204)
    const data = text ? JSON.parse(text) : {};
    
    if(!response.ok) {
        if (response.status === 401) {
            // opcional: auto-logout se o token for invalido
            // localStorage.removeItem('userData');
            // location.href = '/auth';
        }
        const error = data.message || `erro ${response.status}`;
        throw new Error(error);
    }
    return data;
}

// gera os headers de autenticacao automaticamente
// inclui o token jwt (bearer) e o token de compartilhamento (x-share-token)
function getAuthHeaders(extraHeaders = {}) {
    const headers = { ...extraHeaders };
    const userData = JSON.parse(localStorage.getItem('userData'));
    const token = userData ? userData.token : null;
    const shareToken = localStorage.getItem('shareToken') || null;

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (shareToken) headers['x-share-token'] = shareToken;
    
    return headers;
}

// ---------------------------------------------------------
// usuarios (auth)
// ---------------------------------------------------------

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

// ---------------------------------------------------------
// murais (walls)
// ---------------------------------------------------------

export async function getUserWalls() {
    // usa getAuthHeaders para pegar o token automaticamente
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
  // envia sharetoken na query string (url) e nos headers
  const query = shareToken ? `?shareLink=${shareToken}` : '';
  
  const response = await fetch(`${WALLS_API_URL}/${id}${query}`, {
    method: 'GET',
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

// ---------------------------------------------------------
// notas (notes)
// ---------------------------------------------------------

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
    
    // se chegou aqui sem erro do fetch, deu certo
    return true;
}

// ---------------------------------------------------------
// arestas / conexoes (edges)
// ---------------------------------------------------------

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

// ---------------------------------------------------------
// perfil e upload
// ---------------------------------------------------------

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

    // importante: para upload de arquivo com formdata, nao definimos 'content-type'.
    // o navegador define automaticamente como 'multipart/form-data' com o boundary correto.
    // usamos getAuthHeaders sem passar objeto extra, apenas para pegar o token.
    const headers = getAuthHeaders();

    const response = await fetch(UPLOADS_API_URL, {
        method: 'POST',
        headers: headers,
        body: formData
    });

    return handleResponse(response);
}