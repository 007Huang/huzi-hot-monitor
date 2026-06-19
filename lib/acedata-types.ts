/** Acedata.cloud aichat2 API 响应类型 */

export interface AichatConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AichatConversationChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason?: string;
}

export interface AichatConversationUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface AichatConversationResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: AichatConversationChoice[];
  usage?: AichatConversationUsage;
  data?: {
    choices?: AichatConversationChoice[];
  };
}