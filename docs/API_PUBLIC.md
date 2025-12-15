# Public API Documentation

## Overview

The Public API provides access to approved projects for external integrations. This API is designed for applications that want to display Arc Index projects in carousels, widgets, or other external interfaces.

## Endpoint

```
GET /api/public/projects
```

## Authentication (Optional)

The API supports optional API key authentication via environment variable `PUBLIC_API_KEY`. If configured, requests must include the API key in one of the following ways:

- Header: `x-api-key: YOUR_API_KEY`
- Header: `Authorization: Bearer YOUR_API_KEY`

If `PUBLIC_API_KEY` is not set, the API is publicly accessible without authentication.

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `category` | string | No | - | Filter by project category |
| `limit` | number | No | 50 | Maximum number of projects to return (max: 100) |
| `offset` | number | No | 0 | Number of projects to skip (for pagination) |

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Project Name",
      "description": "Short description (max 400 chars)",
      "category": "DeFi",
      "website_url": "https://project.com",
      "x_url": "https://twitter.com/project",
      "github_url": "https://github.com/project",
      "linkedin_url": "https://linkedin.com/company/project",
      "image_url": "https://...",
      "image_thumb_url": "https://...",
      "rating": 4.5,
      "funding_total": 1000.50,
      "created_at": "2024-01-01T00:00:00Z",
      "project_url": "https://arcindex.xyz/project/uuid"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 50
  }
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

#### 400 Bad Request
```json
{
  "error": "Invalid query parameters",
  "details": [...]
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to fetch projects"
}
```

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique project identifier (UUID) |
| `name` | string | Project name |
| `description` | string | Short description (max 400 characters) |
| `category` | string | Project category |
| `website_url` | string | Main website URL (required) |
| `x_url` | string \| null | Twitter/X URL |
| `github_url` | string \| null | GitHub repository URL |
| `linkedin_url` | string \| null | LinkedIn URL |
| `image_url` | string \| null | Full-size project banner image URL |
| `image_thumb_url` | string \| null | Thumbnail image URL (falls back to `image_url` if not available) |
| `rating` | number \| null | Average rating (1-5 stars) |
| `funding_total` | number \| null | Total funding received in USDC |
| `created_at` | string | ISO 8601 timestamp of project creation |
| `project_url` | string | Full URL to view project on Arc Index |

## Examples

### Basic Request

```bash
curl https://arcindex.xyz/api/public/projects
```

### With API Key

```bash
curl -H "x-api-key: YOUR_API_KEY" https://arcindex.xyz/api/public/projects
```

### Filter by Category

```bash
curl "https://arcindex.xyz/api/public/projects?category=DeFi"
```

### Pagination

```bash
# First page (50 projects)
curl "https://arcindex.xyz/api/public/projects?limit=50&offset=0"

# Second page
curl "https://arcindex.xyz/api/public/projects?limit=50&offset=50"
```

### JavaScript/TypeScript Example

```typescript
async function fetchProjects(category?: string) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  params.set('limit', '50');
  
  const response = await fetch(
    `https://arcindex.xyz/api/public/projects?${params}`,
    {
      headers: {
        'x-api-key': 'YOUR_API_KEY', // Optional if API key is configured
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch projects');
  }
  
  const data = await response.json();
  return data.data; // Array of projects
}
```

## CORS

The API includes CORS headers to allow cross-origin requests:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, x-api-key, Authorization`

## Caching

The API response includes cache headers:
- `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`

This means responses are cached for 60 seconds, with stale content served for up to 300 seconds while revalidating.

## Rate Limiting

Currently, there is no rate limiting implemented. However, please use the API responsibly. If you need higher rate limits, contact the Arc Index team.

## Notes

- Only **Approved** projects are returned
- Projects are ordered by creation date (newest first)
- Deleted projects are automatically excluded
- The `description` field contains the short description (max 400 characters), not the full description
- Image URLs are absolute URLs pointing to Supabase Storage
- All URLs in the response are absolute URLs

