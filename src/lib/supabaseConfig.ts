import { useAuth } from '@clerk/clerk-expo';
import { createClient } from '@supabase/supabase-js';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export function useSupabaseClient() {
    const { getToken } = useAuth();

    return useMemo(() => {
        // Safe initialization for Expo Web Static Export (SSR)
        const isWebSSR = Platform.OS === 'web' && typeof window === 'undefined';

        const options: any = {
            global: {
                fetch: async (url: any, options: any = {}) => {
                    if (isWebSSR) return fetch(url, options); // Simple fetch for SSR

                    const getAuthToken = async (forceRefresh: boolean) => {
                        try {
                            return await getToken({
                                template: 'supabase',
                                ...(forceRefresh ? { skipCache: true } : {}),
                            });
                        } catch {
                            return null;
                        }
                    };

                    const token = await getAuthToken(false);

                    // 1. Start with base headers
                    const headers: any = {
                        'apikey': supabaseAnonKey,
                        'x-client-info': 'supabase-js-react-native',
                    };

                    // 2. Merge headers from the supabase-js request
                    if (options.headers) {
                        if (typeof (options.headers as any).forEach === 'function') {
                            (options.headers as any).forEach((value: string, key: string) => {
                                headers[key] = value;
                            });
                        } else {
                            Object.assign(headers, options.headers);
                        }
                    }

                    // 3. FORCE the Clerk token (Must overwrite BOTH 'Authorization' and 'authorization')
                    if (token) {
                        delete headers['Authorization'];
                        delete headers['authorization'];
                        headers['Authorization'] = `Bearer ${token}`;
                    }

                    // 4. Sanitize headers (remove undefined/null/empty) to prevent "Network request failed"
                    // Also remove 'apikey' if we have an Authorization header (optional but cleaner)
                    Object.keys(headers).forEach(key => {
                        if (headers[key] === undefined || headers[key] === null || headers[key] === '') {
                            delete headers[key];
                        }
                    });

                    // For database calls (PostgREST), ensure Content-Type is correct if not already set
                    // But ONLY if the body is a string (JSON). For Blobs (storage), don't force it.
                    const hasContentType = headers['Content-Type'] || headers['content-type'];
                    if (!hasContentType && options.body && typeof options.body === 'string') {
                        headers['Content-Type'] = 'application/json';
                    }

                    const urlString = typeof url === 'string' ? url : (url as Request).url || url.toString();
                    if (urlString.includes('storage/v1')) {
                        console.log(`[Supabase Fetch] Storage Request: ${urlString}`);
                        console.log(`[Supabase Fetch] Headers:`, JSON.stringify(headers, null, 2));
                        console.log(`[Supabase Fetch] Body Type:`, options.body ? typeof options.body : 'none');
                    }

                    const doFetch = async (overrideHeaders?: any) => fetch(url, {
                        ...options,
                        headers: overrideHeaders || headers,
                    });

                    const response = await doFetch();

                    // Retry once with a refreshed token if we hit auth errors
                    if ((response.status === 401 || response.status === 403) && token) {
                        const refreshedToken = await getAuthToken(true);
                        if (refreshedToken && refreshedToken !== token) {
                            const retryHeaders = { ...headers, Authorization: `Bearer ${refreshedToken}` };
                            return doFetch(retryHeaders);
                        }
                    }

                    return response;
                },
            },
        };

        if (isWebSSR) {
            options.auth = { persistSession: false };
        }

        return createClient(supabaseUrl, supabaseAnonKey, options);
    }, []);
}
