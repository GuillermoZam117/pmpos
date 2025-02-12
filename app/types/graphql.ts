interface Department {
    id: string;
    name: string;
}

interface User {
    id: string;
    name: string;
    permissions: string[];
    departments: Department[];
}

interface AuthResponse {
    success: boolean;
    message: string;
    user: User;
}