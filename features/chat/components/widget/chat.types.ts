export type Role = 'producer' | 'buyer';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  imageUrl?: string;
}
