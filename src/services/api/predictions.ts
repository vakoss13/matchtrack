import { supabase } from '../supabase';

export interface SavePredictionParams {
  match_id: string;
  match_name: string;
  prediction: string; // "2:1", "0:0", etc.
  home_crest?: string;
  away_crest?: string;
  match_date?: string; 
  odds?: number;
}

export const savePrediction = async (params: SavePredictionParams) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const enrichedMatchName = `${params.match_name}|${params.home_crest || ''}|${params.away_crest || ''}|${params.match_date || ''}`;

  const { data, error } = await supabase
    .from('predictions')
    .insert({
      user_id: user.id,
      match_id: params.match_id,
      match_name: enrichedMatchName, 
      prediction: params.prediction,
      odds: params.odds || 1.0,
      status: 'PENDING'
    });

  if (error && error.code === '23503') {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: user.id }, { onConflict: 'id' });
      
    if (!profileError) {
      const { data: retryData, error: retryError } = await supabase
        .from('predictions')
        .insert({
          user_id: user.id,
          match_id: params.match_id,
          match_name: enrichedMatchName,
          prediction: params.prediction,
          odds: params.odds || 1.0,
          status: 'PENDING'
        });
        
      if (retryError) throw retryError;
      return retryData;
    } else {
      throw new Error(`Ошибка базы данных: профиль не найден`);
    }
  }

  if (error) throw error;
  return data;
};

// Функция удаления прогноза (с проверкой user_id для надежности)
export const deletePrediction = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('predictions')
        .delete()
        .match({ id, user_id: user.id }); // Проверяем и ID, и владельца
        
    if (error) {
        console.error('DELETE_ERROR:', error);
        throw error;
    }
};

// Функция обновления прогноза (с проверкой user_id для надежности)
export const updatePrediction = async (id: string, newScore: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('predictions')
        .update({ prediction: newScore })
        .match({ id, user_id: user.id });
        
    if (error) {
        console.error('UPDATE_ERROR:', error);
        throw error;
    }
};

export const fetchUserPredictions = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};