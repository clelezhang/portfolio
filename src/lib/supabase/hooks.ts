'use client';

import { useEffect, useState } from 'react';
import { createClient, isSupabaseConfigured } from './client';
import type { User } from '@supabase/supabase-js';
import type { Drawing, UserSettings } from './types';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading, isConfigured: isSupabaseConfigured() };
}

export function useAuth() {
  const signInWithGoogle = async () => {
    const supabase = createClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/draw`,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const supabase = createClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return { signInWithGoogle, signOut, isConfigured: isSupabaseConfigured() };
}

export function useDrawings() {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrawings = async () => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('drawings')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching drawings:', error);
    } else {
      setDrawings(data || []);
    }
    setLoading(false);
  };

  const saveDrawing = async (
    name: string,
    data: Record<string, unknown>,
    thumbnail?: string,
    existingId?: string
  ) => {
    const supabase = createClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (existingId) {
      // Update existing
      const { error } = await supabase
        .from('drawings')
        .update({ name, data, thumbnail, updated_at: new Date().toISOString() } as never)
        .eq('id', existingId);
      if (error) throw error;
    } else {
      // Create new
      const { error } = await supabase
        .from('drawings')
        .insert({ user_id: user.id, name, data, thumbnail } as never);
      if (error) throw error;
    }

    await fetchDrawings();
  };

  const deleteDrawing = async (id: string) => {
    const supabase = createClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.from('drawings').delete().eq('id', id);
    if (error) throw error;
    await fetchDrawings();
  };

  const loadDrawing = async (id: string) => {
    const supabase = createClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('drawings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  };

  useEffect(() => {
    fetchDrawings();
  }, []);

  return { drawings, loading, saveDrawing, deleteDrawing, loadDrawing, refetch: fetchDrawings, isConfigured: isSupabaseConfigured() };
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('Error fetching settings:', error);
    }
    setSettings(data);
    setLoading(false);
  };

  const updateApiKey = async (apiKey: string | null) => {
    const supabase = createClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        anthropic_api_key: apiKey,
        updated_at: new Date().toISOString(),
      } as never);

    if (error) throw error;
    await fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, loading, updateApiKey, refetch: fetchSettings, isConfigured: isSupabaseConfigured() };
}
