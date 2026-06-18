const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

// ── Token storage (client-side) ─────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gf_token');
}

export function setToken(token: string): void {
  localStorage.setItem('gf_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('gf_token');
  localStorage.removeItem('gf_refresh');
}

export function getRefresh(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gf_refresh');
}

export function setRefresh(token: string): void {
  localStorage.setItem('gf_refresh', token);
}

// ── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export type User = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  is_admin: boolean;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
};

export const auth = {
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false),

  register: (email: string, password: string, full_name: string, phone = '') =>
    apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name, phone }),
    }, false),

  me: () => apiFetch<User>('/auth/me'),

  refresh: (refresh_token: string) =>
    apiFetch<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    }, false),
};

// ── Products ─────────────────────────────────────────────────────────────────

export type Sku = { label: string; price: number };

export type Product = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  long_description: string;
  highlights: string[];
  nutrition_note: string;
  pricing: Sku[];
  color: string;
  accent: string;
  image: string;
  hero_image: string;
  stock: number;
  is_active: boolean;
};

export const products = {
  list: (activeOnly = true) =>
    apiFetch<Product[]>(`/products/?active_only=${activeOnly}`, {}, false),

  get: (slug: string) =>
    apiFetch<Product>(`/products/${slug}`, {}, false),

  create: (data: Omit<Product, 'id'>) =>
    apiFetch<Product>('/products/', { method: 'POST', body: JSON.stringify(data) }),

  update: (slug: string, data: Partial<Product>) =>
    apiFetch<Product>(`/products/${slug}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (slug: string) =>
    apiFetch<void>(`/products/${slug}`, { method: 'DELETE' }),
};

// ── Orders ───────────────────────────────────────────────────────────────────

export type OrderItem = {
  product_id: string;
  slug: string;
  name: string;
  sku_label: string;
  quantity: number;
  unit_price: number;
};

export type Order = {
  id: string;
  user_id: string | null;
  guest_email: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: string;
  payment_status: string;
  shipping_address: Record<string, string>;
  razorpay_order_id: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type CreateOrderPayload = {
  items: { product_id: string; slug: string; name: string; sku_label: string; quantity: number; unit_price: number }[];
  shipping_address: {
    full_name: string; phone: string; line1: string; line2?: string;
    city: string; state: string; pincode: string; country?: string;
  };
  guest_email?: string;
  notes?: string;
};

export const orders = {
  list: (status?: string, skip = 0, limit = 50) => {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (status) params.set('status_filter', status);
    return apiFetch<Order[]>(`/orders/?${params}`);
  },

  myOrders: () => apiFetch<Order[]>('/orders/me'),

  get: (id: string) => apiFetch<Order>(`/orders/${id}`),

  create: (payload: CreateOrderPayload) =>
    apiFetch<Order>('/orders/', { method: 'POST', body: JSON.stringify(payload) }, false),

  updateStatus: (id: string, status: string) =>
    apiFetch<Order>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// ── Users (admin) ─────────────────────────────────────────────────────────────
// No user list endpoint yet — expose what the backend supports
export const users = {
  me: () => apiFetch<User>('/auth/me'),
  updateMe: (data: { full_name?: string; phone?: string }) =>
    apiFetch<User>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
};

// ── Uploads ───────────────────────────────────────────────────────────────────

export const uploads = {
  /**
   * Upload an image file to the specified brand's R2 bucket.
   * Returns the public CDN URL of the uploaded image.
   */
  uploadImage: async (brand: string, file: File, folder = 'products'): Promise<string> => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(
      `${API_BASE}/uploads/${brand}/image?folder=${encodeURIComponent(folder)}`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail ?? `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.url as string;
  },
};

// ── Class Sessions (Awakynn) ──────────────────────────────────────────────────

export type ClassSession = {
  id: string;
  slot_id: string;
  day_of_week: number;
  occurrence_date: string;
  end_date: string;
  title: string;
  meet_link: string;
  generated_at: string | null;
  created_at: string;
};

export type GenerateSessionPayload = {
  slot_id: string;
  day_of_week: number;
  occurrence_date: string; // ISO
  end_date: string;        // ISO
  title: string;
};

export const classSessions = {
  list: (upcomingOnly = true) =>
    apiFetch<ClassSession[]>(`/classes/sessions?upcoming_only=${upcomingOnly}`),

  generate: (payload: GenerateSessionPayload) =>
    apiFetch<ClassSession>('/classes/sessions/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/classes/sessions/${id}`, { method: 'DELETE' }),
};

// ── Site settings ─────────────────────────────────────────────────────────────

export type Season = 'summer' | 'monsoon' | 'autumn' | 'winter';

export const siteSettings = {
  getSeason: () =>
    apiFetch<{ season: Season }>('/settings/season', {}, false),

  setSeason: (season: Season) =>
    apiFetch<{ season: Season }>('/settings/season', {
      method: 'PATCH',
      body: JSON.stringify({ season }),
    }),
};
