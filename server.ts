import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Helper to construct headers and query parameters for ManageEngine SupportCenter Plus API requests
function getManageEngineAuth(config: {
  technicianKey?: string;
  authToken?: string;
  oauthAccessToken?: string;
}) {
  const headers: Record<string, string> = {
    'Accept': 'application/v3+json, application/json',
  };

  if (config.oauthAccessToken) {
    headers['Authorization'] = `Zoho-oauthtoken ${config.oauthAccessToken}`;
  } else if (config.technicianKey || config.authToken) {
    const key = config.technicianKey || config.authToken || '';
    headers['authtoken'] = key;
  }

  return { headers, queryParams: {} };
}

// 1. Health check & status
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/manageengine/status', (_req, res) => {
  const envUrl = process.env.MANAGEENGINE_API_URL;
  const envKey = process.env.MANAGEENGINE_TECHNICIAN_KEY;
  const envPortal = process.env.MANAGEENGINE_PORTAL_NAME;
  const envAuthType = process.env.MANAGEENGINE_AUTH_TYPE || 'technician_key';

  res.json({
    configuredInEnv: Boolean(envUrl && (envKey || process.env.MANAGEENGINE_OAUTH_CLIENT_ID)),
    apiUrl: envUrl || 'https://sdpondemand.manageengine.com/api/v3',
    authType: envAuthType,
    portalName: envPortal || '',
    hasTechnicianKey: Boolean(envKey),
    hasOAuthConfig: Boolean(process.env.MANAGEENGINE_OAUTH_CLIENT_ID && process.env.MANAGEENGINE_OAUTH_REFRESH_TOKEN),
  });
});

// 2. Connection Test Endpoint
app.post('/api/manageengine/test-connection', async (req, res) => {
  try {
    const {
      apiUrl = process.env.MANAGEENGINE_API_URL || 'https://sdpondemand.manageengine.com/api/v3',
      technicianKey = process.env.MANAGEENGINE_TECHNICIAN_KEY || '',
      portalName = process.env.MANAGEENGINE_PORTAL_NAME || '',
      authType = process.env.MANAGEENGINE_AUTH_TYPE || 'technician_key',
      oauthClientId = process.env.MANAGEENGINE_OAUTH_CLIENT_ID || '',
      oauthClientSecret = process.env.MANAGEENGINE_OAUTH_CLIENT_SECRET || '',
      oauthRefreshToken = process.env.MANAGEENGINE_OAUTH_REFRESH_TOKEN || '',
      oauthDomain = process.env.MANAGEENGINE_OAUTH_DOMAIN || 'com',
    } = req.body || {};

    let accessToken = '';

    // If OAuth is configured, exchange refresh token for access token
    if (authType === 'oauth2' && oauthClientId && oauthClientSecret && oauthRefreshToken) {
      const tokenUrl = `https://accounts.zoho.${oauthDomain}/oauth/v2/token`;
      const tokenParams = new URLSearchParams({
        refresh_token: oauthRefreshToken,
        client_id: oauthClientId,
        client_secret: oauthClientSecret,
        grant_type: 'refresh_token',
      });

      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });

      const tokenData = await tokenRes.json() as any;
      if (!tokenRes.ok || !tokenData.access_token) {
        return res.status(400).json({
          success: false,
          error: `Error obteniendo OAuth access token de Zoho: ${tokenData.error || tokenRes.statusText}`,
          details: tokenData,
        });
      }
      accessToken = tokenData.access_token;
    }

    // Clean and normalize base API URL
    let cleanUrl = (apiUrl || '').trim().replace(/\/$/, '');
    if (cleanUrl && !cleanUrl.toLowerCase().endsWith('/api/v3')) {
      cleanUrl = `${cleanUrl}/api/v3`;
    }

    const { headers } = getManageEngineAuth({
      technicianKey,
      oauthAccessToken: accessToken,
    });

    const urlParams = new URLSearchParams();
    urlParams.append('input_data', JSON.stringify({
      list_info: { row_count: 5, start_index: 1, sort_field: 'created_time', sort_order: 'desc' }
    }));

    let endpoint = `${cleanUrl}/requests?${urlParams.toString()}`;
    if (portalName) {
      endpoint = `${cleanUrl}/portal/${portalName}/requests?${urlParams.toString()}`;
    }

    const meRes = await fetch(endpoint, {
      method: 'GET',
      headers,
    });

    const statusText = meRes.statusText;
    const responseText = await meRes.text();
    let responseData: any = null;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    if (!meRes.ok) {
      return res.status(meRes.status).json({
        success: false,
        status: meRes.status,
        statusText,
        error: `Conexión rechazada por ManageEngine (${meRes.status} ${statusText})`,
        rawResponse: responseData,
      });
    }

    const requestCount = responseData?.requests?.length ?? 0;

    return res.json({
      success: true,
      message: 'Conexión exitosa con el API de ManageEngine ServiceDesk Plus',
      status: meRes.status,
      apiUrl: cleanUrl,
      portalName,
      authType,
      ticketsFoundInTest: requestCount,
      sampleResponse: responseData,
    });

  } catch (error: any) {
    console.error('Error testing ManageEngine connection:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Error de red o servidor al conectar con ManageEngine',
    });
  }
});

