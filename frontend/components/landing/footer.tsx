import Link from "next/link";
import { Zap } from "lucide-react";

const footerLinks = {
    Product: [
        { label: "Features", href: "#features" },
        { label: "How it works", href: "#how-it-works" },
        { label: "Pricing", href: "#pricing" },
        { label: "FAQ", href: "#faq" },
    ],
    Company: [
        { label: "About", href: "#" },
        { label: "Blog", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Contact", href: "#" },
    ],
    Legal: [
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
        { label: "Refund Policy", href: "#" },
    ],
};

export function Footer() {
    return (
        <footer className="bg-[var(--color-brand-dark)] text-white">
            <div className="max-w-7xl mx-auto px-6">
                {/* Main footer */}
                <div className="py-16 grid md:grid-cols-12 gap-12">
                    {/* Brand column */}
                    <div className="md:col-span-5">
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="p-1.5 rounded-lg bg-[var(--color-brand-primary)]">
                                <Zap className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-lg font-bold tracking-tight">
                                JobAgent<span className="text-[var(--color-brand-primary)]">.ai</span>
                            </span>
                        </div>
                        <p className="text-white/50 text-sm leading-relaxed max-w-sm mb-6">
                            Automate your job applications with AI. Upload your resume,
                            connect your email, and let our agent apply to relevant jobs
                            from your inbox every day.
                        </p>
                        <div className="flex items-center gap-4">
                            <Link
                                href="#"
                                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                                aria-label="Twitter"
                            >
                                <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </Link>
                            <Link
                                href="#"
                                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                                aria-label="LinkedIn"
                            >
                                <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </Link>
                        </div>
                    </div>

                    {/* Link columns */}
                    <div className="md:col-span-7 grid grid-cols-3 gap-8">
                        {Object.entries(footerLinks).map(([category, links]) => (
                            <div key={category}>
                                <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
                                    {category}
                                </h4>
                                <ul className="space-y-3">
                                    {links.map((link) => (
                                        <li key={link.label}>
                                            <Link
                                                href={link.href}
                                                className="text-sm text-white/60 hover:text-white transition-colors duration-200"
                                            >
                                                {link.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="py-6 border-t border-white/[0.06] flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-white/30 text-sm">
                        &copy; {new Date().getFullYear()} JobAgent.ai. All rights reserved.
                    </p>
                    <p className="text-white/30 text-sm">
                        Built for job seekers, by job seekers.
                    </p>
                </div>
            </div>
        </footer>
    );
}
