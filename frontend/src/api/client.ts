// src/api/client.ts
import type { EyeMetrics } from '../types/metrics';

export async function fetchEyeMetrics(): Promise<EyeMetrics> {
    const res = await fetch('http://127.0.0.1:5000/api/stats'); // 后端接口地址
    if (!res.ok) {
        throw new Error('Failed to fetch metrics');
    }
    const data = await res.json();
    return data as EyeMetrics;
}