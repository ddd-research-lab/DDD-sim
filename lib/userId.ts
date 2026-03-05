export function getUserId(): string {
    if (typeof window === 'undefined') return '';
    let userId = localStorage.getItem('ddd_solver_userId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
        localStorage.setItem('ddd_solver_userId', userId);
    }
    return userId;
}
