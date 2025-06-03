import { useMutation } from '@tanstack/react-query';

import { APIError, errorCauses, fetchAPI } from '@/api';

export type DocAIAgentReponse = {
  query: string;
  answer: string;
};

export type DocAIAgent = {
  prompt: string;
};

export const docAIAgent = async (
  data: DocAIAgent,
): Promise<DocAIAgentReponse> => {
  const response = await fetchAPI('users/ai-agent/', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
    }),
  });

  if (!response.ok) {
    throw new APIError(
      'Failed to request ai agent',
      await errorCauses(response),
    );
  }

  return response.json() as Promise<DocAIAgentReponse>;
};

export function useDocAIAgent() {
  return useMutation<DocAIAgentReponse, APIError, DocAIAgent>({
    mutationFn: docAIAgent,
  });
}
