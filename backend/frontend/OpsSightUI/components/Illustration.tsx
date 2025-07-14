import { motion } from 'framer-motion';
import Image from 'next/image';

export default function Illustration() {
  return (
    <motion.div 
      className="w-full max-w-4xl"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <Image 
        src="/teamwork-illustration.png"
        alt="Teamwork Illustration"
        width={800}
        height={400}
        className="rounded-lg shadow-xl"
      />
    </motion.div>
  );
}
