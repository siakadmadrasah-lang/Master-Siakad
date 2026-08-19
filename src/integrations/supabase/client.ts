export function getMysqlApiUrl(): string {
  if (typeof window === 'undefined') return '/api.php';
  if ((window as any).__ENV_MYSQL_API_URL__) return (window as any).__ENV_MYSQL_API_URL__;

  try {
    const keysRaw = localStorage.getItem('siakad_api_keys');
    if (keysRaw) {
      const parsed = JSON.parse(keysRaw);
      if (parsed && parsed.mysql_api_url && typeof parsed.mysql_api_url === 'string' && parsed.mysql_api_url.trim()) {
        return parsed.mysql_api_url.trim();
      }
    }
  } catch (e) { void e; }

  try {
    const configRaw = localStorage.getItem('siakad_mysql_config');
    if (configRaw) {
      const parsed = JSON.parse(configRaw);
      if (parsed && parsed.api_url && typeof parsed.api_url === 'string' && parsed.api_url.trim()) {
        return parsed.api_url.trim();
      }
    }
  } catch (e) { void e; }

  return '/api.php';
}

// Dynamic fetch helper for MySQL API URL
function getTargetApiUrl(): string {
  return getMysqlApiUrl();
}

// Memory & LocalStorage Cache Engine for Offline-First Hybrid Operation
const memoryCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL_MS = 30000; // 30 detik TTL

