const API_URL = "http://localhost:3000/api/users";
const WALLS_API_URL = "http://localhost:3000/api/walls";
const NOTES_API_URL = "http://localhost:3000/api/notes";

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