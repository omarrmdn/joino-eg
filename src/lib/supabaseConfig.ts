import { useAuth } from '@clerk/clerk-expo';
import { createClient } from '@supabase/supabase-js';
import { useMemo } from 'react';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export function useSupabaseClient() {
    const { getToken } = useAuth();

    return useMemo(() => {
        return createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                fetch: async (url, options = {}) => {
                    const token = await getToken({ template: 'supabase' });

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

                    return fetch(url, {
                        ...options,
                        headers,
                    });
                },
            },
        });
    }, []);
}