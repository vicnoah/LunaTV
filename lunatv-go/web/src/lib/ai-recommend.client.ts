import { api } from '@/api/client'

export async function isAIRecommendFeatureDisabled(): Promise<boolean> {
  try {
    const data = await api.get<{ disabled: boolean }>('/api/ai-recommend/status')
    return data.disabled
  } catch {
    return true
  }
}
