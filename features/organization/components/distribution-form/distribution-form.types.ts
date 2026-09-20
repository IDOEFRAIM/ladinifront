export interface AllocOption { id: string; seedType: string; remainingQuantity: number; unit: string; zone: { id: string; name: string } | null }
export interface ProducerOption { id: string; businessName: string; userName: string | null; email: string | null; phone: string | null; zone: { id: string; name: string } | null }
export interface MemberOption { userId: string; userName: string | null; email: string | null; orgRole: string }
