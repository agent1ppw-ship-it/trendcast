'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export function SignOutButton({
    className,
    compact = false,
}: {
    className?: string;
    compact?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/signup?mode=signin' })}
            className={className}
        >
            <LogOut className={compact ? 'h-4 w-4' : 'h-4 w-4 shrink-0'} />
            <span>{compact ? 'Logout' : 'Log Out'}</span>
        </button>
    );
}
