# API Integration Guide

┌─ API REFERENCE ─────────────────────────────────────────┐
│ ● DOCUMENTED  │ ████████████████████ 100% COMPLETE     │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "hub": "../../CLAUDE.md",
  "map": "DOCUMENTATION_MAP.md",
  "current": "API_GUIDE.md",
  "sections": [
    {"path": "#authentication", "desc": "JWT auth flow"},
    {"path": "#react-query", "desc": "Data fetching"},
    {"path": "#error-handling", "desc": "Error patterns"},
    {"path": "#endpoints", "desc": "API reference"}
  ]
}
```

## Authentication

### JWT Token Flow

```tsx
// lib/auth.ts
export const authConfig = {
  tokenKey: 'b9_auth_token',
  refreshKey: 'b9_refresh_token',
  apiUrl: process.env.NEXT_PUBLIC_API_URL
};

// Get stored token
export const getAuthToken = () => {
  return localStorage.getItem(authConfig.tokenKey);
};

// Set token after login
export const setAuthToken = (token: string) => {
  localStorage.setItem(authConfig.tokenKey, token);
};

// Clear tokens on logout
export const clearAuth = () => {
  localStorage.removeItem(authConfig.tokenKey);
  localStorage.removeItem(authConfig.refreshKey);
};
```

### Axios Configuration

```tsx
// lib/api-client.ts
import axios from 'axios';
import { getAuthToken, clearAuth } from './auth';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Login Implementation

```tsx
// app/login/page.tsx
function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data } = await apiClient.post('/auth/login', credentials);
      return data;
    },
    onSuccess: (data) => {
      setAuthToken(data.token);
      showToast({ type: 'success', message: 'Welcome back!' });
      router.push('/dashboard');
    },
    onError: (error) => {
      showToast({
        type: 'error',
        message: error.response?.data?.message || 'Login failed'
      });
    }
  });

  return (
    <form onSubmit={handleSubmit(loginMutation.mutate)}>
      {/* Form fields */}
    </form>
  );
}
```

## React Query Integration

### Query Client Setup

```tsx
// app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 1
    }
  }
});

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Query Hooks Pattern

```tsx
// hooks/queries/useSubreddits.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

// Fetch hook
export const useSubreddits = (filters?: SubredditFilters) => {
  return useQuery({
    queryKey: ['subreddits', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/subreddits', { params: filters });
      return data;
    },
    // Only fetch when filters change
    enabled: !!filters
  });
};

// Create hook
export const useCreateSubreddit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subreddit: NewSubreddit) => {
      const { data } = await apiClient.post('/subreddits', subreddit);
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['subreddits'] });
    }
  });
};

// Update hook with optimistic updates
export const useUpdateSubreddit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateSubreddit) => {
      const { data } = await apiClient.put(`/subreddits/${id}`, updates);
      return data;
    },
    // Optimistic update
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: ['subreddits'] });

      const previous = queryClient.getQueryData(['subreddits']);

      queryClient.setQueryData(['subreddits'], (old) => {
        return old.map(item =>
          item.id === updated.id ? { ...item, ...updated } : item
        );
      });

      return { previous };
    },
    // Rollback on error
    onError: (err, updated, context) => {
      queryClient.setQueryData(['subreddits'], context.previous);
    },
    // Refetch after success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subreddits'] });
    }
  });
};
```

### Infinite Query Pattern

```tsx
// hooks/queries/useInfinitePosts.ts
export const useInfinitePosts = (categoryId?: string) => {
  return useInfiniteQuery({
    queryKey: ['posts', categoryId],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await apiClient.get('/posts', {
        params: {
          category: categoryId,
          offset: pageParam,
          limit: 20
        }
      });
      return data;
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length * 20 : undefined;
    }
  });
};

// Usage in component
function PostList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfinitePosts();

  return (
    <>
      {data?.pages.map((page) => (
        page.posts.map((post) => <PostCard key={post.id} {...post} />)
      ))}
      {hasNextPage && (
        <Button
          onClick={() => fetchNextPage()}
          loading={isFetchingNextPage}
        >
          Load More
        </Button>
      )}
    </>
  );
}
```

## Error Handling

### Global Error Handler

```tsx
// lib/error-handler.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: any): ApiError => {
  if (error.response) {
    // Server responded with error
    return new ApiError(
      error.response.status,
      error.response.data?.code || 'SERVER_ERROR',
      error.response.data?.message || 'Server error occurred',
      error.response.data?.details
    );
  } else if (error.request) {
    // No response received
    return new ApiError(
      0,
      'NETWORK_ERROR',
      'Network error - please check your connection'
    );
  } else {
    // Request setup error
    return new ApiError(
      0,
      'REQUEST_ERROR',
      error.message || 'Failed to make request'
    );
  }
};
```

### Error Boundary

```tsx
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to error reporting service
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <StandardError
          title="Something went wrong"
          message={this.state.error?.message}
          onRetry={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}
