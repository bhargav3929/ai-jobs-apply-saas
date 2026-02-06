export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[var(--color-surface)]">
            {children}
        </div>
    );
}
