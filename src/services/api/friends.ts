import { supabase } from '../supabase';

export interface FriendProfile {
  id: string;
  display_name: string;
  avatar_url: string;
  total_points: number;
}

export interface Friendship {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  created_at: string;
}

// Поиск пользователей по имени
export const searchUsers = async (query: string): Promise<FriendProfile[]> => {
  if (!query || query.trim() === '') return [];
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, total_points')
    .ilike('display_name', `%${query}%`)
    .neq('id', user.id) // Не ищем себя
    .limit(10);
    
  if (error) {
    console.error('SEARCH_USERS_ERROR:', error);
    return [];
  }
  return data || [];
};

// Отправить заявку в друзья
export const sendFriendRequest = async (receiverId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('friendships')
    .insert({
      requester_id: user.id,
      receiver_id: receiverId,
      status: 'PENDING'
    });

  if (error) {
    console.error('SEND_REQUEST_ERROR:', error);
    throw error;
  }
};

// Принять или отклонить заявку в друзья
export const respondToRequest = async (friendshipId: string, status: 'ACCEPTED' | 'DECLINED') => {
  const { error } = await supabase
    .from('friendships')
    .update({ status })
    .eq('id', friendshipId);

  if (error) {
    console.error('RESPOND_ERROR:', error);
    throw error;
  }
};

// Получить все связи пользователя (друзья и заявки)
export const fetchFriendships = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Получаем сами связи (где мы отправитель ИЛИ получатель)
  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

  if (error) {
    console.error('FETCH_FRIENDSHIPS_ERROR:', error);
    return { friends: [], requestsReceived: [], requestsSent: [] };
  }

  // Собираем все ID профилей, которые нам понадобятся
  const profileIdsToFetch = new Set<string>();
  friendships?.forEach(f => {
      if (f.requester_id !== user.id) profileIdsToFetch.add(f.requester_id);
      if (f.receiver_id !== user.id) profileIdsToFetch.add(f.receiver_id);
  });

  // Получаем профили пользователей пачкой
  let profilesRow: FriendProfile[] = [];
  if (profileIdsToFetch.size > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, total_points')
        .in('id', Array.from(profileIdsToFetch));
      if (profs) profilesRow = profs;
  }

  const profileMap = new Map<string, FriendProfile>();
  profilesRow.forEach(p => profileMap.set(p.id, p));

  // Для каждого принятого друга получаем количество непрочитанных сообщений
  const friends: any[] = [];
  
  if (friendships) {
      // Собираем все ID друзей для пачного запроса счетчиков
      const acceptedFriendIds = friendships
          .filter(f => f.status === 'ACCEPTED')
          .map(f => f.requester_id === user.id ? f.receiver_id : f.requester_id);

      // Получаем количество непрочитанных сообщений от каждого друга
      const { data: unreadCounts, error: countError } = await supabase
          .from('messages')
          .select('sender_id, receiver_id, is_read')
          .eq('receiver_id', user.id)
          .eq('is_read', false);

      if (countError) console.error('❌ Error fetching unread counts:', countError);
      
      const countMap = new Map<string, number>();
      unreadCounts?.forEach(msg => {
          countMap.set(msg.sender_id, (countMap.get(msg.sender_id) || 0) + 1);
      });

      console.log(`📊 Unread counts for ${user.id}:`, Array.from(countMap.entries()));

      friendships.forEach(f => {
          if (f.status === 'ACCEPTED') {
              const friendId = f.requester_id === user.id ? f.receiver_id : f.requester_id;
              if (profileMap.has(friendId)) {
                  friends.push({ 
                      friendshipId: f.id, 
                      profile: profileMap.get(friendId),
                      unreadCount: countMap.get(friendId) || 0
                  });
              }
          }
      });
  }

  const requestsReceived: any[] = [];
  const requestsSent: any[] = [];

  friendships?.forEach(f => {
      if (f.status === 'PENDING') {
          if (f.receiver_id === user.id) {
              requestsReceived.push({ friendshipId: f.id, profile: profileMap.get(f.requester_id) });
          } else {
              requestsSent.push({ friendshipId: f.id, receiverId: f.receiver_id });
          }
      }
  });

  return { friends, requestsReceived, requestsSent };
};