```

### Query Error Handling

```tsx
// hooks/queries/base.ts
export const queryErrorHandler = (error: any) => {
  const apiError = handleApiError(error);

  // Don't show toast for auth errors (handled by interceptor)
  if (apiError.status !== 401) {
    showToast({
      type: 'error',
      message: apiError.message,
      description: apiError.details
    });
  }

  return apiError;
};

// Use in queries
const { data, error } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  onError: queryErrorHandler
});
```

## API Endpoints Reference

### Subreddit Endpoints

```tsx
// GET /api/subreddits
interface SubredditListParams {
  approved?: boolean;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

const fetchSubreddits = async (params: SubredditListParams) => {
  const { data } = await apiClient.get('/api/subreddits', { params });
  return data; // { subreddits: Subreddit[], total: number }
};

// POST /api/subreddits/bulk-review
interface BulkReviewPayload {
  subredditIds: string[];
  action: 'approve' | 'reject';
  category?: string;
}

const bulkReview = async (payload: BulkReviewPayload) => {
  const { data } = await apiClient.post('/api/subreddits/bulk-review', payload);
  return data; // { updated: number }
};

// GET /api/subreddits/stats
const fetchStats = async () => {
  const { data } = await apiClient.get('/api/subreddits/stats');
  return data; // { total: number, approved: number, categories: Record<string, number> }
};
```

### User Endpoints

```tsx
// GET /api/users/search
interface UserSearchParams {
  query: string;
  isCreator?: boolean;
  hasInstagram?: boolean;
}

const searchUsers = async (params: UserSearchParams) => {
  const { data } = await apiClient.get('/api/users/search', { params });
  return data; // { users: User[], total: number }
};

// POST /api/users/toggle-creator
const toggleCreator = async (userId: string) => {
  const { data } = await apiClient.post('/api/users/toggle-creator', { userId });
  return data; // { user: User }
};

// POST /api/users/bulk-update
interface BulkUpdatePayload {
  userIds: string[];
  updates: Partial<User>;
}

const bulkUpdateUsers = async (payload: BulkUpdatePayload) => {
  const { data } = await apiClient.post('/api/users/bulk-update', payload);
  return data; // { updated: number }
};
```

### AI Categorization Endpoints

```tsx
// POST /api/ai/categorize-batch
interface CategorizeBatchPayload {
  posts: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  model?: 'gpt-3.5' | 'gpt-4';
}

const categorizeBatch = async (payload: CategorizeBatchPayload) => {
  const { data } = await apiClient.post('/api/ai/categorize-batch', payload);
  return data; // { categorized: CategorizedPost[] }
};

// GET /api/ai/accuracy-metrics
const fetchAccuracyMetrics = async () => {
  const { data } = await apiClient.get('/api/ai/accuracy-metrics');
  return data; // { accuracy: number, confusion_matrix: any }
};
```

### Scraper Control Endpoints

```tsx
// POST /api/scraper/start
interface ScraperStartPayload {
  module: 'reddit' | 'instagram';
  config?: {
    limit?: number;
    subreddits?: string[];
  };
}

const startScraper = async (payload: ScraperStartPayload) => {
  const { data } = await apiClient.post('/api/scraper/start', payload);
  return data; // { job_id: string, status: 'started' }
};

// POST /api/scraper/stop
const stopScraper = async () => {
  const { data } = await apiClient.post('/api/scraper/stop');
  return data; // { status: 'stopped' }
};

// GET /api/scraper/status
const fetchScraperStatus = async () => {
  const { data } = await apiClient.get('/api/scraper/status');
  return data; // { running: boolean, jobs: Job[], errors: number }
};
```

## Rate Limiting

```tsx
// Handle rate limiting with exponential backoff
const rateLimitHandler = async (fn: () => Promise<any>, maxRetries = 3) => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] ||
                          Math.pow(2, retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        retries++;
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max retries exceeded');
};

// Usage
const data = await rateLimitHandler(() => apiClient.get('/api/expensive-endpoint'));
```

## File Upload

```tsx
// lib/upload.ts
export const uploadFile = async (file: File, endpoint: string) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      console.log(`Upload progress: ${percentCompleted}%`);
    }
  });

  return data;
};

// Component usage
function FileUpload() {
  const [progress, setProgress] = useState(0);

  const handleUpload = async (file: File) => {
    try {
      const result = await uploadFile(file, '/api/upload');
      showToast({ type: 'success', message: 'File uploaded!' });
    } catch (error) {
      showToast({ type: 'error', message: 'Upload failed' });
    }
  };

  return (
    <input
      type="file"
      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
    />
  );
}
```

## WebSocket Connection

```tsx
// lib/websocket.ts
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnects = 5;

  connect(url: string, token: string) {
    this.ws = new WebSocket(`${url}?token=${token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      this.reconnect();
    };
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnects) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, Math.pow(2, this.reconnectAttempts) * 1000);
    }
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    this.ws?.close();
  }
}
```

---

_Guide Version: 1.0.0 | Updated: 2025-01-29 | Endpoints: 36_
_Navigate: [← Component Guide](COMPONENT_GUIDE.md) | [→ Testing Guide](TESTING_GUIDE.md)_