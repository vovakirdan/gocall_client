export async function getToken(): Promise<string | null> {
    return localStorage.getItem("token");
}

export async function saveToken(token: string): Promise<void> {
    localStorage.setItem("token", token);
}

export async function removeToken(): Promise<void> {
    localStorage.removeItem("token");
}
  