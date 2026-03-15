import React, { useState, useCallback, useRef, useEffect } from 'react';

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'info' | 'error';
}

let globalShow: ((msg: string, type?: Toast['type']) => void) | null = null;

/** Fire a toast from anywhere */
export function showToast(message: string, type: Toast['type'] = 'success') {
    globalShow?.(message, type);
}

/**
 * R18 — Lightweight toast notification provider.
 * Mount once at App root.
 */
export const ToastProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const counter = useRef(0);

    const show = useCallback((message: string, type: Toast['type'] = 'success') => {
        const id = ++counter.current;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    useEffect(() => { globalShow = show; return () => { globalShow = null; }; }, [show]);

    return (
        <>
            {children}
            {toasts.length > 0 && (
                <div className="toast-container">
                    {toasts.map(t => (
                        <div key={t.id} className={`toast toast-${t.type}`}>
                            <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
                            <span>{t.message}</span>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};
