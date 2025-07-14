import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <motion.div 
      className="text-center mb-8"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
        Creative Intelligence for <span className="text-indigo-600">DevOps</span>
      </h1>
      <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
        Where real-time visibility meets delightfully intuitive design.
      </p>
    </motion.div>
  );
}
