import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, FileText, Image } from 'lucide-react';

interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    targetId: string;
}

const navItems: NavItem[] = [
    {
        id: 'research',
        label: 'Research',
        icon: Settings,
        targetId: 'research-section',
    },
    {
        id: 'text-crypto',
        label: 'Text Crypto',
        icon: FileText,
        targetId: 'text-crypto-section',
    },
    {
        id: 'image-crypto',
        label: 'Image Crypto',
        icon: Image,
        targetId: 'image-crypto-section',
    },
];

export default function NavigationDock() {
    const [activeSection, setActiveSection] = useState<string>('');

    // Scroll to section handler
    const handleNavClick = (targetId: string) => {
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Intersection Observer for active state
    useEffect(() => {
        const observers: IntersectionObserver[] = [];

        navItems.forEach((item) => {
            const element = document.getElementById(item.targetId);
            if (element) {
                const observer = new IntersectionObserver(
                    (entries) => {
                        entries.forEach((entry) => {
                            if (entry.isIntersecting) {
                                setActiveSection(item.targetId);
                            }
                        });
                    },
                    { threshold: 0.3 }
                );
                observer.observe(element);
                observers.push(observer);
            }
        });

        return () => {
            observers.forEach((observer) => observer.disconnect());
        };
    }, []);

    return (
        <motion.nav
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 100, damping: 20 }}
            className="
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        bg-zinc-950/80 backdrop-blur-lg
        border border-white/10 rounded-2xl
        px-2 py-2
        shadow-[0_0_40px_rgba(0,0,0,0.5)]
      "
        >
            {/* Neon border glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-emerald-500/10 opacity-50" />

            <div className="relative flex items-center gap-1">
                {navItems.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = activeSection === item.targetId;

                    return (
                        <motion.button
                            key={item.id}
                            onClick={() => handleNavClick(item.targetId)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`
                relative flex items-center gap-2
                px-4 py-2.5 rounded-xl
                font-medium text-sm
                transition-all duration-300
                ${isActive
                                    ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                                }
              `}
                        >
                            {/* Active indicator glow */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeGlow"
                                    className="absolute inset-0 rounded-xl bg-cyan-500/10 border border-cyan-500/30"
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                />
                            )}

                            <IconComponent className={`w-4 h-4 relative z-10 ${isActive ? 'text-cyan-400' : ''}`} />
                            <span className="relative z-10 hidden sm:inline">{item.label}</span>
                        </motion.button>
                    );
                })}

                {/* Decorative HUD element */}
                <div className="hidden md:flex items-center gap-2 ml-2 pl-3 border-l border-white/10">
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                    <span className="text-xs font-mono text-zinc-500">NAV</span>
                </div>
            </div>
        </motion.nav>
    );
}
