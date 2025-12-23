import { motion } from 'framer-motion';
import { Cpu, FileLock, Activity, BookOpen, Zap, Shield, Target, FileSpreadsheet } from 'lucide-react';

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring' as const,
            stiffness: 100,
            damping: 15,
        },
    },
};

// Core Modules Data
const coreModules = [
    {
        id: 1,
        title: 'Dynamic S-box Engine',
        description: 'Pembangkitan S-box real-time menggunakan aljabar Galois Field. Mendukung upload S-box eksternal (Excel) untuk validasi silang.',
        icon: Cpu,
        color: 'cyan',
        gradient: 'from-cyan-500 to-blue-600',
        glow: 'shadow-[0_0_30px_rgba(34,211,238,0.2)]',
    },
    {
        id: 2,
        title: 'Steganographic Embedding',
        description: 'Teknologi "Hidden IV". Vektor inisialisasi dan dimensi citra disisipkan secara atomik ke dalam header file terenkripsi. Dekripsi tanpa ribet.',
        icon: FileLock,
        color: 'purple',
        gradient: 'from-purple-500 to-pink-600',
        glow: 'shadow-[0_0_30px_rgba(168,85,247,0.2)]',
    },
    {
        id: 3,
        title: 'Visual Cryptanalysis',
        description: 'Analisis keamanan mendalam dengan Histogram Logaritmik dan metrik NPCR/UACI untuk membuktikan entropi data.',
        icon: Activity,
        color: 'emerald',
        gradient: 'from-emerald-500 to-teal-600',
        glow: 'shadow-[0_0_30px_rgba(52,211,153,0.2)]',
    },
    {
        id: 4,
        title: 'External Data Ingestion',
        description: 'Kompatibilitas penuh dengan format Excel (.xlsx). Sistem melakukan validasi bijektif otomatis (0-255) untuk menguji S-box dari sumber riset eksternal.',
        icon: FileSpreadsheet,
        color: 'amber',
        gradient: 'from-amber-500 to-orange-600',
        glow: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]',
    },
];

// Operational Protocol Steps
const protocolSteps = [
    {
        step: '01',
        title: 'Inisialisasi',
        description: 'Buka panel "Research Parameters". Pilih matriks "K44" untuk performa optimal, ATAU buka tab "Excel" untuk mengunggah file S-box kustom (.xlsx) Anda sendiri.',
        icon: Target,
    },
    {
        step: '02',
        title: 'Validasi',
        description: 'Tekan "Generate & Analyze". Periksa skor Nonlinearity dan SAC pada dashboard analisis.',
        icon: Shield,
    },
    {
        step: '03',
        title: 'Enkripsi',
        description: 'Masuk ke "The Laboratory". Unggah citra target. Sistem akan mengunci data piksel dan menyembunyikan kunci metadata.',
        icon: FileLock,
    },
    {
        step: '04',
        title: 'Verifikasi',
        description: 'Unduh hasil enkripsi. Gunakan file tersebut pada mode Dekripsi tanpa perlu memasukkan IV manual.',
        icon: Zap,
    },
];