function getLocalStoredSetting(id: string) {
  try {
    const raw = localStorage.getItem('siakad_site_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed[id] !== undefined) {
        return { id, value: parsed[id], updated_at: new Date().toISOString() };
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function setLocalStoredSetting(id: string, value: any) {
  try {
    const raw = localStorage.getItem('siakad_site_settings');
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[id] = value;
    localStorage.setItem('siakad_site_settings', JSON.stringify(parsed));
  } catch (e) {
    // ignore
  }
}

function createHybridClient() {
  return {
    from: (tableName: string) => {
      let targetId: string | null = null;
      let targetIds: string[] | null = null;
      let isDelete = false;
      let orderCol: string | null = null;
      let isAscending = true;

      const getCacheKey = () => `${tableName}:${targetId || (targetIds ? targetIds.join(',') : 'ALL')}`;

      const builder: any = {
        select: (cols?: string) => builder,
        eq: (col: string, val: any) => {
          if (col === 'id') targetId = String(val);
          return builder;
        },
        in: (col: string, vals: any[]) => {
          if (col === 'id' && Array.isArray(vals)) {
            targetIds = vals.map(v => String(v));
          }
          return builder;
        },
        neq: (col: string, val: any) => builder,
        is: (col: string, val: any) => builder,
        contains: (col: string, val: any) => builder,
        ilike: (col: string, val: any) => builder,
        like: (col: string, val: any) => builder,
        or: (filter: string) => builder,
        and: (filter: string) => builder,
        gte: (col: string, val: any) => builder,
        lte: (col: string, val: any) => builder,
        gt: (col: string, val: any) => builder,
        lt: (col: string, val: any) => builder,
        order: (col: string, opts?: { ascending?: boolean }) => {
          orderCol = col;
          isAscending = opts?.ascending ?? true;
          return builder;
        },
        limit: (n: number) => builder,
        delete: () => {
          isDelete = true;
          return builder;
        },
        single: async () => builder.maybeSingle(),
        maybeSingle: async () => {
          const cacheKey = getCacheKey();
          
          // 1. Try MySQL PHP API bridge first so cross-browser updates are always fetched from MySQL
          try {
            const apiUrl = getTargetApiUrl();
            const url = targetId 
              ? `${apiUrl}?action=select&table=${tableName}&id=${encodeURIComponent(targetId)}`
              : `${apiUrl}?action=select&table=${tableName}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
              const json = await res.json();
              if (json && json.data && !json.error) {
                memoryCache[cacheKey] = { data: json.data, timestamp: Date.now() };
                if (targetId && tableName === 'site_settings' && json.data.value !== undefined) {
                  setLocalStoredSetting(targetId, json.data.value);
                }
                return { data: json.data, error: null };
              }
            }
          } catch (e) {
            // MySQL API offline or timeout
          }

          // 2. Local Storage / Memory Fallback if MySQL offline or unavailable
          if (targetId && tableName === 'site_settings') {
            const localVal = getLocalStoredSetting(targetId);
            if (localVal) {
              return { data: localVal, error: null };
            }
          }

          const cached = memoryCache[cacheKey];
          return { data: cached ? cached.data : null, error: null };
        },
        then: async (resolve: any, reject?: any) => {
          if (isDelete) {
            const idsToDelete = targetIds ? targetIds : (targetId ? [targetId] : []);
            idsToDelete.forEach(id => {
              delete memoryCache[`${tableName}:${id}`];
            });
            delete memoryCache[`${tableName}:ALL`];

            if (tableName === 'site_settings') {
              try {
                const raw = localStorage.getItem('siakad_site_settings');
                if (raw) {
                  const parsed = JSON.parse(raw);
                  idsToDelete.forEach(id => { delete parsed[id]; });
                  localStorage.setItem('siakad_site_settings', JSON.stringify(parsed));
                }
              } catch (e) {
                // ignore
              }
            }

            try {
              const apiUrl = getTargetApiUrl();
              for (const id of idsToDelete) {
                await fetch(`${apiUrl}?action=delete&table=${tableName}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
              }
            } catch (e) {
              // ignore
            }

            const delResult = { data: true, error: null };
            return resolve ? resolve(delResult) : delResult;
          }

          const cacheKey = getCacheKey();
          
          // 1. Try MySQL API bridge first to pull live database changes across browsers
          try {
            const apiUrl = getTargetApiUrl();
            const url = targetId 
              ? `${apiUrl}?action=select&table=${tableName}&id=${encodeURIComponent(targetId)}`
              : `${apiUrl}?action=select&table=${tableName}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
              const json = await res.json();
              if (json && json.data && !json.error) {
                let listData = Array.isArray(json.data) ? json.data : [json.data];
                memoryCache[cacheKey] = { data: listData, timestamp: Date.now() };
                
                // Cache site settings locally
                if (tableName === 'site_settings' && Array.isArray(listData)) {
                  listData.forEach((row: any) => {
                    if (row.id && row.value !== undefined) setLocalStoredSetting(row.id, row.value);
                  });
                }

                if (targetIds && targetIds.length > 0) {
                  listData = listData.filter((item: any) => targetIds!.includes(String(item.id)));
                } else if (targetId) {
                  listData = listData.filter((item: any) => String(item.id) === targetId);
                }

                const result = { data: listData, error: null };
                return resolve ? resolve(result) : result;
              }
            }
          } catch (e) {
            // MySQL API error/offline, fallback smoothly
          }

          // 2. Memory cache fallback
          const cached = memoryCache[cacheKey];
          if (cached) {
            let resultList = Array.isArray(cached.data) ? cached.data : (cached.data ? [cached.data] : []);
            if (targetIds && targetIds.length > 0) {
              resultList = resultList.filter((item: any) => targetIds!.includes(String(item.id)));
            } else if (targetId) {
              resultList = resultList.filter((item: any) => String(item.id) === targetId);
            }
            const cachedResult = { data: resultList, error: null };
            return resolve ? resolve(cachedResult) : cachedResult;
          }

          // 3. Fallback to Local Storage for site_settings
          if (tableName === 'site_settings') {
            try {
              const raw = localStorage.getItem('siakad_site_settings');
              if (raw) {
                const parsed = JSON.parse(raw);
                let list = Object.keys(parsed).map(key => ({
                  id: key,
                  value: parsed[key],
                  updated_at: new Date().toISOString()
                }));
                if (targetIds && targetIds.length > 0) {
                  const idSet = new Set(targetIds);
                  list = list.filter(item => idSet.has(item.id));
                } else if (targetId) {
                  list = list.filter(item => item.id === targetId);
                }
                const result = { data: list, error: null };
                return resolve ? resolve(result) : result;
              }
            } catch (e) {
              // ignore
            }
          }

          const emptyResult = { data: [], error: null };
          return resolve ? resolve(emptyResult) : emptyResult;
        },
        upsert: async (payload: any) => {
          const payloadArr = Array.isArray(payload) ? payload : [payload];
          
          // Instantly update LocalStorage cache for 0ms lag
          payloadArr.forEach((item: any) => {
            if (tableName === 'site_settings' && item.id) {
              setLocalStoredSetting(item.id, item.value);
            }
            delete memoryCache[`${tableName}:${item.id || 'ALL'}`];
          });
          delete memoryCache[`${tableName}:ALL`];

          // 1. Try MySQL PHP API Bridge
          try {
            const apiUrl = getTargetApiUrl();
            const res = await fetch(`${apiUrl}?action=upsert&table=${tableName}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (res.ok) {
              const json = await res.json();
              return { data: json.data || payload, error: null };
            }
          } catch (e) {
            // MySQL API offline
          }

          // Always return success via Local Storage!
          return { data: payload, error: null };
        },
        insert: async (payload: any) => builder.upsert(payload)
      };

      return builder;
    },
    channel: (name: string) => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {}
    }),
    removeChannel: () => {},
    storage: {
      from: (bucket: string) => ({
        upload: async (filePath: string, file: any, options?: any) => {
          const targetApiUrl = getMysqlApiUrl();
          
          // 1. Upload file via FormData to api.php?action=upload
          try {
            const formData = new FormData();
            const fileName = filePath.split('/').pop() || 'upload.jpg';
            formData.append('file', file, fileName);
            formData.append('filePath', filePath);

            const res = await fetch(`${targetApiUrl}?action=upload`, {
              method: 'POST',
              body: formData
            });

            if (res.ok) {
              const contentType = res.headers.get('content-type') || '';
              if (contentType.includes('application/json')) {
                const json = await res.json();
                if (json && (json.publicUrl || json.fullUrl || json.relativePath)) {
                  let normUrl = json.publicUrl || json.fullUrl || json.relativePath;
                  if (!normUrl.startsWith('http://') && !normUrl.startsWith('https://') && !normUrl.startsWith('data:') && !normUrl.startsWith('/') && !normUrl.startsWith('//')) {
                    normUrl = '/' + normUrl;
                  }
                  try {
                    localStorage.setItem(`siakad_file_${filePath}`, normUrl);
                    if (json.path) {
                      const normPath = json.path.startsWith('/') ? json.path : '/' + json.path;
                      localStorage.setItem(`siakad_file_${json.path}`, normUrl);
                      localStorage.setItem(`siakad_file_${normPath}`, normUrl);
                    }
                  } catch (e) { void e; }

                  return { data: { path: normUrl, publicUrl: normUrl }, error: null };
                }
              }
            }
          } catch (e: any) {
            console.warn('MySQL upload bridge error:', e);
          }

          // 2. Secondary Upload Fallback: Base64
          try {
            if (file && typeof FileReader !== 'undefined') {
              const base64Data = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  let resStr = reader.result as string;
                  if (resStr && typeof resStr === 'string' && resStr.startsWith('data:')) {
                    if (resStr.startsWith('data:;base64,') || resStr.startsWith('data:application/octet-stream;base64,')) {
                      const mime = (file as any)?.type || 'image/jpeg';
                      resStr = resStr.replace(/^data:[^;]*;/, `data:${mime};`);
                    }
                    resolve(resStr);
                  } else {
                    resolve('');
                  }
                };
                reader.onerror = () => resolve('');
                reader.readAsDataURL(file);
              });

              if (base64Data) {
                // Check if target API accepts JSON payload
                try {
                  const res = await fetch(`${targetApiUrl}?action=upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64: base64Data, filePath })
                  });

                  if (res.ok) {
                    const contentType = res.headers.get('content-type') || '';
                    if (contentType.includes('application/json')) {
                      const json = await res.json();
                      if (json && (json.publicUrl || json.fullUrl || json.relativePath)) {
                        let normUrl = json.publicUrl || json.fullUrl || json.relativePath;
                        if (!normUrl.startsWith('http://') && !normUrl.startsWith('https://') && !normUrl.startsWith('data:') && !normUrl.startsWith('/') && !normUrl.startsWith('//')) {
                          normUrl = '/' + normUrl;
                        }
                        try {
                          localStorage.setItem(`siakad_file_${filePath}`, normUrl);
                        } catch (e) { void e; }

                        return { data: { path: normUrl, publicUrl: normUrl }, error: null };
                      }
                    }
                  }
                } catch (e) { void e; }

                // Local Base64 fallback if server upload unreachable
                try {
                  localStorage.setItem(`siakad_file_${filePath}`, base64Data);
                } catch (e) { void e; }
                return { data: { path: base64Data, publicUrl: base64Data }, error: null };
              }
            }
          } catch (e) { void e; }

          const defaultNorm = filePath.startsWith('/') ? filePath : '/' + filePath;
          return { data: { path: defaultNorm, publicUrl: defaultNorm }, error: null };
        },
        getPublicUrl: (filePath: string) => {
          if (!filePath) return { data: { publicUrl: '' } };
          if (filePath.startsWith('data:') || filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('//')) {
            return { data: { publicUrl: filePath } };
          }
          const stored = localStorage.getItem(`siakad_file_${filePath}`);
          if (stored) return { data: { publicUrl: stored } };

          const storedNorm = localStorage.getItem(`siakad_file_/${filePath.replace(/^\/+/, '')}`);
          if (storedNorm) return { data: { publicUrl: storedNorm } };

          if (filePath.startsWith('/')) {
            return { data: { publicUrl: filePath } };
          }

          const cleanPath = filePath.startsWith('uploads/') ? filePath : 'uploads/' + filePath;
          return { data: { publicUrl: '/' + cleanPath } };
        }
      })
    },
    auth: {
      getSession: async () => {
        const savedEmail = localStorage.getItem('siakad_current_user_email');
        if (savedEmail) {
          return {
            data: {
              session: {
                user: { email: savedEmail, id: 'user_local_id' },
                access_token: 'local_token'
              }
            },
            error: null
          };
        }
        return { data: { session: null }, error: null };
      },
      signInWithPassword: async ({ email, password }: any) => {
        localStorage.setItem('siakad_current_user_email', email);
        return {
          data: {
            user: { email, id: 'user_local_id' },
            session: { user: { email, id: 'user_local_id' }, access_token: 'local_token' }
          },
          error: null
        };
      },
      signUp: async ({ email, password }: any) => {
        localStorage.setItem('siakad_current_user_email', email);
        return {
          data: {
            user: { email, id: 'user_local_id' },
            session: { user: { email, id: 'user_local_id' }, access_token: 'local_token' }
          },
          error: null
        };
      },
      signOut: async () => {
        localStorage.removeItem('siakad_current_user_email');
        return { error: null };
      },
      onAuthStateChange: (callback: any) => {
        const savedEmail = localStorage.getItem('siakad_current_user_email');
        if (savedEmail) {
          callback('SIGNED_IN', { user: { email: savedEmail, id: 'user_local_id' } });
        }
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      updateUser: async () => ({ data: { user: {} }, error: null })
    },
    functions: {
      invoke: async (functionName: string, options?: any) => {
        if (functionName === 'ai-chat') {
          const body = options?.body || {};
          const config = body?.config || {};
          
          const geminiKey = config?.gemini_api_key || 
            (typeof window !== 'undefined' && (window as any).__ENV_GEMINI_API_KEY__) || 
            (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

          if (!geminiKey) {
            return {
              data: {
                text: "⚠️ API Key Google Gemini belum dikonfigurasi. Silakan buka menu Admin -> Pengaturan API dan masukkan Gemini API Key Anda agar fitur AI dapat digunakan.",
                toolCalls: []
              },
              error: null
            };
          }

          try {
            const systemPrompt = body?.systemPrompt || 'Anda adalah Asisten AI Si@Kad yang ramah dan cerdas.';
            const userMsg = body?.message || '';
            const history = body?.history || [];

            const contents = [
              { role: 'user', parts: [{ text: systemPrompt }] },
              ...history.map((h: any) => ({
                role: h.role === 'ai' || h.role === 'model' ? 'model' : 'user',
                parts: [{ text: h.content || h.text || '' }]
              })),
              { role: 'user', parts: [{ text: userMsg }] }
            ];

            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
            const apiRes = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents })
            });

            if (apiRes.ok) {
              const resJson = await apiRes.json();
              const replyText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, AI tidak dapat memberikan respon saat ini.';
              return {
                data: {
                  text: replyText,
                  toolCalls: []
                },
                error: null
              };
            } else {
              const errJson = await apiRes.json().catch(() => ({}));
              const errorMsg = errJson?.error?.message || 'Gagal menghubungi server Gemini API.';
              return {
                data: { text: `⚠️ Kendala Gemini API: ${errorMsg}`, toolCalls: [] },
                error: null
              };
            }
          } catch (err: any) {
            return {
              data: { text: `⚠️ Error saat memproses AI: ${err.message || 'Koneksi gagal'}`, toolCalls: [] },
              error: null
            };
          }
        }

        return { data: null, error: null };
      }
    }
  };
}

function fetchAsyncRemoteSelect(tableName: string, targetId: string | null, cacheKey: string) {
  const apiUrl = getTargetApiUrl();
  const url = targetId 
    ? `${apiUrl}?action=select&table=${tableName}&id=${encodeURIComponent(targetId)}`
    : `${apiUrl}?action=select&table=${tableName}`;
  fetch(url)
    .then(r => r.json())
    .then(json => {
      if (json && json.data) {
        memoryCache[cacheKey] = { data: json.data, timestamp: Date.now() };
      }
    })
    .catch(() => {});
}

export const supabase = createHybridClient() as any;
