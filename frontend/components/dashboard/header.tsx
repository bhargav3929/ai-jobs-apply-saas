"use client";

import { useAuth } from "@/contexts";
import { Button } from "@/components/ui/button";
import { Bell, Search, User, Settings, CreditCard, LogOut } from "lucide-react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
    const { user, userProfile, signOut } = useAuth();

    return (
        <header className="sticky top-0 z-40 px-5 md:px-6 py-3 flex items-center justify-between md:justify-end">
            {/* Left — Brand (mobile only, desktop logo is fixed in layout) */}
            <div className="flex items-center md:hidden">
                <Link href="/dashboard" className="flex items-center gap-1.5">
                    <span className="text-[14px] font-bold text-[var(--color-brand-dark)] tracking-tight">
                        JobAgent<span className="text-[var(--color-brand-primary)]">.ai</span>
                    </span>
                </Link>
            </div>

            {/* Right — Actions */}
            <div className="flex items-center gap-1 bg-white rounded-xl border border-[var(--color-border-subtle)] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-1.5 py-1">
                {/* Search */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-dark)] hover:bg-[var(--color-surface)]"
                >
                    <Search className="w-3.5 h-3.5" />
                </Button>

                {/* Notifications */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative w-7 h-7 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-dark)] hover:bg-[var(--color-surface)]"
                >
                    <Bell className="w-3.5 h-3.5" />
                </Button>

                {/* Divider */}
                <div className="w-px h-4 bg-[var(--color-border-subtle)] mx-0.5" />

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="w-7 h-7 rounded-lg bg-[var(--color-brand-primary)]/[0.08] flex items-center justify-center hover:bg-[var(--color-brand-primary)]/[0.14] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]/30">
                            <User className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 rounded-xl border border-[var(--color-border-subtle)] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-1.5" align="end" sideOffset={8} forceMount>
                        <DropdownMenuLabel className="font-normal px-3 py-2.5">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-[var(--color-brand-primary)]/[0.08] flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-[var(--color-brand-primary)]" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-[var(--color-brand-dark)] truncate">
                                        {userProfile?.name || "User"}
                                    </p>
                                    <p className="text-[11px] text-[var(--color-text-tertiary)] truncate">
                                        {user?.email}
                                    </p>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="my-1" />
                        <DropdownMenuItem className="rounded-lg px-3 py-2 text-[13px] gap-2.5 cursor-pointer" asChild>
                            <Link href="/settings">
                                <Settings className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                                Settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg px-3 py-2 text-[13px] gap-2.5 cursor-pointer">
                            <CreditCard className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                            Billing
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1" />
                        <DropdownMenuItem className="rounded-lg px-3 py-2 text-[13px] gap-2.5 text-red-600 focus:text-red-600 cursor-pointer" onClick={() => signOut()}>
                            <LogOut className="w-3.5 h-3.5" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
