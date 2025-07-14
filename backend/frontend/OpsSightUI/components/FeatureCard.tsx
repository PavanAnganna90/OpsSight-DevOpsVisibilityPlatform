import { motion } from 'framer-motion';

interface FeatureCardProps {
  title: string;
  description: string;
}

export default function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <motion.div 
      className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border"
      whileHover={{ scale: 1.03 }}
    >
      <h3 className="font-semibold text-xl text-indigo-600">{title}</h3>
      <p className="mt-2 text-gray-600">{description}</p>
    </motion.div>
  );
}
