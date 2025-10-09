const API_URL = "http://localhost:3000/api/users";
const WALLS_API_URL = "http://localhost:3000/api/walls";
const NOTES_API_URL = "http://localhost:3000/api/notes";
const EDGES_API_URL = "http://localhost:3000/api/edges";

async function handleResponse(response) {
    const data = await response.json();
    if(!response.ok) {
        //casos seja nao
        const error = data.message || `Erro ${response.status}`;
        throw new Error(error);
    }
    return data;
}

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

//------------------------------------------------------------------
//FUNCOES DO WALL

export async function getUserWalls() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const token = userData ? userData.token : null;

    if (!token) {
        throw new Error("Token de autenticaçao não encontrado.")
    }

    const response = await fetch(WALLS_API_URL, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    return handleResponse(response);
}

export async function createWall(wallData) {
    const userData = JSON.parse(localStorage.getItem('userData')); 
    const token = userData ? userData.token : null;
    if (!token) throw new Error("Token de autenticação não encontrado.");

    const response = await fetch(WALLS_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(wallData)
    })
    return handleResponse(response);
}

export async function getWallById(wallId) {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const token = userData ? userData.token : null;
    if (!token) throw new Error("Token de autenticação não encontrado.");

    const response = await fetch(`${WALLS_API_URL}/${wallId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return handleResponse(response);
}

export async function deleteWall(wallId) {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const token = userData ? userData.token : null;
    if (!token) throw new Error("Token de autenticaçao não encontrado.");

    const response = await fetch(`${WALLS_API_URL}/${wallId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Erro ao deletar o mural.');
    }
    return true;
}

//------------------------------------------------------------------
//FUNCOES DAS NOTES

export async function createNote(noteData) {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const token = userData ? userData.token : null;
    if (!token) throw new Error("Token de autenticaçao não encontrado.");

    const response = await fetch(NOTES_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(noteData)
    });
    return handleResponse(response);
}

export async function updateNote(noteId, noteData) {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const token = userData ? userData.token : null;
    if (!token) throw new Error("Token de autenticaçao não encontrado.");

    const response = await fetch(`${NOTES_API_URL}/${noteId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(noteData)
    });
    return handleResponse(response);
}

export async function updateNotePosition(noteId, position) {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const token = userData ? userData.token : null;
    if (!token) throw new Error("Token de autenticaçao não encontrado.");

    const response = await fetch(`${NOTES_API_URL}/${noteId}/position`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ position })
    });
    return handleResponse(response);
}

export async function deleteNote(noteId) {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const token = userData ? userData.token : null;
    if (!token) throw new Error("Token de autenticaçao não encontrado.");

    const response = await fetch(`${NOTES_API_URL}/${noteId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        },
    });

    if (!response.ok) {
        const errorData = { message: `Erro ao deletar a nota.` };
        throw new Error(errorData.message);
    }
    return true;
}

//------------------------------------------------------------
//edges

export async function createEdge(edgeData) {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const token = userData ? userData.token : null;
    if (!token) throw new Error("Token de autenticaçao não encontrado.");

    const response = await fetch(EDGES_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(edgeData)
    });
    return handleResponse(response);
}

export async function deleteEdge(edgeData) {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const token = userData ? userData.token : null;
    if (!token) throw new Error("Token de autenticaçao não encontrado.");

    const response = await fetch(EDGES_API_URL, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(edgeData)
    });

    if (!response.ok) {
        throw new Error('Erro ao deletar a conexão.');
    }
    return true;
}