export default function ProjectGuide() {
    return (
        <section className="card-panel p-8 space-y-10">
            {/* Section Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center"
            >
                <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="relative">
                        <BookOpen className="w-8 h-8 text-cyan-400" />
                        <div className="absolute inset-0 w-8 h-8 bg-cyan-400/30 blur-xl" />
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                        Project Guide
                    </h2>
                </div>
                <p className="text-zinc-500 text-sm font-mono tracking-wider">
                    [ TACTICAL DOCUMENTATION • CLASSIFIED ]
                </p>
            </motion.div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* BAGIAN 1: SYSTEM OVERVIEW */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="relative"
            >
                <div className="
          bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-800/40
          backdrop-blur-md border border-cyan-500/30 rounded-2xl
          p-8 overflow-hidden
        ">
                    {/* Background grid pattern */}
                    <div
                        className="absolute inset-0 opacity-5"
                        style={{
                            backgroundImage: `linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)`,
                            backgroundSize: '40px 40px',
                        }}
                    />

                    {/* Content */}
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase">
                                System Overview
                            </span>
                        </div>

                        <h3 className="text-2xl font-bold text-zinc-100 mb-4">
                            Mengenal AES FORGE
                        </h3>

                        <p className="text-zinc-400 leading-relaxed max-w-4xl">
                            <span className="text-cyan-300 font-semibold">AES FORGE</span> adalah platform riset kriptografi visual tingkat lanjut.
                            Kami merekayasa ulang standar AES-128 dengan menyuntikkan{' '}
                            <span className="text-purple-300 font-medium">Matriks Transformasi Affine Dinamis (K44)</span>{' '}
                            untuk menciptakan lapisan keamanan yang resisten terhadap serangan statistik.
                        </p>

                        {/* Status indicators */}
                        <div className="flex flex-wrap gap-4 mt-6">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                <span className="text-xs text-cyan-300 font-mono">AES-128 MODIFIED</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                <span className="text-xs text-purple-300 font-mono">GALOIS FIELD GF(2⁸)</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span className="text-xs text-emerald-300 font-mono">STATISTIC RESISTANT</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* BAGIAN 2: CORE MODULES (Bento Grid) */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-2 mb-6"
                >
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span className="text-xs font-mono text-purple-400 tracking-widest uppercase">
                        Core Modules
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-purple-500/50 to-transparent ml-4" />
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 gap-5"
                >
                    {coreModules.map((module) => {
                        const IconComponent = module.icon;
                        return (
                            <motion.div
                                key={module.id}
                                variants={itemVariants}
                                whileHover={{
                                    y: -5,
                                    transition: { type: 'spring', stiffness: 300 }
                                }}
                                className={`
                  relative group h-full
                  bg-zinc-900/60 backdrop-blur-md
                  border border-white/5 rounded-xl
                  p-6 overflow-hidden
                  ${module.glow}
                  hover:border-white/10 transition-all duration-300
                `}
                            >
                                {/* Icon with glow */}
                                <div className={`
                  w-12 h-12 rounded-xl mb-4
                  bg-gradient-to-br ${module.gradient}
                  flex items-center justify-center
                  shadow-lg
                `}>
                                    <IconComponent className="w-6 h-6 text-white" />
                                </div>

                                <h4 className="text-lg font-bold text-zinc-100 mb-2">
                                    {module.title}
                                </h4>

                                <p className="text-sm text-zinc-400 leading-relaxed">
                                    {module.description}
                                </p>

                                {/* Hover gradient overlay */}
                                <div className={`
                  absolute inset-0 rounded-xl opacity-0 group-hover:opacity-5
                  bg-gradient-to-br ${module.gradient}
                  transition-opacity duration-300 pointer-events-none
                `} />
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* BAGIAN 3: OPERATIONAL PROTOCOL (Timeline Style) */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center gap-2 mb-6"
                >
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono text-emerald-400 tracking-widest uppercase">
                        Operational Protocol
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/50 to-transparent ml-4" />
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="relative"
                >
                    {/* Vertical connector line */}
                    <div className="absolute left-[27px] top-8 bottom-8 w-px bg-gradient-to-b from-emerald-500/50 via-cyan-500/50 to-purple-500/50" />

                    <div className="space-y-4">
                        {protocolSteps.map((step, index) => {
                            const IconComponent = step.icon;
                            const isLast = index === protocolSteps.length - 1;

                            return (
                                <motion.div
                                    key={step.step}
                                    variants={itemVariants}
                                    className="relative flex items-start gap-5"
                                >
                                    {/* Step number circle */}
                                    <div className="
                    relative z-10 flex-shrink-0
                    w-14 h-14 rounded-full
                    bg-zinc-900 border-2 border-emerald-500/50
                    flex items-center justify-center
                    shadow-[0_0_20px_rgba(52,211,153,0.3)]
                  ">
                                        <span className="text-emerald-400 font-bold font-mono text-sm">
                                            {step.step}
                                        </span>
                                    </div>

                                    {/* Content card */}
                                    <div className={`
                    flex-1
                    bg-zinc-900/60 backdrop-blur-md
                    border border-white/5 rounded-xl
                    p-5
                    hover:border-emerald-500/20 transition-colors duration-300
                    ${isLast ? '' : 'mb-2'}
                  `}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <IconComponent className="w-5 h-5 text-emerald-400" />
                                            <h4 className="text-base font-bold text-zinc-100">
                                                {step.title}
                                            </h4>
                                        </div>
                                        <p className="text-sm text-zinc-400 leading-relaxed">
                                            {step.description}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>

            {/* Footer decoration */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="pt-4 text-center"
            >
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-zinc-800/30 rounded-full border border-zinc-700/30">
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-xs text-zinc-500 font-mono">
                        DOCUMENTATION v1.0 • AES FORGE RESEARCH PLATFORM
                    </span>
                </div>
            </motion.div>
        </section>
    );
}
