import { AppInstance, User, CurrencyCode, Category } from "../types";
import { USERS, INITIAL_CATEGORIES, INITIAL_BUDGETS, INITIAL_SAVINGS, INITIAL_ENTRIES, INITIAL_TRIPS, INITIAL_INCOMES } from "../constants";

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

const API_URL = '/api';

// --- ASYNC API OPERATIONS ---

export const checkBackendHealth = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}/health`);
        return response.ok;
    } catch (e) {
        return false;
    }
};

export const getInstances = async (): Promise<{ id: string, name: string, lastAccessed: number }[]> => {
    const response = await fetch(`${API_URL}/instances`);
    if (!response.ok) throw new Error(`Backend Error: ${response.statusText}`);
    return await response.json();
};

export const getInstance = async (id: string): Promise<AppInstance | null> => {
    const response = await fetch(`${API_URL}/instance/${id}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Backend Error: ${response.statusText}`);
    return await response.json();
};

export const saveInstance = async (instance: AppInstance) => {
    const updatedInstance = { ...instance, lastAccessed: Date.now() };
    const response = await fetch(`${API_URL}/instance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedInstance)
    });
    if (!response.ok) throw new Error(`Save failed: ${response.statusText}`);
};

export const deleteInstance = async (id: string) => {
    const response = await fetch(`${API_URL}/instance/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Delete failed');
};

// --- FACTORY FUNCTIONS ---

export const createDemoInstance = async (): Promise<AppInstance> => {
    // Check if demo already exists to prevent overwriting user changes on reload
    // We try/catch here specifically because we don't want to crash if checking existing fails, 
    // but we DO want to crash if saving fails.
    try {
        const existing = await getInstance('demo');
        if (existing) {
            await saveInstance(existing);
            return existing;
        }
    } catch (e) {
        // Ignore read error, proceed to create
        console.warn("Could not check existing demo, attempting to create new one.");
    }

    const demo: AppInstance = {
        id: 'demo',
        name: 'Demo: Alex & Jordan',
        created: Date.now(),
        lastAccessed: Date.now(),
        currency: 'USD',
        users: USERS,
        data: {
            entries: INITIAL_ENTRIES,
            categories: INITIAL_CATEGORIES,
            budgets: INITIAL_BUDGETS,
            savings: INITIAL_SAVINGS,
            trips: INITIAL_TRIPS,
            incomes: INITIAL_INCOMES
        }
    };
    
    await saveInstance(demo);
    return demo;
};

export const createNewInstance = async (
    name: string, 
    currency: CurrencyCode, 
    user1: { name: string, income: number, avatar: string },
    user2: { name: string, income: number, avatar: string },
    categories: Category[]
): Promise<AppInstance> => {
    
    const users: Record<string, User> = {
        user_1: {
            id: 'user_1',
            name: user1.name,
            monthlyIncome: user1.income,
            avatar: user1.avatar,
            color: '#3b82f6'
        },
        user_2: {
            id: 'user_2',
            name: user2.name,
            monthlyIncome: user2.income,
            avatar: user2.avatar,
            color: '#ec4899'
        }
    };

    const newInstance: AppInstance = {
        id: generateId(),
        name,
        created: Date.now(),
        lastAccessed: Date.now(),
        currency,
        users,
        data: {
            entries: [],
            categories: categories, 
            budgets: [],
            savings: [],
            trips: [],
            incomes: []
        }
    };

    await saveInstance(newInstance);
    return newInstance;
};

export const resetDemoInstance = async (): Promise<AppInstance> => {
    await deleteInstance('demo');
    return createDemoInstance();
}