const API_URL = "http://localhost:3000/api/users";

export async function register(userData) {
    const response = JSON.stringify( await fetch("http://localhost:3000/api/users/register"));
    if(!response.ok){
        return console.error("erro no fetch")
    }
    return console.log(response.json())
}

export async function login(params) {
    const response = JSON.stringify( await fetch("http://localhost:3000/api/users/login"));
    if(!response.ok){
        return console.error("erro no fetch")
    }
    return console.log(response.json())
}