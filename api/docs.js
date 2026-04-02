/**
 * api/docs.js
 * Vercel serverless function — serves an OpenAPI 3.0 specification documenting
 * all API endpoints of the Stremio Addon Manager.
 *
 * GET only, public (no auth required).
 */

const { setSecurityHeaders } = require('../lib/securityHeaders');
const { setPublicCors } = require('../lib/cors');

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Stremio Addon Manager API',
    version: '1.0.0',
    description:
      'API for managing your Stremio addon collection. Supports fetching, saving, reordering, ' +
      'importing, comparing, and profile-based management of addons.',
    contact: {
      name: 'Addon Manager',
      url: 'https://github.com/stremio/addon-manager',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: '/',
      description: 'Same origin (Vercel deployment)',
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'stremio_session',
        description:
          'Session cookie set automatically after login or when setting an auth key. ' +
          'Contains an HMAC-signed token with the user\'s Stremio auth key.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['ok', 'error'],
        properties: {
          ok: { type: 'boolean', example: false },
          error: { type: 'string', example: 'No active session found.' },
        },
      },
      SuccessResponse: {
        type: 'object',
        required: ['ok'],
        properties: {
          ok: { type: 'boolean', example: true },
        },
      },
      Addon: {
        type: 'object',
        required: ['transportUrl'],
        properties: {
          transportUrl: {
            type: 'string',
            format: 'uri',
            example: 'https://opensubtitles.strem.io',
            description: 'Base URL of the addon server.',
          },
          transportName: {
            type: 'string',
            example: 'http',
            description: 'Transport protocol name.',
          },
          manifest: {
            type: 'object',
            description: 'The addon manifest as served by the addon server.',
            properties: {
              id: { type: 'string', example: 'community.opensubtitles' },
              name: { type: 'string', example: 'OpenSubtitles' },
              version: { type: 'string', example: '1.0.0' },
              description: { type: 'string' },
              resources: {
                type: 'array',
                items: { type: 'string' },
                example: ['subtitles'],
              },
              types: {
                type: 'array',
                items: { type: 'string' },
                example: ['movie', 'series'],
              },
              catalogs: { type: 'array', items: { type: 'object' } },
              logo: { type: 'string', format: 'uri' },
              behaviorHints: { type: 'object' },
            },
          },
        },
      },

    },
  },
  paths: {
    // ── Public Endpoints ───────────────────────────────────────────────
    '/manifest.json': {
      get: {
        summary: 'Stremio Addon Manifest',
        description: 'Returns the Stremio addon manifest. Called by the Stremio client to discover this addon.',
        operationId: 'getManifest',
        tags: ['Public'],
        responses: {
          '200': {
            description: 'Addon manifest JSON.',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/configure': {
      get: {
        summary: 'Configure Page',
        description: 'Serves the interactive HTML configure page for managing addons.',
        operationId: 'getConfigure',
        tags: ['Public'],
        responses: {
          '200': { description: 'HTML configure page.' },
        },
      },
    },
    '/api/health': {
      get: {
        summary: 'Health Check',
        description: 'Returns the API health status and environment info.',
        operationId: 'getHealth',
        tags: ['Public'],
        responses: {
          '200': {
            description: 'Health status.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    environment: { type: 'string', example: 'vercel' },
                    message: { type: 'string', example: 'API is running correctly.' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Authentication ─────────────────────────────────────────────────
    '/api/login': {
      post: {
        summary: 'Login with Email/Password',
        description:
          'Authenticates against Stremio\'s cloud API and sets a session cookie. ' +
          'Set `logout: true` in the body to clear the session.',
        operationId: 'login',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                      email: { type: 'string', format: 'email', example: 'user@example.com' },
                      password: { type: 'string', example: 'mypassword' },
                    },
                  },
                  {
                    type: 'object',
                    required: ['logout'],
                    properties: {
                      logout: { type: 'boolean', example: true },
                    },
                  },
                ],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          '401': {
            description: 'Invalid credentials.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '429': {
            description: 'Rate limited.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/session': {
      post: {
        summary: 'Set Auth Key Session',
        description:
          'Creates a session from a manually pasted Stremio auth key. Validates the key ' +
          'against the Stremio cloud API before issuing a cookie. Set `logout: true` to clear.',
        operationId: 'setSession',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  {
                    type: 'object',
                    required: ['authKey'],
                    properties: {
                      authKey: {
                        type: 'string',
                        example: 'eyJhbGciOiJIUzI1NiIs...',
                        description: 'Stremio auth key from Settings > Advanced.',
                      },
                    },
                  },
                  {
                    type: 'object',
                    required: ['logout'],
                    properties: { logout: { type: 'boolean', example: true } },
                  },
                ],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Session set.' },
          '400': { description: 'Missing authKey.' },
          '401': { description: 'Invalid auth key.' },
          '429': { description: 'Rate limited.' },
        },
      },
    },

    // ── Addon Collection CRUD ─────────────────────────────────────────
    '/api/addons/get': {
      post: {
        summary: 'Get Addon Collection',
        description: 'Fetches the user\'s current addon collection from the Stremio cloud.',
        operationId: 'getAddons',
        tags: ['Addons'],
        security: [{ cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Addon collection.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['ok', 'addons'],
                  properties: {
                    ok: { type: 'boolean', example: true },
                    addons: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Addon' },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'No active session.' },
          '500': { description: 'Failed to fetch addons.' },
        },
      },
    },
    '/api/addons/set': {
      post: {
        summary: 'Save Addon Collection',
        description:
          'Saves the user\'s addon collection to the Stremio cloud. Supports optional ' +
          'gzip/brotli compression for large collections.',
        operationId: 'setAddons',
        tags: ['Addons'],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['addons'],
                properties: {
                  addons: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Addon' },
                    maxItems: 500,
                    description: 'Ordered array of addon objects.',
                  },
                  compressedAddons: {
                    type: 'string',
                    format: 'byte',
                    description: 'Base64-encoded gzip or brotli compressed JSON of the addons array.',
                  },
                  compression: {
                    type: 'string',
                    enum: ['gzip', 'br'],
                    description: 'Compression algorithm used for compressedAddons.',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Collection saved.' },
          '400': { description: 'Invalid addon data.' },
          '401': { description: 'No active session.' },
          '429': { description: 'Rate limited.' },
          '500': { description: 'Failed to save addons.' },
        },
      },
    },
    '/api/addons/check-links': {
      post: {
        summary: 'Check Addon Health',
        description:
          'Pings every addon\'s transportUrl with a HEAD request (with concurrency limit) ' +
          'and returns the health status of each addon.',
        operationId: 'checkLinks',
        tags: ['Addons'],
        security: [{ cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Health check results.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    checks: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          url: { type: 'string' },
                          ok: { type: 'boolean' },
                          status: { type: 'integer', nullable: true },
                          skipped: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'No active session.' },
          '429': { description: 'Rate limited.' },
          '500': { description: 'Health check failed.' },
        },
      },
    },

    // ── New Phase 2 Endpoints ─────────────────────────────────────────
    '/api/addons/diff': {
      post: {
        summary: 'Diff Addon Collections',
        description:
          'Compares two versions of an addon collection and returns the differences. ' +
          'If `oldAddons` is not provided, the current cloud state is used as the baseline.',
        operationId: 'diffAddons',
        tags: ['Addons'],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  oldAddons: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Addon' },
                    description:
                      'Previous addon collection. If omitted, fetched from cloud as baseline.',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Diff result.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['ok', 'added', 'removed', 'reordered', 'unchanged'],
                  properties: {
                    ok: { type: 'boolean', example: true },
                    added: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Addon' },
                      description: 'Addons present in the new collection but not the old.',
                    },
                    removed: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Addon' },
                      description: 'Addons present in the old collection but not the new.',
                    },
                    reordered: {
                      type: 'boolean',
                      description: 'Whether the common addons changed order.',
                    },
                    unchanged: {
                      type: 'boolean',
                      description: 'True if the collections are identical.',
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'No active session.' },
          '429': { description: 'Rate limited.' },
          '500': { description: 'Diff comparison failed.' },
        },
      },
    },
    '/api/addons/import': {
      post: {
        summary: 'Batch Import Addons',
        description:
          'Batch imports addons from a list of manifest URLs. Fetches each manifest, ' +
          'validates it, and merges the new addons into the existing cloud collection ' +
          '(no duplicates by transportUrl).',
        operationId: 'importAddons',
        tags: ['Addons'],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['urls'],
                properties: {
                  urls: {
                    type: 'array',
                    items: { type: 'string', format: 'uri' },
                    maxItems: 50,
                    description: 'Array of addon manifest base URLs (http/https).',
                    example: ['https://opensubtitles.strem.io', 'https://torrentio.strem.fun'],
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Import result.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['ok', 'imported', 'failed'],
                  properties: {
                    ok: { type: 'boolean', example: true },
                    imported: {
                      type: 'integer',
                      example: 3,
                      description: 'Number of successfully imported addons.',
                    },
                    failed: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          url: { type: 'string' },
                          error: { type: 'string' },
                        },
                      },
                      description: 'List of URLs that failed with error reasons.',
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid URLs or array too large.' },
          '401': { description: 'No active session.' },
          '429': { description: 'Rate limited.' },
          '500': { description: 'Import failed.' },
        },
      },
    },
    '/api/collections': {
      post: {
        summary: 'Collection Profiles',
        description:
          'Manages named collection profiles. Supports list, save, load, and delete actions. ' +
          'Profiles are scoped to the authenticated user.',
        operationId: 'manageCollections',
        tags: ['Collections'],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  {
                    type: 'object',
                    required: ['action'],
                    properties: {
                      action: { type: 'string', enum: ['list'], example: 'list' },
                    },
                  },
                  {
                    type: 'object',
                    required: ['action', 'name', 'addons'],
                    properties: {
                      action: { type: 'string', enum: ['save'], example: 'save' },
                      name: { type: 'string', example: 'My Movies Setup' },
                      addons: { type: 'array', items: { $ref: '#/components/schemas/Addon' } },
                    },
                  },
                  {
                    type: 'object',
                    required: ['action', 'name'],
                    properties: {
                      action: { type: 'string', enum: ['load', 'delete'], example: 'load' },
                      name: { type: 'string', example: 'My Movies Setup' },
                    },
                  },
                ],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Action result.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    profiles: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Profile names (list action).',
                    },
                    addons: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Addon' },
                      description: 'Loaded addons (load action).',
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid action or profile name.' },
          '401': { description: 'No active session.' },
          '404': { description: 'Profile not found.' },
          '429': { description: 'Rate limited.' },
          '500': { description: 'Operation failed.' },
        },
      },
    },
    '/api/docs': {
      get: {
        summary: 'API Documentation (OpenAPI)',
        description:
          'Returns this OpenAPI 3.0 specification as JSON. Can be imported into Swagger UI, ' +
          'Redoc, or any OpenAPI-compatible tool.',
        operationId: 'getDocs',
        tags: ['Documentation'],
        responses: {
          '200': {
            description: 'OpenAPI 3.0 specification.',
            content: { 'application/json': {} },
          },
        },
      },
    },
  },
  tags: [
    { name: 'Public', description: 'Public endpoints — no authentication required.' },
    { name: 'Authentication', description: 'Login and session management.' },
    { name: 'Addons', description: 'Addon collection CRUD and utilities.' },
    { name: 'Collections', description: 'Named collection profile management.' },
    { name: 'Documentation', description: 'API documentation.' },
  ],
};

module.exports = (req, res) => {
  setSecurityHeaders(res);
  setPublicCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(openApiSpec);
};
