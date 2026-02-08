import { AppInstance, User, CurrencyCode, Category } from "../types";
import { USERS, INITIAL_CATEGORIES, INITIAL_BUDGETS, INITIAL_SAVINGS, INITIAL_ENTRIES, INITIAL_TRIPS, INITIAL_INCOMES } from "../constants";

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

const API_URL = '/api';

// --- MODE CONFIGURATION ---
const APP_MODE = import.meta.env.VITE_APP_MODE || 'SERVER_BASED';
const IS_LOCAL_MODE = APP_MODE === 'LOCAL_FIRST';

// --- LOCAL STORAGE HELPERS (for LOCAL_FIRST mode) ---
const LS_KEYS = {
    INSTANCES_INDEX: 'fs_instances_index',
    INSTANCE_PREFIX: 'fs_instance_'
};

interface InstanceMetadata {
    id: string;
    name: string;
    lastAccessed: number;
    lastUpdated: number;
}

const getLocalIndex = (): InstanceMetadata[] => {
    const data = localStorage.getItem(LS_KEYS.INSTANCES_INDEX);
    return data ? JSON.parse(data) : [];
};

const saveLocalIndex = (index: InstanceMetadata[]) => {
    localStorage.setItem(LS_KEYS.INSTANCES_INDEX, JSON.stringify(index));
};

// --- ASYNC API OPERATIONS ---

export const checkBackendHealth = async (): Promise<boolean> => {
    if (IS_LOCAL_MODE) return true;
    try {
        const response = await fetch(`${API_URL}/health`);
        return response.ok;
    } catch (e) {
        return false;
    }
};

export const getInstances = async (): Promise<InstanceMetadata[]> => {
    if (IS_LOCAL_MODE) {
        return getLocalIndex().sort((a, b) => b.lastAccessed - a.lastAccessed);
    }
    const response = await fetch(`${API_URL}/instances`);
    if (!response.ok) throw new Error(`Backend Error: ${response.statusText}`);
    return await response.json();
};

export const getInstance = async (id: string): Promise<AppInstance | null> => {
    if (IS_LOCAL_MODE) {
        const data = localStorage.getItem(`${LS_KEYS.INSTANCE_PREFIX}${id}`);
        return data ? JSON.parse(data) : null;
    }
    const response = await fetch(`${API_URL}/instance/${id}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Backend Error: ${response.statusText}`);
    return await response.json();
};

export const saveInstance = async (instance: AppInstance): Promise<{ lastUpdated: number }> => {
    const now = Date.now();
    const updatedInstance = { ...instance, lastAccessed: now, lastUpdated: now };

    if (IS_LOCAL_MODE) {
        // Check for conflict (simulated)
        const existing = await getInstance(instance.id);
        if (existing && instance.lastUpdated && existing.lastUpdated > instance.lastUpdated) {
            throw { status: 409, error: "Conflict: A newer version exists. Please refresh.", serverLastUpdated: existing.lastUpdated };
        }

        // Save instance data
        localStorage.setItem(`${LS_KEYS.INSTANCE_PREFIX}${instance.id}`, JSON.stringify(updatedInstance));

        // Update index
        const index = getLocalIndex();
        const existingIdx = index.findIndex(i => i.id === instance.id);
        const metadata: InstanceMetadata = {
            id: instance.id,
            name: instance.name,
            lastAccessed: now,
            lastUpdated: now
        };

        if (existingIdx >= 0) {
            index[existingIdx] = metadata;
        } else {
            index.push(metadata);
        }
        saveLocalIndex(index);
        
        return { lastUpdated: now };
    }

    const response = await fetch(`${API_URL}/instance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedInstance)
    });
    if (response.status === 409) {
        const errData = await response.json();
        throw { status: 409, ...errData };
    }
    if (!response.ok) throw new Error(`Save failed: ${response.statusText}`);
    return await response.json();
};

export const deleteInstance = async (id: string) => {
    if (IS_LOCAL_MODE) {
        localStorage.removeItem(`${LS_KEYS.INSTANCE_PREFIX}${id}`);
        const index = getLocalIndex().filter(i => i.id !== id);
        saveLocalIndex(index);
        return;
    }
    const response = await fetch(`${API_URL}/instance/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Delete failed');
};

export const renameInstance = async (id: string, newName: string) => {
    if (IS_LOCAL_MODE) {
        const instance = await getInstance(id);
        if (instance) {
            instance.name = newName;
            await saveInstance(instance);
        }
        return;
    }
    const response = await fetch(`${API_URL}/instance/${id}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
    });
    if (!response.ok) throw new Error(`Rename failed: ${response.statusText}`);
};

// --- FACTORY FUNCTIONS ---

export const createDemoInstance = async (): Promise<AppInstance> => {
    try {
        const existing = await getInstance('demo');
        if (existing) {
            // In local mode, we might want to "refresh" the demo if it's too old or just keep it
            // For now, keep it if it exists.
            return existing;
        }
    } catch (e) {
        console.warn("Could not check existing demo, attempting to create new one.");
    }

    const demo: AppInstance = {
        id: 'demo',
        name: 'Demo: Alex & Jordan',
        created: Date.now(),
        lastAccessed: Date.now(),
        lastUpdated: Date.now(),
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
        lastUpdated: Date.now(),
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