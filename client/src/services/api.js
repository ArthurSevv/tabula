const API_URL = "http://localhost:3000/api/users";

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