// 3. Fetch Tickets Endpoint (Open/In-Progress or Completed)
app.post('/api/manageengine/fetch-tickets', async (req, res) => {
  try {
    const {
      apiUrl = process.env.MANAGEENGINE_API_URL || 'https://sdpondemand.manageengine.com/api/v3',
      technicianKey = process.env.MANAGEENGINE_TECHNICIAN_KEY || '',
      portalName = process.env.MANAGEENGINE_PORTAL_NAME || '',
      authType = process.env.MANAGEENGINE_AUTH_TYPE || 'technician_key',
      oauthClientId = process.env.MANAGEENGINE_OAUTH_CLIENT_ID || '',
      oauthClientSecret = process.env.MANAGEENGINE_OAUTH_CLIENT_SECRET || '',
      oauthRefreshToken = process.env.MANAGEENGINE_OAUTH_REFRESH_TOKEN || '',
      oauthDomain = process.env.MANAGEENGINE_OAUTH_DOMAIN || 'com',
      viewId = process.env.MANAGEENGINE_VIEW_ID || '637',
      statusFilter = 'open', // 'open', 'completed', 'all'
      rowCount = 200,
      startIndex = 1,
    } = req.body || {};

    let accessToken = '';
    if (authType === 'oauth2' && oauthClientId && oauthClientSecret && oauthRefreshToken) {
      const tokenUrl = `https://accounts.zoho.${oauthDomain}/oauth/v2/token`;
      const tokenParams = new URLSearchParams({
        refresh_token: oauthRefreshToken,
        client_id: oauthClientId,
        client_secret: oauthClientSecret,
        grant_type: 'refresh_token',
      });

      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });

      const tokenData = await tokenRes.json() as any;
      if (tokenRes.ok && tokenData.access_token) {
        accessToken = tokenData.access_token;
      }
    }

    let cleanUrl = (apiUrl || '').trim().replace(/\/$/, '');
    if (cleanUrl && !cleanUrl.toLowerCase().endsWith('/api/v3')) {
      cleanUrl = `${cleanUrl}/api/v3`;
    }

    const { headers } = getManageEngineAuth({
      technicianKey,
      oauthAccessToken: accessToken,
    });

    const activeViewId = req.body?.viewId || (statusFilter === 'open' ? (viewId || '637') : null);

    let rawRequests: any[] = [];
    let currentStartIndex = startIndex;
    let hasMore = true;
    let pagesFetched = 0;
    let lastData: any = null;
    const maxPages = 10; // safety limit (up to 5000 tickets)

    while (hasMore && pagesFetched < maxPages) {
      const listInfo: any = {
        row_count: Math.min(rowCount, 500),
        start_index: currentStartIndex,
        sort_field: 'created_time',
        sort_order: 'desc',
      };

      if (activeViewId) {
        const parsedViewId = Number(activeViewId);
        listInfo.filter_by = { id: isNaN(parsedViewId) ? activeViewId : parsedViewId };
      }

      const urlParams = new URLSearchParams();
      urlParams.append('input_data', JSON.stringify({ list_info: listInfo }));

      let endpoint = `${cleanUrl}/requests?${urlParams.toString()}`;
      if (portalName) {
        endpoint = `${cleanUrl}/portal/${portalName}/requests?${urlParams.toString()}`;
      }

      let meRes = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      // Fallback: If viewId filter returned error (e.g., 404 or 400), try without filter_by
      if (!meRes.ok && activeViewId && listInfo.filter_by) {
        delete listInfo.filter_by;
        const fallbackParams = new URLSearchParams();
        fallbackParams.append('input_data', JSON.stringify({ list_info: listInfo }));
        let fallbackEndpoint = `${cleanUrl}/requests?${fallbackParams.toString()}`;
        if (portalName) {
          fallbackEndpoint = `${cleanUrl}/portal/${portalName}/requests?${fallbackParams.toString()}`;
        }
        const retryRes = await fetch(fallbackEndpoint, { method: 'GET', headers });
        if (retryRes.ok) {
          meRes = retryRes;
        }
      }

      const textResponse = await meRes.text();

      if (!meRes.ok) {
        if (pagesFetched === 0) {
          return res.status(200).json({
            success: false,
            error: `Respuesta no exitosa del servidor ManageEngine (${meRes.status})`,
            details: textResponse.slice(0, 300),
          });
        }
        break;
      }

      let data: any = null;
      try {
        data = JSON.parse(textResponse);
        lastData = data;
      } catch {
        if (pagesFetched === 0) {
          return res.status(400).json({
            success: false,
            error: `La respuesta de ManageEngine no es un JSON válido. Verifique la URL base configurada (${cleanUrl}).`,
            details: textResponse.slice(0, 300),
          });
        }
        break;
      }

      const pageRequests = data?.requests || [];
      rawRequests.push(...pageRequests);

      pagesFetched++;
      hasMore = Boolean(data?.list_info?.has_more_rows);
      if (pageRequests.length === 0 || !hasMore) {
        break;
      }

      currentStartIndex += pageRequests.length;
    }

    // Filter in JS if needed
    if (statusFilter === 'open') {
      rawRequests = rawRequests.filter((r: any) => {
        const sName = (r.status?.name || '').toLowerCase();
        return (
          !sName.includes('cerrad') &&
          !sName.includes('close') &&
          !sName.includes('resuelto') &&
          !sName.includes('resuelta') &&
          !sName.includes('resolved') &&
          !sName.includes('completad') &&
          !sName.includes('solucion') &&
          !sName.includes('finaliz')
        );
      });
    } else if (statusFilter === 'completed') {
      rawRequests = rawRequests.filter((r: any) => {
        const sName = (r.status?.name || '').toLowerCase();
        return (
          sName.includes('cerrad') ||
          sName.includes('close') ||
          sName.includes('resuelto') ||
          sName.includes('resuelta') ||
          sName.includes('resolved') ||
          sName.includes('completad') ||
          sName.includes('realizado') ||
          sName.includes('realizada') ||
          sName.includes('solucion') ||
          sName.includes('finaliz')
        );
      });
    }

    // Map ManageEngine JSON format into app schema
    const formattedTickets = rawRequests.map((reqItem: any) => {
      const getTimeVal = (...timeObjs: any[]) => {
        for (const t of timeObjs) {
          if (t && typeof t === 'object') {
            if (t.display_value) return String(t.display_value);
            if (t.value) {
              const num = Number(t.value);
              if (!isNaN(num) && num > 0) return new Date(num).toLocaleString('en-US');
            }
          } else if (typeof t === 'string' && t.trim()) {
            return t.trim();
          }
        }
        return '';
      };

      const createdDisplay = getTimeVal(reqItem.created_time);
      const resolvedDisplay = getTimeVal(
        reqItem.resolved_time,
        reqItem.completed_time,
        reqItem.closed_time,
        reqItem.last_updated_time,
        reqItem.created_time
      );

      const assignedToObj = reqItem.technician || reqItem.assigned_to || {};
      const assignedToName = typeof assignedToObj === 'object' ? assignedToObj.name || '' : String(assignedToObj);

      const statusObj = reqItem.status || {};
      const statusName = typeof statusObj === 'object' ? statusObj.name || '' : String(statusObj);

      const accountObj = reqItem.account || {};
      const accountName = typeof accountObj === 'object' ? accountObj.name || '' : String(accountObj);

      const requesterObj = reqItem.requester || {};
      const requesterName = typeof requesterObj === 'object' ? requesterObj.name || '' : String(requesterObj);

      const subjectStr = reqItem.subject || reqItem.short_description || '';
      const reqTypeId = reqItem.request_type?.name || reqItem.category?.name || 'Inci';
      const priorityName = reqItem.priority?.name || 'Normal';

      return {
        id: String(reqItem.id || ''),
        ID: String(reqItem.id || ''),
        'ID Requerimiento': String(reqItem.id || ''),
        Subject: subjectStr,
        'Título': subjectStr,
        Account: accountName,
        Contact: requesterName,
        'Assigned To': assignedToName,
        'Asignado': assignedToName,
        'Técnico Asignado': assignedToName,
        Status: statusName,
        'Estado': statusName,
        Priority: priorityName,
        'Prioridad': priorityName,
        'Request Type': reqTypeId,
        'Tipo': reqTypeId,
        'Created Date': createdDisplay,
        'Fecha creación': createdDisplay,
        'Resolved Date': resolvedDisplay,
        'Fecha completado': resolvedDisplay,
        'SLA': reqItem.due_by_time?.display_value || '',
        'sprint_trabajo': reqItem.udf_fields?.udf_sprint || reqItem.sprint || '',
        'Semana Actual': reqItem.udf_fields?.udf_sprint || reqItem.sprint || '',
      };
    });

    return res.json({
      success: true,
      totalCount: lastData?.list_info?.total_count || formattedTickets.length,
      page: startIndex,
      tickets: formattedTickets,
    });

  } catch (error: any) {
    console.error('Error fetching tickets from ManageEngine:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Error interno al consultar ManageEngine',
    });
  }
});

async function startServer() {
  // Vite middleware in development mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
