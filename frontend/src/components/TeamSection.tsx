import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

// Team member data with color themes
const teamMembers = [
    {
        id: 1,
        name: 'Syahrindra Rafli Santosa',
        nim: '2304130006',
        role: 'Lead Architect & Cryptographer',
        imagePath: '/team/member1.jpg',
        colorTheme: 'cyan',
        isLeader: true,
    },
    {
        id: 2,
        name: 'Nabigh Hibatillah Nurrahman',
        nim: '2304130029',
        role: 'Frontend Engineer & UI/UX',
        imagePath: '/team/member2.jpeg',
        colorTheme: 'purple',
        isLeader: false,
    },
    {
        id: 3,
        name: 'Nadhia Adzqiya Khairunnisa',
        nim: '2304130038',
        role: 'Security Analyst & Quality Assurance',
        imagePath: '/team/member3.jpeg',
        colorTheme: 'emerald',
        isLeader: false,
    },
];

// Color theme configurations for neon glow effects
const colorConfig = {
    cyan: {
        border: 'border-cyan-400/50',
        glow: 'shadow-[0_0_20px_rgba(34,211,238,0.3)]',
        glowHover: 'hover:shadow-[0_0_35px_rgba(34,211,238,0.5)]',
        gradient: 'from-cyan-400 to-blue-500',
        ring: 'ring-cyan-400/30',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    purple: {
        border: 'border-purple-400/50',
        glow: 'shadow-[0_0_20px_rgba(192,132,252,0.3)]',
        glowHover: 'hover:shadow-[0_0_35px_rgba(192,132,252,0.5)]',
        gradient: 'from-purple-400 to-pink-500',
        ring: 'ring-purple-400/30',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    emerald: {
        border: 'border-emerald-400/50',
        glow: 'shadow-[0_0_20px_rgba(52,211,153,0.3)]',
        glowHover: 'hover:shadow-[0_0_35px_rgba(52,211,153,0.5)]',
        gradient: 'from-emerald-400 to-teal-500',
        ring: 'ring-emerald-400/30',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
};

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2,
            delayChildren: 0.1,
        },
    },
};

const cardVariants = {
    hidden: {
        opacity: 0,
        y: 40,
        scale: 0.95,
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: 'spring' as const,
            stiffness: 100,
            damping: 15,
        },
    },
};

export default function TeamSection() {
    return (
        <section className="card-panel p-8">
            {/* Section Header */}
            <div className="text-center mb-10">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex items-center justify-center gap-3 mb-4"
                >
                    <div className="relative">
                        <Users className="w-8 h-8 text-cyan-400" />
                        <div className="absolute inset-0 w-8 h-8 bg-cyan-400/30 blur-xl" />
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                        The Research Team
                    </h2>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="text-zinc-400 text-sm max-w-2xl mx-auto"
                >
                    Meet the minds behind the AES S-box modification research —
                    combining cryptography expertise with modern development practices.
                </motion.p>

                {/* Decorative line with glow */}
                <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="mt-6 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mx-auto w-48"
                />
            </div>

            {/* Team Grid */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                {teamMembers.map((member) => {
                    const theme = colorConfig[member.colorTheme as keyof typeof colorConfig];

                    return (
                        <motion.div
                            key={member.id}
                            variants={cardVariants}
                            whileHover={{
                                y: -10,
                                transition: { type: 'spring', stiffness: 300, damping: 20 }
                            }}
                            className={`
                relative group
                bg-zinc-900/40 backdrop-blur-md
                border border-white/5 rounded-2xl
                p-6
                ${theme.glow} ${theme.glowHover}
                transition-shadow duration-300
              `}
                        >
                            {/* Leader Badge */}
                            {member.isLeader && (
                                <div className={`
                  absolute -top-3 left-1/2 -translate-x-1/2
                  px-3 py-1 text-xs font-semibold tracking-wider uppercase
                  rounded-full border
                  ${theme.badge}
                `}>
                                    ★ Team Leader
                                </div>
                            )}

                            {/* Member Image with Neon Border */}
                            <div className="flex justify-center mb-5 mt-2">
                                <div className={`
                  relative w-28 h-28 rounded-full
                  ring-4 ${theme.ring}
                  ${theme.glow}
                  group-hover:ring-opacity-80
                  transition-all duration-300
                `}>
                                    {/* Animated glow ring */}
                                    <div className={`
                    absolute inset-0 rounded-full
                    bg-gradient-to-r ${theme.gradient}
                    opacity-0 group-hover:opacity-20
                    blur-xl transition-opacity duration-300
                  `} />

                                    <img
                                        src={member.imagePath}
                                        alt={member.name}
                                        className={`
                      w-full h-full rounded-full object-cover
                      border-2 ${theme.border}
                    `}
                                    />
                                </div>
                            </div>

                            {/* Member Info */}
                            <div className="text-center space-y-2">
                                {/* Name */}
                                <h3 className="text-lg font-bold text-white">
                                    {member.name}
                                </h3>

                                {/* Role with Gradient */}
                                <p className={`
                  text-sm font-medium
                  bg-gradient-to-r ${theme.gradient}
                  bg-clip-text text-transparent
                `}>
                                    {member.role}
                                </p>

                                {/* NIM */}
                                <p className="font-mono text-xs text-zinc-500 tracking-wider">
                                    {member.nim}
                                </p>
                            </div>

                            {/* Hover accent line */}
                            <motion.div
                                initial={{ scaleX: 0 }}
                                whileHover={{ scaleX: 1 }}
                                className={`
                  absolute bottom-0 left-1/2 -translate-x-1/2
                  w-1/2 h-0.5 mt-4
                  bg-gradient-to-r ${theme.gradient}
                  origin-center
                `}
                            />

                            {/* Background pattern (decorative hex grid) */}
                            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                                <div
                                    className="absolute inset-0 opacity-5"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%23fff' stroke-width='0.5'/%3E%3C/svg%3E")`,
                                        backgroundSize: '30px 30px',
                                    }}
                                />
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* Bottom decorative element */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="mt-10 text-center"
            >
                <div className="inline-flex items-center gap-2 px-4 py-2 
          bg-zinc-800/50 border border-zinc-700/50 rounded-full
          text-xs text-zinc-500"
                >
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    Universitas Negeri Semarang • Cryptography 2025
                </div>
            </motion.div>
        </section>
    );
}
