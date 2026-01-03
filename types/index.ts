export type Profile = {
    id: string
    email: string
    full_name: string
    avatar_url: string
    role: 'admin' | 'user'
    status: 'pending' | 'active'
    total_deposit: number
    fine_amount: number
}

export type Transaction = {
    id: string
    user_id: string
    amount: number
    type: 'monthly' | 'fine'
    month: string
    is_approved: boolean
    user?: Profile // Joined data
    created_at: string
}

export type Notice = {
    id: string
    title: string
    content: string
    created_at: string
}
