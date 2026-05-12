export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  data: {
    user: User;
    access_token: string;
    refresh_token: string;
  } | null;
  error: string | null;
}

export interface RefreshResponse {
  data: {
    access_token: string;
    refresh_token: string;
  } | null;
  error: string | null;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
